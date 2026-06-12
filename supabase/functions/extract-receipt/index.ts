import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = Deno.env.get('CAPTAIN_MODEL') || 'claude-opus-4-8'

// Klassifikation FØRST: mails med vedhæftninger indeholder også returlabels,
// handelsbetingelser, billetter osv. — kun rigtige kvitteringer/fakturaer må
// lande i Indbakken. Ikke-kvitteringer markeres status='rejected'.
const TOOL = {
  name: 'extract_receipt',
  description: 'Classify the document and, if it is a receipt or invoice, extract structured data from it',
  input_schema: {
    type: 'object',
    properties: {
      document_type: {
        type: 'string',
        enum: ['receipt', 'invoice', 'return_label', 'shipping_label', 'terms_or_policy', 'ticket_or_boardingpass', 'newsletter_or_marketing', 'other'],
        description: 'What this document actually is. Only receipt and invoice are bookkeeping material.',
      },
      classification_reason: { type: 'string', description: 'One short sentence explaining the classification' },
      vendor: { type: 'string', description: 'Name of the supplier/vendor/company that issued the receipt' },
      amount: { type: 'number', description: 'Total amount including VAT' },
      vat_amount: { type: 'number', description: 'VAT (moms) amount in DKK or original currency' },
      currency: { type: 'string', description: '3-letter currency code (DKK, EUR, USD…)' },
      date: { type: 'string', description: 'Receipt date in YYYY-MM-DD format' },
      invoice_number: { type: 'string' },
      category: { type: 'string', description: 'Suggested expense category, e.g. "Software", "Rejse", "Kontorhold"' },
      suggested_account_number: { type: 'integer', description: 'Best matching account number from the chart of accounts provided in the system prompt' },
      line_items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      },
      confidence: { type: 'number', description: 'Confidence score 0-1 for the extraction (or the classification if not a receipt)' },
    },
    required: ['document_type', 'classification_reason', 'confidence'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

    const { document_id } = await req.json()
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: doc, error: docError } = await supabase
      .from('documents').select('*').eq('id', document_id).single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!doc.storage_path) {
      return new Response(JSON.stringify({ error: 'Document has no file' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('documents').update({ ocr_status: 'processing' }).eq('id', document_id)

    // Download file
    const { data: fileData, error: dlError } = await supabase.storage
      .from('receipts').download(doc.storage_path)

    if (dlError || !fileData) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', document_id)
      throw new Error(`Download failed: ${dlError?.message}`)
    }

    // Chart of accounts so the model can suggest where to book the expense
    const { data: accounts } = await supabase
      .from('accounts')
      .select('number, name, vat_code')
      .eq('company_id', doc.company_id)
      .eq('kind', 'expense')
      .order('number')
    const kontoplanText = (accounts || [])
      .map((a) => `${a.number} ${a.name} (${a.vat_code})`)
      .join('\n')

    const arrayBuf = await fileData.arrayBuffer()
    // Convert to base64 (chunked to avoid stack overflow)
    const bytes = new Uint8Array(arrayBuf)
    let binary = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any)
    }
    const base64 = btoa(binary)

    const mime = (doc.mime_type || 'application/pdf').toLowerCase()
    const fileBlock = mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mime === 'image/jpg' ? 'image/jpeg' : mime, data: base64 } }

    const aiRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: `You are a bookkeeping document classifier and extractor for a Danish company.

FIRST classify what the document actually is. Emails matching receipt keywords often carry attachments that are NOT bookkeeping material: return labels, shipping labels, terms & conditions, boarding passes, marketing one-pagers. Only classify as 'receipt' or 'invoice' when the document shows an actual purchase with amounts the company paid or owes.

If (and only if) it is a receipt or invoice, extract structured data accurately. Use Danish kroner (DKK) as default currency if unclear. Dates in YYYY-MM-DD format. Return your best estimate of confidence (0-1).${kontoplanText ? `\n\nChart of accounts (pick suggested_account_number from this list):\n${kontoplanText}` : ''}`,
        messages: [
          {
            role: 'user',
            content: [
              fileBlock,
              { type: 'text', text: 'Classify this document and extract the receipt/invoice details if applicable.' },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'extract_receipt' },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('Anthropic API error:', aiRes.status, errText)
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', document_id)
      if (aiRes.status === 429 || aiRes.status === 529) {
        return new Response(JSON.stringify({ error: 'Rate limit. Prøv igen senere.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`AI error ${aiRes.status}: ${errText}`)
    }

    const aiData = await aiRes.json()
    const toolUse = aiData.content?.find((b: any) => b.type === 'tool_use')
    if (!toolUse) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', document_id)
      throw new Error('No tool call in AI response')
    }

    const extracted = toolUse.input
    const isReceipt = extracted.document_type === 'receipt' || extracted.document_type === 'invoice'

    if (!isReceipt) {
      // Ikke bogføringsmateriale — afvis så det ikke fylder i Indbakken (ses stadig under Bilag)
      await supabase.from('documents').update({
        status: 'rejected',
        ocr_status: 'done',
        ocr_data: extracted,
        ocr_confidence: extracted.confidence,
      }).eq('id', document_id)

      return new Response(JSON.stringify({ success: true, classified_as: extracted.document_type, rejected: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('documents').update({
      vendor: extracted.vendor || doc.vendor,
      amount: extracted.amount,
      vat_amount: extracted.vat_amount,
      currency: extracted.currency || 'DKK',
      date: extracted.date || doc.date,
      ocr_data: extracted,
      ocr_status: 'done',
      ocr_confidence: extracted.confidence,
    }).eq('id', document_id)

    // Trigger auto-match (fire-and-forget)
    supabase.functions.invoke('auto-match', {
      body: { document_id, company_id: doc.company_id },
    }).catch(e => console.error('auto-match invoke failed:', e))

    return new Response(JSON.stringify({ success: true, extracted }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('extract-receipt error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
