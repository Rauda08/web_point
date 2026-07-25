import { useState, useRef, useEffect } from "react";
import { Camera, ImageIcon, X } from "lucide-react";

export function EvidencePreview({ evidence, className }: { evidence?: string; className?: string }) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let objectUrl: string | undefined;
    if (evidence?.startsWith("__server__:")) {
      api.fetchEvidenceBlobUrl(evidence.split(":")[1]).then(u => { objectUrl = u; setUrl(u); }).catch(() => setUrl(undefined));
    } else {
      setUrl(evidence);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidence]);
  if (!url) return <div className={`flex items-center justify-center text-xs text-muted-foreground bg-muted/30 ${className??"w-full max-h-36"}`}>Memuat bukti...</div>;
  return <img src={url} alt="Bukti" className={className??"w-full max-h-36 object-cover"}/>;
}

export function EvidenceUpload({ value, onChange }: { value?: string; onChange: (b64?: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const isServerEvidence = value?.startsWith("__server__:");

  useEffect(() => {
    let objectUrl: string | undefined;
    if (isServerEvidence) {
      const violationId = value!.split(":")[1];
      api.fetchEvidenceBlobUrl(violationId).then(url => { objectUrl = url; setPreviewUrl(url); }).catch(() => setPreviewUrl(undefined));
    } else {
      setPreviewUrl(value);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value, isServerEvidence]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => onChange(fr.result as string);
    fr.readAsDataURL(file);
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bukti Foto (opsional)</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
          {previewUrl
            ? <img src={previewUrl} alt="Bukti" className="w-full max-h-48 object-cover"/>
            : <div className="w-full h-24 flex items-center justify-center text-xs text-muted-foreground">Memuat bukti...</div>}
          <button type="button" onClick={()=>onChange(undefined)}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors">
            <X size={13} className="text-white"/>
          </button>
        </div>
      ) : (
        <button type="button" onClick={()=>ref.current?.click()}
          className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
          <Camera size={20}/>
          <span className="text-xs font-medium">Klik untuk unggah foto bukti</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
    </div>
  );
}
