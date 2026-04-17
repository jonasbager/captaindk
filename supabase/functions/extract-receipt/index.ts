import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

const TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'extract_receipt',
    description: 'Extract structured data from a receipt or invoice',
    parameters: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Name of the supplier/vendor/company that issued the receipt' },
        amount: { type: 'number', description: 'Total amount including VAT' },
        vat_amount: { type: 'number', description: 'VAT (moms) amount in DKK or original currency' },
        currency: { type: 'string', description: '3-letter currency code (DKK, EUR, USD…)' },
        date: { type: 'string', description: 'Receipt date in YYYY-MM-DD format' },
        invoice_number: { type: 'string' },
        category: { type: 'string', description: 'Suggested expense category, e.g. "Software", "Rejse", "Kontorhold"' },
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
        confidence: { type: 'number', description: 'Confidence score 0-1' },
      },
      required: ['vendor', 'amount', 'currency', 'date', 'confidence'],
      additionalProperties: false,
    },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

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

    const arrayBuf = await fileData.arrayBuffer()
    // Convert to base64 (chunked to avoid stack overflow)
    const bytes = new Uint8Array(arrayBuf)
    let binary = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any)
    }
    const base64 = btoa(binary)
    const dataUrl = `data:${doc.mime_type || 'application/pdf'};base64,${base64}`

    const aiRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a receipt/invoice data extraction expert. Extract structured data accurately. Use Danish kroner (DKK) as default currency if unclear. Dates in YYYY-MM-DD format. Return your best estimate of confidence (0-1).',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the receipt/invoice details from this document.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'function', function: { name: 'extract_receipt' } },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('AI gateway error:', aiRes.status, errText)
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', document_id)
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit. Prøv igen senere.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI-credits opbrugt. Tilføj kredit i workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`AI error ${aiRes.status}: ${errText}`)
    }

    const aiData = await aiRes.json()
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', document_id)
      throw new Error('No tool call in AI response')
    }

    const extracted = JSON.parse(toolCall.function.arguments)

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
