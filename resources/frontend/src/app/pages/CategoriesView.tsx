import { useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import type { ViolationType } from "@/app/types";
import { compareNewest } from "@/app/lib/helpers";
import { hdr } from "@/app/lib/pdf";
import { Confirm } from "@/app/components/shared/Modal";
import { CategoryModal } from "@/app/components/modals/CategoryModal";

export function CategoriesView({ vts, onAdd, onEdit, onDel, onSuccess }: {
  vts: ViolationType[]; onAdd:(v:ViolationType)=>void; onEdit:(v:ViolationType)=>void; onDel:(id:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{vt:ViolationType}>(null);
  const [confirm,setConfirm]=useState<null|ViolationType>(null);
  return (
    <div className="p-6 space-y-5">
      {modal==="add"&&<CategoryModal onSave={v=>{onAdd(v);setModal(null);onSuccess("Jenis pelanggaran berhasil ditambahkan.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<CategoryModal init={modal.vt} onSave={v=>{onEdit(v);setModal(null);onSuccess("Jenis pelanggaran berhasil diperbarui.");}} onClose={()=>setModal(null)}/>}
      {confirm&&<Confirm title="Hapus Jenis Pelanggaran" message={`Yakin hapus "${confirm.name}"?`} onOk={()=>{onDel(confirm.id);setConfirm(null);onSuccess("Jenis pelanggaran berhasil dihapus.");}} onCancel={()=>setConfirm(null)}/>}
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-xl font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Konfigurasi Sanksi</h1><p className="text-sm text-muted-foreground">{vts.length} jenis pelanggaran terdaftar</p></div>
        <button onClick={()=>setModal("add")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Tambah Jenis</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(["ringan","sedang","berat"] as const).map(cat=>{
          const cfg={ringan:{label:"Ringan",hdr:"bg-sky-600",card:"border-sky-100 bg-sky-50/30"},sedang:{label:"Sedang",hdr:"bg-amber-600",card:"border-amber-100 bg-amber-50/30"},berat:{label:"Berat",hdr:"bg-red-600",card:"border-red-100 bg-red-50/30"}}[cat];
          const items=vts.filter(v=>v.category===cat).sort(compareNewest);
          return(<div key={cat} className={`rounded-2xl border overflow-hidden ${cfg.card}`}>
            <div className={`${cfg.hdr} px-5 py-4 flex items-center justify-between`}>
              <p className="text-white font-semibold text-sm">Pelanggaran {cfg.label}</p>
              <span className="text-xs bg-white/20 text-white border border-white/25 px-2.5 py-0.5 rounded-full font-semibold">{items.length}</span>
            </div>
            <div className="p-4 space-y-2.5">
              {items.map(vt=>(
                <div key={vt.id} className="bg-white rounded-xl border border-white/90 p-4 shadow-sm group">
                  <div className="flex items-start justify-between gap-2 mb-2"><p className="text-sm font-semibold leading-tight">{vt.name}</p><span className="font-bold text-destructive text-sm flex-shrink-0" style={{fontFamily:"'JetBrains Mono',monospace"}}>{vt.points}</span></div>
                  <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{vt.description}</p>
                  <p className="text-xs text-muted-foreground pt-2.5 border-t border-border leading-relaxed"><span className="font-semibold text-foreground">Sanksi:</span> {vt.sanction}</p>
                  <div className="flex gap-1 mt-2.5 justify-end flex">
                    <button onClick={()=>setModal({vt})} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"><Edit2 size={12}/></button>
                    <button onClick={()=>setConfirm(vt)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>);
        })}
      </div>
    </div>
  );
}
