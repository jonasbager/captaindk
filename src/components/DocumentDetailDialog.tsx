import { useEffect, useState } from "react";
import { Loader2, Trash2, RefreshCw, ExternalLink, FileText, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/format";

interface DocumentDetail {
  id: string;
  vendor: string | null;
  amount: number | null;
  vat_amount: number | null;
  currency: string | null;
  date: string | null;
  source: string;
  status: string;
  ocr_status: string;
  ocr_data: any;
  ocr_confidence: number | null;
  storage_path: string | null;
  mime_type: string | null;
  subject: string | null;
  received_at: string | null;
}

interface Props {
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
}

export function DocumentDetailDialog({ documentId, open, onOpenChange, onDeleted, onUpdated }: Props) {
  const { toast } = useToast();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    setFileUrl(null);

    (async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, vendor, amount, vat_amount, currency, date, source, status, ocr_status, ocr_data, ocr_confidence, storage_path, mime_type, subject, received_at")
        .eq("id", documentId)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Fejl", description: "Kunne ikke hente bilag", variant: "destructive" });
        setLoading(false);
        return;
      }
      setDoc(data as DocumentDetail);

      if (data.storage_path) {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(data.storage_path, 3600);
        if (signed?.signedUrl) setFileUrl(signed.signedUrl);
      }
      setLoading(false);
    })();
  }, [open, documentId, toast]);

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirm("Vil du slette dette bilag? Filen og data fjernes permanent.")) return;
    setDeleting(true);
    try {
      if (doc.storage_path) {
        await supabase.storage.from("receipts").remove([doc.storage_path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast({ title: "Slettet", description: "Bilaget er fjernet" });
      onDeleted?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleReprocess = async () => {
    if (!doc) return;
    setReprocessing(true);
    try {
      const { error } = await supabase.functions.invoke("extract-receipt", {
        body: { document_id: doc.id },
      });
      if (error) throw error;
      toast({ title: "OCR fuldført", description: "Bilag er opdateret" });
      // refetch
      const { data } = await supabase
        .from("documents")
        .select("id, vendor, amount, vat_amount, currency, date, source, status, ocr_status, ocr_data, ocr_confidence, storage_path, mime_type, subject, received_at")
        .eq("id", doc.id)
        .maybeSingle();
      if (data) setDoc(data as DocumentDetail);
      onUpdated?.();
    } catch (err: any) {
      toast({ title: "OCR fejlede", description: err.message, variant: "destructive" });
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/30">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {doc?.vendor || "Bilag"}
            {doc?.ocr_status === "processing" && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Behandler
              </Badge>
            )}
            {doc?.ocr_status === "done" && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                <Sparkles className="h-2.5 w-2.5" /> AI-udfyldt
              </Badge>
            )}
            {doc?.ocr_status === "failed" && (
              <Badge variant="destructive" className="text-[10px]">OCR fejlede</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : doc ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
            {/* Preview */}
            <div className="bg-muted/20 overflow-auto border-r border-border/30 min-h-[300px]">
              {fileUrl ? (
                doc.mime_type?.startsWith("image/") ? (
                  <img src={fileUrl} alt="Bilag" className="w-full h-auto" />
                ) : (
                  <object data={fileUrl} type={doc.mime_type || "application/pdf"} className="w-full h-full min-h-[600px]">
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Forhåndsvisning kan ikke vises i browseren</p>
                      <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> Åbn i ny fane
                        </a>
                      </Button>
                    </div>
                  </object>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Ingen fil tilgængelig
                </div>
              )}
            </div>

            {/* OCR data */}
            <div className="overflow-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Field label="Leverandør" value={doc.vendor} />
                <Field label="Dato" value={doc.date} mono />
                <Field
                  label="Beløb"
                  value={doc.amount != null ? formatAmount(Number(doc.amount), doc.currency) : null}
                  mono
                />
                <Field
                  label={`Moms${doc.currency && doc.currency !== "DKK" ? ` (${doc.currency})` : ""}`}
                  value={doc.vat_amount != null ? formatAmount(Number(doc.vat_amount), doc.currency) : null}
                  mono
                />
                <Field label="Valuta" value={doc.currency} />
                <Field label="Kilde" value={doc.source} />
                <Field
                  label="Sikkerhed"
                  value={doc.ocr_confidence != null ? `${Math.round(Number(doc.ocr_confidence) * 100)}%` : null}
                  mono
                />
              </div>

              {doc.subject && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Email-emne</p>
                  <p className="text-xs">{doc.subject}</p>
                </div>
              )}

              {doc.ocr_data?.line_items?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Linjer</p>
                  <div className="border border-border/30 rounded divide-y divide-border/30">
                    {doc.ocr_data.line_items.map((line: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 text-xs">
                        <span className="truncate">{line.description}</span>
                        <span className="font-mono shrink-0 ml-2">
                          {line.amount != null ? formatAmount(Number(line.amount), doc.currency) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {doc.ocr_data?.category && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Foreslået kategori</p>
                  <Badge variant="secondary" className="text-[10px]">{doc.ocr_data.category}</Badge>
                </div>
              )}

              <div className="pt-4 border-t border-border/30 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={handleReprocess}
                  disabled={reprocessing || !doc.storage_path}
                >
                  {reprocessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Kør OCR igen
                </Button>
                {fileUrl && (
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> Åbn fil
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs gap-1.5 ml-auto"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Slet bilag
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-xs ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}
