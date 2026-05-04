import { useEffect, useRef, useState } from "react";
import { Camera, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Snap() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (captured) return;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => toast({ title: "Kamera ikke tilgængeligt", variant: "destructive" }));
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured]);

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    setCaptured(canvas.toDataURL("image/jpeg", 0.85));
    stream?.getTracks().forEach((t) => t.stop());
  };

  const accept = async () => {
    setBusy(true);
    // Placeholder: upload + extract-receipt wired in Fase 4
    toast({ title: "Bilag modtaget", description: "OCR-pipeline kobles på i næste fase." });
    setBusy(false);
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 text-white">
        <span className="text-sm font-medium">Scan bilag</span>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {captured ? (
          <img src={captured} alt="capture" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
      </div>
      <div className="px-4 py-6 flex justify-center gap-4 bg-black">
        {captured ? (
          <>
            <Button variant="outline" size="lg" onClick={() => setCaptured(null)} disabled={busy}>
              Tag igen
            </Button>
            <Button size="lg" onClick={accept} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Godkend
            </Button>
          </>
        ) : (
          <button
            onClick={capture}
            className="h-16 w-16 rounded-full bg-white border-4 border-white/40 flex items-center justify-center"
            aria-label="Tag billede"
          >
            <Camera className="h-6 w-6 text-black" />
          </button>
        )}
      </div>
    </div>
  );
}
