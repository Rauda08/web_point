import { useState } from "react";
import type { Student } from "@/app/types";
import { genId } from "@/app/lib/helpers";
import { Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect } from "@/app/components/shared/FormFields";

export function StudentModal({ init, existingNis, onSave, onClose }: { init?: Student; existingNis: string[]; onSave:(s:Student)=>void; onClose:()=>void }) {
  type F = { nis:string; name:string; kelas:string; gender:"L"|"P"; parentName:string; parentPhone:string };
  const [f, setF] = useState<F>(init?{nis:init.nis,name:init.name,kelas:init.kelas,gender:init.gender,parentName:init.parentName,parentPhone:init.parentPhone}:{nis:"",name:"",kelas:"",gender:"L",parentName:"",parentPhone:""});
  const set = (k: keyof F, v: string) => setF(p=>({...p,[k]:v}));
  const nisDuplicate = f.nis.trim() !== "" && f.nis.trim() !== init?.nis && existingNis.includes(f.nis.trim());
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (nisDuplicate) return;
    onSave({id:init?.id??genId(),totalPoints:init?.totalPoints??0,...f});
  };
  return (
    <Modal title={init?"Edit Data Siswa":"Tambah Siswa Baru"} onClose={onClose}>
      <form onSubmit={save} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FInput label="NIS" value={f.nis} onChange={e=>set("nis",e.target.value)} placeholder="2024009" required/>
            {nisDuplicate&&<p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={11}/> NIS sudah terdaftar</p>}
          </div>
          <FSelect label="Jenis Kelamin" value={f.gender} onChange={e=>set("gender",e.target.value as "L"|"P")}>
            <option value="L">Laki-laki</option><option value="P">Perempuan</option>
          </FSelect>
        </div>
        <FInput label="Nama Lengkap" value={f.name} onChange={e=>set("name",e.target.value)} required/>
        <FSelect label="Kelas" value={f.kelas} onChange={e=>set("kelas",e.target.value)} required>
          <option value="">Pilih kelas...</option>{KELAS_OPTIONS.map(k=><option key={k}>{k}</option>)}
        </FSelect>
        <FInput label="Nama Orang Tua / Wali" value={f.parentName} onChange={e=>set("parentName",e.target.value)} required/>
        <FInput label="No. Telepon Orang Tua" value={f.parentPhone} onChange={e=>set("parentPhone",e.target.value)} required/>
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button type="submit" disabled={nisDuplicate} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">{init?"Simpan":"Tambah Siswa"}</button>
        </div>
      </form>
    </Modal>
  );
}
