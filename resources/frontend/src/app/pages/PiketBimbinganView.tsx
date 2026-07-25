import { useState } from "react";
import { BookMarked, CheckCircle, Edit2, XCircle } from "lucide-react";
import type { AppUser, GuidanceEntry, Student } from "@/app/types";
import { compareNewest, fmtDate, todayStr } from "@/app/lib/helpers";
import { Chip } from "@/app/components/shared/Chip";
import { Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect, FTextarea } from "@/app/components/shared/FormFields";
import { Pagination, usePagination } from "@/app/components/shared/Pagination";

export function PiketBimbinganView({ guidance, students, currentUser, onEdit, onSuccess }: {
  guidance: GuidanceEntry[]; students: Student[]; currentUser: AppUser;
  onEdit:(g:GuidanceEntry)=>void; onSuccess:(m:string)=>void;
}) {
  const [bTab,setBTab]=useState<"tugas"|"selesai">("tugas");
  const [selected,setSelected]=useState<GuidanceEntry|null>(null);
  const sCfg:{[k:string]:{cls:string;label:string}}={
    dijadwalkan:{cls:"bg-purple-50 text-purple-700 border-purple-200",label:"Dijadwalkan"},
    berlangsung:{cls:"bg-amber-50 text-amber-700 border-amber-200",label:"Berlangsung"},
    selesai:{cls:"bg-emerald-50 text-emerald-700 border-emerald-200",label:"Selesai"},
  };

  const myTasks = guidance.filter(g=>g.assignedTo===currentUser.id).sort(compareNewest);
  const tugasList  = myTasks.filter(g=>g.status!=="selesai");
  const selesaiList= myTasks.filter(g=>g.status==="selesai");
  const pool = bTab==="tugas" ? tugasList : selesaiList;
  const bPag = usePagination(pool, `${bTab}${pool.length}`);

  // Modal isi jurnal oleh guru
  function JurnalModal({ g, onClose }: { g: GuidanceEntry; onClose:()=>void }) {
    const [date,setDate]    = useState(g.date||todayStr());
    const [notes,setNotes]  = useState(g.notes);
    const [followUp,setFollowUp] = useState(g.followUp);
    const [status,setStatus]= useState<GuidanceEntry["status"]>(g.status==="dijadwalkan"?"berlangsung":g.status);
    const [err,setErr] = useState("");
    const s = students.find(x=>x.id===g.studentId);
    const sc = sCfg[g.status]??{
      cls:"bg-gray-50 text-gray-700 border-gray-200",
      label:g.status||"Tidak diketahui",
    };
    return(
      <Modal title="Isi Jurnal Bimbingan" sub={`${s?.name} — ${g.topic}`} onClose={onClose} wide>
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
            <BookMarked size={15} className="flex-shrink-0 mt-0.5 text-blue-600"/>
            <div>
              <p className="font-semibold mb-0.5">Tugas dari Admin</p>
              <p className="text-xs">{g.topic} · Jadwal: {fmtDate(g.date)} · Status saat ini: <span className={`font-semibold px-1.5 py-0.5 rounded-full border text-[10px] ${sc.cls}`}>{sc.label}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Siswa",s?.name||"-"],["Kelas",s?.kelas||"-"],["Topik",g.topic],["Tanggal",fmtDate(g.date)]].map(([l,v])=>(
              <div key={l} className="bg-muted/30 rounded-lg p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{l}</p><p className="font-semibold text-xs">{v}</p></div>
            ))}
          </div>
          <FInput label="Tanggal Pelaksanaan" type="date" value={date} onChange={e=>setDate(e.target.value)} required/>
          <div>
            <FTextarea label="Catatan Bimbingan *" value={notes} onChange={e=>{setNotes(e.target.value);if(e.target.value.trim())setErr("");}} rows={4} placeholder="Tuliskan hasil sesi bimbingan..."/>
            {err&&<p className="text-xs text-destructive mt-1 flex items-center gap-1"><XCircle size={11}/>{err}</p>}
          </div>
          <FTextarea label="Rencana Tindak Lanjut" value={followUp} onChange={e=>setFollowUp(e.target.value)} rows={2} placeholder="cth: Pantau selama 2 minggu ke depan..."/>
          <FSelect label="Update Status" value={status} onChange={e=>setStatus(e.target.value as GuidanceEntry["status"])}>
            <option value="berlangsung">Berlangsung</option>
            <option value="selesai">Selesai — jurnal dikirim ke admin</option>
          </FSelect>
          {status==="selesai"&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-start gap-2"><CheckCircle size={13} className="flex-shrink-0 mt-0.5 text-emerald-600"/>Setelah disimpan, jurnal ini akan masuk ke Riwayat admin dan tidak dapat diubah lagi.</div>}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
            <button onClick={()=>{
              if(!notes.trim()){setErr("Catatan bimbingan wajib diisi sebelum menyimpan.");return;}
              onEdit({...g,date,notes,followUp,status});
              onSuccess(status==="selesai"?"Jurnal selesai dan telah dikirim ke admin.":"Jurnal bimbingan berhasil disimpan.");
              onClose();
            }} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center justify-center gap-2">
              <CheckCircle size={14}/> Simpan Jurnal
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return(
    <div className="p-4 sm:p-6 space-y-5">
      {selected&&<JurnalModal g={selected} onClose={()=>setSelected(null)}/>}
      {myTasks.length===0?(
        <div className="py-24 text-center bg-card rounded-2xl border border-border text-muted-foreground">
          <BookMarked size={32} className="mx-auto mb-3 opacity-20"/>
          <p className="text-sm font-medium">Belum ada tugas bimbingan</p>
          <p className="text-xs mt-1">Admin belum menugaskan sesi bimbingan untuk Anda</p>
        </div>
      ):(
        <>
          <div className="flex gap-1.5">
            <button onClick={()=>setBTab("tugas")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${bTab==="tugas"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
              <BookMarked size={13}/> Tugas Aktif
              {tugasList.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${bTab==="tugas"?"bg-white/20":"bg-purple-100 text-purple-700"}`}>{tugasList.length}</span>}
            </button>
            <button onClick={()=>setBTab("selesai")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${bTab==="selesai"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
              <CheckCircle size={13}/> Selesai
              {selesaiList.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${bTab==="selesai"?"bg-white/20":"bg-muted text-muted-foreground"}`}>{selesaiList.length}</span>}
            </button>
          </div>
          <div className="space-y-3">
            {bPag.slice.map(g=>{
              const s=students.find(x=>x.id===g.studentId);
              const sc=sCfg[g.status]??{
                cls:"bg-gray-50 text-gray-700 border-gray-200",
                label:g.status||"Tidak diketahui",
              };
              return(
                <div key={g.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bTab==="selesai"?"bg-emerald-50":"bg-purple-100"}`}>
                        <BookMarked size={17} className={bTab==="selesai"?"text-emerald-600":"text-purple-600"}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{g.topic}</p>
                          <Chip cls={`${sc.cls} text-[10px]`}>{sc.label}</Chip>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{s?.name} · {s?.kelas} · {fmtDate(g.date)}</p>
                        {g.notes&&<p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-lg px-3 py-2 mb-2">{g.notes}</p>}
                        {g.followUp&&<p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Tindak lanjut:</span> {g.followUp}</p>}
                      </div>
                    </div>
                    {bTab==="tugas"&&(
                      <button onClick={()=>setSelected(g)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap flex-shrink-0">
                        <Edit2 size={11}/> Isi Jurnal
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {bPag.totalPages>1&&(
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <Pagination page={bPag.page} totalPages={bPag.totalPages} total={bPag.total} onPage={bPag.setPage}/>
            </div>
          )}
        </>
      )}
    </div>
  );
}
