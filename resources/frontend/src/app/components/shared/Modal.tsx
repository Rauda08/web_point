import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ title, sub, wide, onClose, children }: {
  title: string; sub?: string; wide?: boolean; onClose: ()=>void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] w-full ${wide?"max-w-2xl":"max-w-lg"}`}>
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div><h3 className="font-semibold text-sm">{title}</h3>{sub&&<p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground ml-4"><X size={15}/></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
export function Confirm({ title, message, onOk, onCancel }: { title: string; message: string; onOk:()=>void; onCancel:()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-destructive"/></div>
        <h3 className="font-semibold text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button onClick={onOk} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90">Hapus</button>
        </div>
      </div>
    </div>
  );
}
