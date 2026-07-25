import { useState } from "react";
import { CheckCircle, Edit2, PhoneCall, Plus, Printer, Trash2 } from "lucide-react";
import type { ParentSummon, Student } from "@/app/types";
import { compareNewest, fmtDate, fmtTime, genId, todayStr } from "@/app/lib/helpers";
import { pdfParent } from "@/app/lib/pdf";
import { Chip } from "@/app/components/shared/Chip";
import { Confirm, Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect, FTextarea } from "@/app/components/shared/FormFields";
import { Pagination, usePagination } from "@/app/components/shared/Pagination";
import { StudentSearch } from "@/app/components/shared/StudentSearch";

export function SummonsView({ summons, students, onAdd, onEdit, onDel, onSelesai, onSuccess }: {
  summons: ParentSummon[]; students: Student[];
  onAdd:(s:ParentSummon)=>void; onEdit:(s:ParentSummon)=>void; onDel:(id:string)=>void;
  onSelesai:(id:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{s:ParentSummon}>(null);
  const [confirm,setConfirm]=useState<null|ParentSummon>(null);
  const [tab,setTab]=useState<"aktif"|"riwayat">("aktif");

  function SummonModal({ init, onSave, onClose }: { init?:ParentSummon; onSave:(s:ParentSummon)=>void; onClose:()=>void }) {
    type F={studentId:string;date:string;reason:string;scheduledDate:string;jam:string;location:string;waliKelas:string;waliKelasJabatan:string;waliKelasNip:string};
    const [f,setF]=useState<F>(init
      ?{studentId:init.studentId,date:init.date,reason:init.reason,scheduledDate:init.scheduledDate,jam:init.jam||"",location:init.location,waliKelas:init.waliKelas||"",waliKelasJabatan:init.waliKelasJabatan||"Wali Kelas",waliKelasNip:init.waliKelasNip||""}
      :{studentId:"",date:todayStr(),reason:"",scheduledDate:"",jam:"",location:"Kantor SMAN 2 Pangkalan Kuras",waliKelas:"",waliKelasJabatan:"Wali Kelas",waliKelasNip:""});
    const set=(k:keyof F,v:string)=>setF(p=>({...p,[k]:v}));
    const save=(e:React.FormEvent)=>{e.preventDefault();onSave({id:init?.id??genId(),...f,status:init?.status??"aktif"});};
    return(<Modal title={init?"Edit Panggilan":"Buat Surat Panggilan"} onClose={onClose} wide>
      <form onSubmit={save} className="p-5 space-y-4">
        <StudentSearch
          label="Siswa"
          students={students}
          value={f.studentId}
          onChange={id=>set("studentId",id)}
          placeholder="Cari siswa aktif..."
          // Panggilan orang tua baru hanya untuk siswa aktif.
          // Saat mengedit panggilan lama, siswa terkait tetap ditampilkan.
          filter={s=>
            s.id===f.studentId ||
            (
              s.status==="aktif" &&
              !s.archived &&
              !s.lulusYear
            )
          }
        />
        <FTextarea label="Alasan / Agenda Pemanggilan" value={f.reason} onChange={e=>set("reason",e.target.value)} rows={2} required/>
        <div className="grid grid-cols-2 gap-4">
          <FInput label="Tanggal Surat" type="date" value={f.date} onChange={e=>set("date",e.target.value)} required/>
          <FInput label="Jadwal Pertemuan" type="date" value={f.scheduledDate} onChange={e=>set("scheduledDate",e.target.value)} required/>
          <FInput
  label="Jam"
  type="time"
  value={f.jam}
  onChange={e=>set("jam",e.target.value)}
  required
/>
          <FInput label="Lokasi" value={f.location} onChange={e=>set("location",e.target.value)} required/>
          <FSelect label="Jabatan Penandatangan" value={f.waliKelasJabatan} onChange={e=>set("waliKelasJabatan",e.target.value)} required>
            <option value="Wali Kelas">Wali Kelas</option>
            <option value="Kepala Sekolah">Kepala Sekolah</option>
            <option value="Guru BK">Guru BK</option>
          </FSelect>
          <FInput label={`Nama ${f.waliKelasJabatan}`} placeholder="cth: Bpk. Suryanto" value={f.waliKelas} onChange={e=>set("waliKelas",e.target.value)} required/>
          <FInput label="NIP/NIPPPK (opsional)" placeholder="cth: 197203011999011001" value={f.waliKelasNip} onChange={e=>set("waliKelasNip",e.target.value)}/>
        </div>
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{init?"Simpan":"Buat"}</button>
        </div>
      </form>
    </Modal>);
  }

  const aktif   = summons.filter(s=>s.status!=="selesai").sort(compareNewest);
  const riwayat = summons.filter(s=>s.status==="selesai").sort(compareNewest);
  const pool    = tab==="aktif" ? aktif : riwayat;
  const spPag   = usePagination(pool, `${tab}${pool.length}`);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {modal==="add"&&<SummonModal onSave={s=>{onAdd(s);setModal(null);onSuccess("Surat panggilan berhasil dibuat.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<SummonModal init={modal.s} onSave={s=>{onEdit(s);setModal(null);onSuccess("Surat panggilan berhasil diperbarui.");}} onClose={()=>setModal(null)}/>}
      {confirm&&<Confirm title="Hapus Panggilan" message="Yakin hapus panggilan ini?" onOk={()=>{onDel(confirm.id);setConfirm(null);onSuccess("Panggilan berhasil dihapus.");}} onCancel={()=>setConfirm(null)}/>}

      <div className="flex items-center justify-end gap-4">
        <button onClick={()=>setModal("add")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Buat Panggilan</button>
      </div>

      {/* Tab: Aktif / Riwayat */}
      <div className="flex gap-1.5">
        <button onClick={()=>setTab("aktif")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${tab==="aktif"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
          <PhoneCall size={13}/> Aktif
          {aktif.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${tab==="aktif"?"bg-white/20":"bg-blue-100 text-blue-700"}`}>{aktif.length}</span>}
        </button>
        <button onClick={()=>setTab("riwayat")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${tab==="riwayat"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
          <CheckCircle size={13}/> Riwayat
          {riwayat.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${tab==="riwayat"?"bg-white/20":"bg-muted text-muted-foreground"}`}>{riwayat.length}</span>}
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/80 bg-primary">
                {(tab==="aktif"
                  ? ["Siswa","Agenda","Jadwal Pertemuan","Lokasi","Aksi"]
                  : ["Siswa","Agenda","Jadwal Pertemuan","Lokasi","Tanggal Selesai","Aksi"]
                ).map(h=>(
                  <th
                    key={h}
                    className={`px-5 py-3 text-[11px] font-semibold text-white uppercase tracking-wide whitespace-nowrap ${
                      h==="Aksi" ? "text-center min-w-[240px]" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spPag.slice.map(sp=>{
                const s=students.find(x=>x.id===sp.studentId);
                return(
                  <tr key={sp.id} className="hover:bg-muted/15 group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs ${tab==="riwayat"?"bg-emerald-50 text-emerald-600":"bg-blue-50 text-blue-600"}`}>{s?.name[0]}</div>
                        <div><p className="font-medium text-sm">{s?.name}</p><p className="text-xs text-muted-foreground">{s?.kelas}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 max-w-[180px]"><p className="text-xs text-muted-foreground line-clamp-2">{sp.reason}</p></td>
                    <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap">{fmtDate(sp.scheduledDate)}{sp.jam&&<span className="text-muted-foreground"> · {fmtTime(sp.jam)}</span>}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{sp.location}</td>
                    {tab==="riwayat"&&<td className="px-5 py-3.5"><Chip cls="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"><CheckCircle size={9} className="inline mr-1"/>Selesai</Chip></td>}
                    <td className="px-5 py-3.5 min-w-[240px]">
                      <div className="flex w-full items-center justify-center gap-2">
                        <button
                          onClick={()=>void pdfParent(s!,sp)}
                          disabled={!s}
                          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground disabled:opacity-30"
                          title="Cetak surat"
                        >
                          <Printer size={13}/>
                        </button>

                        {tab==="aktif"&&(
                          <button
                            onClick={()=>setModal({s:sp})}
                            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"
                            title="Edit"
                          >
                            <Edit2 size={13}/>
                          </button>
                        )}

                        <button
                          onClick={()=>setConfirm(sp)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive"
                          title="Hapus"
                        >
                          <Trash2 size={13}/>
                        </button>

                        {tab==="aktif"&&(
                          <button
                            onClick={()=>{
                              onSelesai(sp.id);
                              setTab("riwayat");
                              onSuccess("Panggilan ditandai selesai dan dipindah ke Riwayat.");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                          >
                            <CheckCircle size={11}/>
                            Selesai
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pool.length===0&&(
          <div className="py-16 text-center text-muted-foreground text-sm">
            {tab==="aktif"
              ? <><PhoneCall size={24} className="mx-auto mb-2 text-muted-foreground/30"/>Belum ada panggilan aktif</>
              : <><CheckCircle size={24} className="mx-auto mb-2 text-muted-foreground/30"/>Belum ada riwayat panggilan selesai</>
            }
          </div>
        )}
        <Pagination page={spPag.page} totalPages={spPag.totalPages} total={spPag.total} onPage={spPag.setPage}/>
      </div>
    </div>
  );
}
