import { useState, useMemo, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import type { Student } from "@/app/types";

export function StudentSearch({ students, value, onChange, label, placeholder, filter }: {
  students: Student[]; value: string; onChange: (id: string) => void;
  label?: string; placeholder?: string; filter?: (s: Student) => boolean;
}) {
  const pool = [...(filter ? students.filter(filter) : students)].sort(compareNewest);
  const selected = pool.find(s => s.id === value);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = q.trim() ? pool.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.nis.includes(q)) : pool.slice(0,8);
  const pick = (s: Student) => { onChange(s.id); setQ(""); setOpen(false); };
  return (
    <div className="relative">
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-input-background text-sm transition-shadow ${open?"ring-2 ring-ring border-ring/50":"border-border"}`}>
        <Search size={13} className="text-muted-foreground flex-shrink-0"/>
        <input value={open?q:(selected?`${selected.name} – ${selected.nis} (${selected.kelas})`:"")}
          placeholder={open?"Ketik nama atau NIS...":(placeholder??"Cari siswa...")}
          className="flex-1 bg-transparent outline-none min-w-0"
          onFocus={()=>setOpen(true)} onChange={e=>{setQ(e.target.value);if(!open)setOpen(true);}}
          onBlur={()=>setTimeout(()=>setOpen(false),150)} />
        {value&&!open&&<button type="button" onClick={()=>{onChange("");setQ("");}} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X size={13}/></button>}
      </div>
      {open&&(
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {results.length===0?<div className="px-4 py-3 text-sm text-muted-foreground">Tidak ditemukan</div>:(
            <ul className="max-h-52 overflow-y-auto divide-y divide-border">
              {results.map(s=>{const sanct=getSanction(s.totalPoints);return(
                <li key={s.id}><button type="button" onMouseDown={()=>pick(s)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors ${s.id===value?"bg-primary/5":""}`}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">{s.name[0]}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.name}</p><p className="text-xs text-muted-foreground">{s.nis} · {s.kelas}</p></div>
                  <div className="text-right flex-shrink-0"><p className="text-xs font-bold">{s.totalPoints} poin</p><span className={`text-[10px] ${sanct.text}`}>{sanct.label}</span></div>
                </button></li>
              );})}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
