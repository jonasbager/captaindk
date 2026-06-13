import { useEffect, useRef, useState } from "react";
import { Camera, X, Check, Loader2, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export default function Snap() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { company } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (captured) return;
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        // Intet kamera (fx desktop) — brugeren kan stadig uploade fra galleri
      });
    return () => { active = false; stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured]);

  const setCapturedBlob = (blob: Blob) => {
    setCaptured(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    stream?.getTracks().forEach((t) => t.stop());
  };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, "image/jpeg", 0.85);
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCapturedBlob(file);
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCaptured(null);
    setPreviewUrl(null);
  };

  const accept = async () => {
    if (!captured) return;
    if (!company) {
      toast({ title: "Ingen virksomhed", description: "Opret din virksomhed først.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const isPng = captured.type === "image/png";
      const ext = isPng ? "png" : "jpg";
      const mime = isPng ? "image/png" : "image/jpeg";

      // 1. Opret bilag-rækken for at få et id
      const { data: doc, error: insErr } = await supabase
        .from("documents")
        .insert({
          company_id: company.id,
          source: "snap",
          status: "pending",
          ocr_status: "pending",
          date: new Date().toISOString().slice(0, 10),
          mime_type: mime,
        })
        .select("id")
        .single();
      if (insErr || !doc) throw insErr || new Error("Kunne ikke oprette bilag");

      // 2. Upload billedet til receipts-bucket
      const storagePath = `${company.id}/${doc.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(storagePath, captured, { contentType: mime, upsert: true });
      if (upErr) throw upErr;

      await supabase
        .from("documents")
        .update({ storage_path: storagePath, file_url: `snap:${doc.id}` })
        .eq("id", doc.id);

      // 3. Kør OCR (samme pipeline som Indbakke/Bilag)
      toast({ title: "Læser bilag…", description: "Captain trækker beløb og leverandør ud." });
      const { error: ocrErr } = await supabase.functions.invoke("extract-receipt", {
        body: { document_id: doc.id },
      });
      if (ocrErr) {
        toast({ title: "Gemt", description: "OCR fejlede — kør den igen fra Indbakke.", variant: "destructive" });
      } else {
        toast({ title: "Bilag klar", description: "Tjek og bogfør det i Indbakke." });
      }
      navigate("/indbakke");
    } catch (err: any) {
      toast({ title: "Fejl", description: err.message || "Kunne ikke gemme bilaget", variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 text-white">
        <span className="text-sm font-medium">Scan bilag</span>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-white/10" aria-label="Luk">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt="capture" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Behandler bilag…</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFilePicked}
      />
      <div className="px-4 py-6 flex justify-center items-center gap-4 bg-black">
        {captured ? (
          <>
            <Button variant="outline" size="lg" onClick={retake} disabled={busy}>
              Tag igen
            </Button>
            <Button size="lg" onClick={accept} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Godkend
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={capture}
              className="h-16 w-16 rounded-full bg-white border-4 border-white/40 flex items-center justify-center"
              aria-label="Tag billede"
            >
              <Camera className="h-6 w-6 text-black" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Upload fra galleri"
            >
              <ImageUp className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
