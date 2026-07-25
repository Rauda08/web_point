import { useState } from "react";
import { AlertCircle, BookMarked, CheckCircle, Edit2, Lock, Plus, Trash2 } from "lucide-react";
import type { AppUser, GuidanceEntry, Student } from "@/app/types";
import { compareNewest, fmtDate, genId, todayStr } from "@/app/lib/helpers";
import { Chip } from "@/app/components/shared/Chip";
import { Confirm, Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect, FTextarea } from "@/app/components/shared/FormFields";
import { Pagination, usePagination } from "@/app/components/shared/Pagination";
import { StudentSearch } from "@/app/components/shared/StudentSearch";

export function GuidanceView({ guidance, students, users, currentUser, onAdd, onEdit, onDel, onSuccess }: {
  guidance: GuidanceEntry[]; students: Student[]; users: AppUser[]; currentUser: AppUser;
  onAdd:(g:GuidanceEntry)=>Promise<boolean>; onEdit:(g:GuidanceEntry)=>Promise<boolean>; onDel:(id:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{g:GuidanceEntry}>(null);
  const [confirm,setConfirm]=useState<null|GuidanceEntry>(null);
  const guruList = users.filter(u=>u.role==="guru_piket").sort(compareNewest);
  function GuidModal({ init, onSave, onClose }: { init?:GuidanceEntry; onSave:(g:GuidanceEntry)=>Promise<boolean>; onClose:()=>void }) {
    type F={studentId:string;topic:string;notes:string;officer:string;assignedTo:string};
    const [f,setF]=useState<F>(init
      ?{
          studentId:init.studentId,
          topic:init.topic,
          notes:init.notes,
          officer:init.officer,
          assignedTo:init.assignedTo||"",
        }
      :{
          studentId:"",
          topic:"",
          notes:"",
          officer:"",
          assignedTo:"",
        });
    const [formError,setFormError]=useState("");
    const [saving,setSaving]=useState(false);
    const set=(k:keyof F,v:string)=>{
      setF(p=>({...p,[k]:v}));
      if(formError)setFormError("");
    };
    const handleAssign=(uid:string)=>{
      const g=guruList.find(u=>u.id===uid);
      setF(p=>({...p,assignedTo:uid,officer:g?.displayName||""}));
      if(formError)setFormError("");
    };
    const save=async(e:React.FormEvent)=>{
      e.preventDefault();

      if(!f.studentId){
        setFormError("Pilih siswa yang akan dibimbing.");
        return;
      }
      if(!f.assignedTo||!f.officer){
        setFormError("Pilih guru yang akan ditugaskan.");
        return;
      }

      setSaving(true);
      try{
        await onSave({
          id:init?.id??genId(),
          ...f,
          // Admin tidak perlu memilih tanggal. Tanggal dicatat otomatis
          // saat tugas dibuat; saat edit, tanggal lama tetap dipertahankan.
          date:init?.date||todayStr(),
          followUp:init?.followUp??"",
          status:init?.status??"dijadwalkan",
          assignedTo:f.assignedTo||undefined,
          requestedBy:f.assignedTo?currentUser.id:init?.requestedBy,
        });
      }finally{
        setSaving(false);
      }
    };
    return(<Modal title={init?"Edit Tugas Bimbingan":"Buat Tugas Bimbingan"} onClose={onClose} wide>
      <form onSubmit={save} className="p-5 space-y-4">
        <StudentSearch
          label="Siswa yang Dibimbing"
          students={students}
          value={f.studentId}
          onChange={id=>set("studentId",id)}
          placeholder="Cari siswa aktif..."
          // Tugas bimbingan baru hanya untuk siswa aktif.
          // Saat mengedit jurnal lama, siswa terkait tetap ditampilkan.
          filter={s=>
            s.id===f.studentId ||
            (
              s.status==="aktif" &&
              !s.archived &&
              !s.lulusYear
            )
          }
        />
        <FInput label="Topik / Agenda Bimbingan" value={f.topic} onChange={e=>set("topic",e.target.value)} required/>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FSelect label="Tugaskan ke Guru" value={f.assignedTo} onChange={e=>handleAssign(e.target.value)} required>
            <option value="">— Pilih Guru —</option>
            {guruList.map(u=><option key={u.id} value={u.id}>{u.displayName}{u.nip?` (NIP: ${u.nip})`:""}</option>)}
          </FSelect>
          <FInput label="Nama Guru (otomatis)" value={f.officer} readOnly required/>
        </div>
        <FTextarea label="Catatan / Instruksi untuk Guru (opsional)" value={f.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="cth: Fokus pada pembinaan kedisiplinan..."/>
        {formError&&<p className="text-xs text-destructive flex items-center gap-1"><AlertCircle size={12}/>{formError}</p>}
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 disabled:opacity-50">Batal</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            {saving?"Menyimpan...":init?"Simpan":"Kirim Tugas"}
          </button>
        </div>
      </form>
    </Modal>);
  }
  const [gTab,setGTab]=useState<"aktif"|"riwayat">("aktif");
  const sCfg:{[k:string]:{cls:string;label:string}}={dijadwalkan:{cls:"bg-purple-50 text-purple-700 border-purple-200",label:"Dijadwalkan"},berlangsung:{cls:"bg-amber-50 text-amber-700 border-amber-200",label:"Berlangsung"},selesai:{cls:"bg-emerald-50 text-emerald-700 border-emerald-200",label:"Selesai"}};
  const sorted=[...guidance].sort(compareNewest);
  const aktifGuid   = sorted.filter(g=>g.status!=="selesai");
  const riwayatGuid = sorted.filter(g=>g.status==="selesai");
  const pool = gTab==="aktif" ? aktifGuid : riwayatGuid;
  const gPag=usePagination(pool, `${gTab}${pool.length}`);
  return (
    <div className="p-4 sm:p-6 space-y-5">
      {modal==="add"&&<GuidModal onSave={async g=>{
        const success=await onAdd(g);
        if(success){
          setModal(null);
          onSuccess("Jurnal bimbingan berhasil ditambahkan.");
        }
        return success;
      }} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<GuidModal init={modal.g} onSave={async g=>{
        const success=await onEdit(g);
        if(success){
          setModal(null);
          onSuccess("Jurnal bimbingan berhasil diperbarui.");
        }
        return success;
      }} onClose={()=>setModal(null)}/>}
      {confirm&&<Confirm title="Hapus Jurnal" message={`Yakin hapus jurnal "${confirm.topic}"?`} onOk={()=>{onDel(confirm.id);setConfirm(null);onSuccess("Jurnal bimbingan berhasil dihapus.");}} onCancel={()=>setConfirm(null)}/>}
      <div className="flex items-center justify-end gap-4">
        <button onClick={()=>setModal("add")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Tambah</button>
      </div>
      {/* Tabs */}
      <div className="flex gap-1.5">
        <button onClick={()=>setGTab("aktif")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${gTab==="aktif"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
          <BookMarked size={13}/> Aktif
          {aktifGuid.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${gTab==="aktif"?"bg-white/20":"bg-purple-100 text-purple-700"}`}>{aktifGuid.length}</span>}
        </button>
        <button onClick={()=>setGTab("riwayat")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${gTab==="riwayat"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
          <CheckCircle size={13}/> Riwayat
          {riwayatGuid.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${gTab==="riwayat"?"bg-white/20":"bg-emerald-100 text-emerald-700"}`}>{riwayatGuid.length}</span>}
        </button>
      </div>
      <div className="space-y-3">
        {pool.length===0&&<div className="py-16 text-center bg-card rounded-2xl border border-border text-muted-foreground text-sm"><BookMarked size={24} className="mx-auto mb-2 opacity-30"/>{gTab==="aktif"?"Belum ada sesi bimbingan aktif":"Belum ada riwayat bimbingan selesai"}</div>}
        {gPag.slice.map(g=>{
          const s=students.find(x=>x.id===g.studentId);
          const sc=sCfg[g.status]??{
            cls:"bg-gray-50 text-gray-700 border-gray-200",
            label:g.status||"Tidak diketahui",
          };
          return(
          <div key={g.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-sm group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${gTab==="riwayat"?"bg-emerald-50":"bg-purple-100"}`}><BookMarked size={17} className={gTab==="riwayat"?"text-emerald-600":"text-purple-600"}/></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{g.topic}</p>
                    <Chip cls={`${sc.cls} text-[10px]`}>{sc.label}</Chip>
                    {g.assignedTo&&g.status!=="selesai"&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">Ditugaskan</span>}
                    {g.assignedTo&&g.status==="selesai"&&g.notes&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1"><CheckCircle size={9}/>Jurnal masuk</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{s?.name} · {s?.kelas} · <span className={g.date?"":"italic text-muted-foreground/60"}>{g.date?fmtDate(g.date):"Belum dijadwalkan"}</span> · <span className="font-medium text-foreground">{g.officer}</span></p>
                  {g.notes&&<p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-lg px-3 py-2 mb-2">{g.notes}</p>}
                  {g.followUp&&<p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Tindak lanjut:</span> {g.followUp}</p>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {g.status==="dijadwalkan"?(
                  <>
                    <button onClick={()=>setModal({g})} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground" title="Edit"><Edit2 size={13}/></button>
                    <button onClick={()=>setConfirm(g)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive" title="Hapus"><Trash2 size={13}/></button>
                  </>
                ):(
                  <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-lg bg-muted/40 flex items-center gap-1" title="Tidak dapat diedit — tugas sedang berjalan atau selesai"><Lock size={10}/> {g.status==="berlangsung"?"Sedang berjalan":"Selesai"}</span>
                )}
              </div>
            </div>
          </div>
        );})}
      </div>
      {gPag.totalPages > 1 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <Pagination page={gPag.page} totalPages={gPag.totalPages} total={gPag.total} onPage={gPag.setPage}/>
        </div>
      )}
    </div>
  );
}
