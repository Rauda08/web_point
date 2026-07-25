import { XCircle } from "lucide-react";

export function ErrorModal({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-red-500"/>
        </div>
        <p className="font-semibold text-base mb-1">Gagal</p>
        <p className="text-sm text-muted-foreground mb-6">{msg}</p>
        <button onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          Tutup
        </button>
      </div>
    </div>
  );
}
