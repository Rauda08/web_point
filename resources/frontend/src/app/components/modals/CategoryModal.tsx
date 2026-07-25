import { useState } from "react";
import type { ViolationType } from "@/app/types";
import { genId } from "@/app/lib/helpers";
import { Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect, FTextarea } from "@/app/components/shared/FormFields";

export function CategoryModal({ init, onSave, onClose }: { init?: ViolationType; onSave:(vt:ViolationType)=>void; onClose:()=>void }) {
  type F = { name:string; description:string; category:"ringan"|"sedang"|"berat"; points:number; sanction:string };
  const [f,setF]=useState<F>(init?{name:init.name,description:init.description,category:init.category,points:init.points,sanction:init.sanction}:{name:"",description:"",category:"ringan",points:5,sanction:""});
  const set=(k: keyof F, v:string|number)=>setF(p=>({...p,[k]:v}));
  const save=(e: React.FormEvent)=>{e.preventDefault();onSave({id:init?.id??genId(),...f});};
  return (
    <Modal title={init?"Edit Jenis Pelanggaran":"Tambah Jenis Pelanggaran"} onClose={onClose}>
      <form onSubmit={save} className="p-5 space-y-4">
        <FInput label="Nama Pelanggaran" value={f.name} onChange={e=>set("name",e.target.value)} required/>
        <FTextarea label="Deskripsi" value={f.description} onChange={e=>set("description",e.target.value)} rows={2}/>
        <div className="grid grid-cols-2 gap-4">
          <FSelect label="Kategori" value={f.category} onChange={e=>set("category",e.target.value)}>
            <option value="ringan">Ringan</option><option value="sedang">Sedang</option><option value="berat">Berat</option>
          </FSelect>
          <FInput label="Poin" type="number" min={1} max={100} value={f.points} onChange={e=>set("points",Number(e.target.value))} required/>
        </div>
        <FInput label="Sanksi / Tindak Lanjut" value={f.sanction} onChange={e=>set("sanction",e.target.value)} required/>
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{init?"Simpan":"Tambah"}</button>
        </div>
      </form>
    </Modal>
  );
}
