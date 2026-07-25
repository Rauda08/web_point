import { useState } from "react";
import {
  BadgeCheck, CheckCircle, ClipboardList, Clock, Edit2, Eye, FileText, ImageIcon,
  MinusCircle, Plus, Trash2, X, XCircle,
} from "lucide-react";
import type { AppUser, Student, Violation, ViolationType } from "@/app/types";
import { compareNewest, fmtDate, getCatCls, getStatusInfo, getVerifyInfo, todayStr } from "@/app/lib/helpers";
import { Chip } from "@/app/components/shared/Chip";
import { Confirm, Modal } from "@/app/components/shared/Modal";
import { EvidencePreview } from "@/app/components/shared/Evidence";
import { Pagination, usePagination } from "@/app/components/shared/Pagination";
import { ViolationModal } from "@/app/components/modals/ViolationModal";

export function ViolationsView({ violations, students, vts, currentUser, onAdd, onEdit, onDel, onStatus, onVerify, onReducePoints, onSuccess }: {
  violations: Violation[]; students: Student[]; vts: ViolationType[]; currentUser: AppUser;
  onAdd:(v:Violation)=>void; onEdit:(v:Violation)=>void; onDel:(id:string)=>void;
  onStatus:(id:string,s:Violation["status"])=>void; onVerify:(id:string,vs:Violation["verifyStatus"])=>void;
  onReducePoints:(id:string,amount:number,note:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{v:Violation}>(null);
  const [confirm,setConfirm]=useState<null|Violation>(null);
  const [periksa,setPeriksa]=useState<null|Violation>(null);
  const [reduceTarget,setReduceTarget]=useState<null|Violation>(null);
  const [vTab,setVTab]=useState<"aktif"|"riwayat">("aktif");
  const [fVerify,setFVerify]=useState("");
  const [fDate,setFDate]=useState<"hari_ini"|"minggu_ini"|"bulan_ini"|"">("");

  const todayISO  = todayStr();
  const weekStart = (()=>{ const d=new Date(todayISO); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10); })();
  const monthStart= todayISO.slice(0,7)+"-01";

  const base=[...violations].filter(v=>v.verifyStatus!=="draft").sort(compareNewest);
  const aktifBase   = base.filter(v=>v.status!=="selesai");
  const riwayatBase = base.filter(v=>v.status==="selesai");

  const filtered = vTab==="aktif"
    ? aktifBase.filter(v=>!fVerify||v.verifyStatus===fVerify)
    : riwayatBase.filter(v=>{
        if(fDate==="hari_ini"  && v.date!==todayISO)   return false;
        if(fDate==="minggu_ini"&& v.date<weekStart)     return false;
        if(fDate==="bulan_ini" && v.date<monthStart)    return false;
        return true;
      });

  const menunggu=violations.filter(v=>v.verifyStatus==="menunggu").length;
  const vPag=usePagination(filtered, `${vTab}${fVerify}${fDate}`);

  // Derive "Tindak Lanjut" label from violation context
  function getTindakLanjut(v: Violation, vt?: ViolationType): { label: string; cls: string } {
    if (v.verifyStatus === "draft")        return { label: "Menunggu verifikasi", cls: "text-slate-400 italic" };
    if (v.verifyStatus === "menunggu")     return { label: "Menunggu verifikasi", cls: "text-amber-500 italic" };
    if (v.verifyStatus === "ditolak")      return { label: "Menunggu verifikasi", cls: "text-red-400 italic" };
    if (vt?.category === "ringan")         return { label: "Tidak diperlukan", cls: "text-slate-400 italic" };
    if (v.status === "selesai")            return { label: "Selesai", cls: "text-emerald-600 font-semibold" };
    if (v.status === "proses")             return { label: "Sedang diproses", cls: "text-amber-600 font-semibold" };
    return { label: "Belum ditindaklanjuti", cls: "text-red-500 font-semibold" };
  }

  // Action button logic per row
  function AksiCell({ v, vt }: { v: Violation; vt?: ViolationType }) {
    if (v.verifyStatus === "menunggu") return (
      <button onClick={()=>setPeriksa(v)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap">
        <Eye size={11}/> Periksa
      </button>
    );
    if (v.verifyStatus === "draft" || v.verifyStatus === "ditolak") return (
      <button onClick={()=>setModal({v})} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
        <Edit2 size={11}/> Edit
      </button>
    );
    return (
      <button onClick={()=>setModal({v})} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
        <FileText size={11}/> Detail
      </button>
    );
  }

  const periksaVt = periksa ? vts.find(x=>x.id===periksa.violationTypeId) : undefined;
  const periksaSt = periksa ? students.find(x=>x.id===periksa.studentId) : undefined;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {modal==="add"&&<ViolationModal students={students} vts={vts} currentUser={currentUser} onSave={v=>{onAdd(v);setModal(null);onSuccess("Catatan pelanggaran berhasil ditambahkan.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<ViolationModal init={modal.v} students={students} vts={vts} currentUser={currentUser} onSave={v=>{onEdit(v);setModal(null);onSuccess("Catatan pelanggaran berhasil diperbarui.");}} onClose={()=>setModal(null)}/>}
      {confirm&&<Confirm title="Hapus Catatan" message="Yakin hapus pelanggaran ini? Poin siswa akan dikurangi." onOk={()=>{onDel(confirm.id);setConfirm(null);onSuccess("Catatan pelanggaran berhasil dihapus.");}} onCancel={()=>setConfirm(null)}/>}

      {/* Periksa Modal — approve/reject from detail */}
      {periksa&&periksaSt&&periksaVt&&(
        <Modal title="Periksa Catatan Pelanggaran" onClose={()=>setPeriksa(null)}>
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
              <Clock size={15} className="flex-shrink-0 mt-0.5 text-amber-600"/>
              <span>Catatan ini menunggu verifikasi Anda. Setujui untuk menambahkan poin ke siswa, atau tolak jika terdapat kesalahan.</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Siswa",periksaSt.name],["Kelas",periksaSt.kelas],["Jenis Pelanggaran",periksaVt.name],["Kategori",periksaVt.category.charAt(0).toUpperCase()+periksaVt.category.slice(1)],["Poin",`+${periksaVt.points}`],["Tanggal",fmtDate(periksa.date)],["Dicatat oleh",periksa.officer],["Sanksi Langsung",periksa.sanksiLangsung||"—"]].map(([l,v])=>(
                <div key={l} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{l}</p>
                  <p className="font-semibold text-xs">{v}</p>
                </div>
              ))}
            </div>
            {periksa.evidence&&(
              <div className="rounded-xl overflow-hidden border border-border"><EvidencePreview evidence={periksa.evidence} className="w-full max-h-48 object-cover"/><p className="text-[10px] text-muted-foreground px-3 py-1.5 bg-muted">Bukti foto terlampir</p></div>
            )}
            <div className="flex gap-3 pt-2 border-t border-border">
              <button onClick={()=>{onVerify(periksa.id,"ditolak");setPeriksa(null);onSuccess("Catatan ditolak.");}} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-700 bg-red-50 text-sm font-semibold hover:bg-red-100 transition-colors">
                <XCircle size={14}/> Tolak
              </button>
              <button onClick={()=>{onVerify(periksa.id,"diverifikasi");setPeriksa(null);onSuccess("Catatan berhasil diverifikasi.");}} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
                <BadgeCheck size={14}/> Setujui &amp; Verifikasi
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Kurangi Poin Modal */}
      {reduceTarget&&(()=>{
        const rSt=students.find(x=>x.id===reduceTarget.studentId);
        const rVt=vts.find(x=>x.id===reduceTarget.violationTypeId);
        let rAmt=reduceTarget.pointReduction??0;
        let rNote=reduceTarget.pointReductionNote??"";
        return(
          <Modal title="Kurangi Poin Sanksi" sub={`${rSt?.name} — ${rVt?.name}`} onClose={()=>setReduceTarget(null)}>
            <div className="p-5 space-y-4">
              {/* Info poin saat ini */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {l:"Poin Pelanggaran",v:`+${rVt?.points}`,cls:"text-destructive"},
                  {l:"Poin Siswa Saat Ini",v:rSt?.totalPoints??0,cls:"text-foreground"},
                  {l:"Sudah Dikurangi",v:reduceTarget.pointReduction?`-${reduceTarget.pointReduction}`:"Belum",cls:"text-emerald-600"},
                ].map(c=>(
                  <div key={c.l} className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold tabular-nums ${c.cls}`} style={{fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{c.l}</p>
                  </div>
                ))}
              </div>
              {reduceTarget.pointReduction&&(
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0"/>
                  <p className="text-xs text-emerald-800">Poin sudah pernah dikurangi sebesar <strong>{reduceTarget.pointReduction}</strong>. Mengisi ulang akan menimpa pengurangan sebelumnya.</p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Jumlah Poin Dikurangi</label>
                  <input
                    type="number" min={1} max={rSt?.totalPoints??0}
                    defaultValue={reduceTarget.pointReduction??undefined}
                    placeholder="Masukkan jumlah poin..."
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring tabular-nums"
                    onChange={e=>{ rAmt=Math.max(1,Math.min(Number(e.target.value),rSt?.totalPoints??0)); }}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Maksimal {rSt?.totalPoints??0} poin (total poin siswa saat ini)</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Catatan Sanksi / Alasan Pengurangan</label>
                  <textarea
                    rows={2} defaultValue={reduceTarget.pointReductionNote}
                    placeholder="cth: Siswa telah menjalankan hukuman bersih-bersih selama 3 hari..."
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                    onChange={e=>{ rNote=e.target.value; }}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-border">
                <button onClick={()=>setReduceTarget(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
                <button onClick={()=>{
                  if(rAmt>0){ onReducePoints(reduceTarget.id,rAmt,rNote); onSuccess(`Poin berhasil dikurangi sebesar ${rAmt}.`); }
                  setReduceTarget(null);
                }} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={14}/> Simpan Pengurangan
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      <div className="flex items-center justify-end gap-4">
        <button onClick={()=>setModal("add")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Catat Pelanggaran</button>
      </div>

      {/* Tabs Aktif / Riwayat */}
      <div className="flex gap-1.5">
        <button onClick={()=>{setVTab("aktif");setFVerify("");}}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${vTab==="aktif"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
          <ClipboardList size={13}/> Aktif
          {aktifBase.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${vTab==="aktif"?"bg-white/20":"bg-blue-100 text-blue-700"}`}>{aktifBase.length}</span>}
        </button>
        <button onClick={()=>{setVTab("riwayat");setFDate("");}}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-2 ${vTab==="riwayat"?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>
          <CheckCircle size={13}/> Riwayat
          {riwayatBase.length>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${vTab==="riwayat"?"bg-white/20":"bg-muted text-muted-foreground"}`}>{riwayatBase.length}</span>}
        </button>
      </div>

      {/* Filter bar — berbeda tiap tab */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {vTab==="aktif"&&(
            <div className="flex gap-1.5 flex-wrap">
              {([
                {v:"",            l:"Semua",        dot:""},
                {v:"menunggu",    l:"Menunggu",     dot:"bg-amber-400"},
                {v:"diverifikasi",l:"Terverifikasi",dot:"bg-emerald-500"},
                {v:"ditolak",     l:"Ditolak",      dot:"bg-red-500"},
              ]).map(f=>{
                const isActive=fVerify===f.v;
                return(
                  <button key={f.v} onClick={()=>setFVerify(f.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${isActive?"bg-primary text-primary-foreground border-primary":"bg-background text-muted-foreground border-border hover:bg-muted/40"}`}>
                    {f.dot&&<span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.dot}`}/>}
                    {f.l}
                    {f.v==="menunggu"&&menunggu>0&&(
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${isActive?"bg-white/20":"bg-amber-100 text-amber-700"}`}>{menunggu}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {vTab==="riwayat"&&(
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Periode</span>
              <select value={fDate} onChange={e=>setFDate(e.target.value as typeof fDate)}
                className="px-3 py-2 rounded-xl border border-border bg-input-background text-xs font-semibold outline-none focus:ring-2 focus:ring-ring cursor-pointer">
                <option value="">Semua Waktu</option>
                <option value="hari_ini">Hari Ini</option>
                <option value="minggu_ini">Minggu Ini</option>
                <option value="bulan_ini">Bulan Ini</option>
              </select>
            </div>
          )}
          {(fVerify||fDate)&&(
            <button onClick={()=>{setFVerify("");setFDate("");}} className="ml-auto text-[11px] text-primary font-semibold hover:underline flex items-center gap-1 whitespace-nowrap">
              <X size={11}/> Reset
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/80 bg-primary">
                {["Siswa","Pelanggaran","Poin","Tanggal","Dicatat Oleh","Status Pencatatan","Tindak Lanjut","Aksi"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vPag.slice.map(v=>{
                const s=students.find(x=>x.id===v.studentId);
                const vt=vts.find(x=>x.id===v.violationTypeId);
                const vi=getVerifyInfo(v.verifyStatus);
                const VI=vi.icon;
                const tl=getTindakLanjut(v,vt);
                const rowBg=v.verifyStatus==="menunggu"?"bg-amber-50/40":v.verifyStatus==="ditolak"?"bg-red-50/30":"";
                return(
                  <tr key={v.id} className={`hover:bg-muted/15 transition-colors ${rowBg}`}>
                    {/* Siswa */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">{s?.name[0]}</div>
                        <div><p className="font-medium text-xs whitespace-nowrap">{s?.name}</p><p className="text-[10px] text-muted-foreground">{s?.kelas}</p></div>
                      </div>
                    </td>
                    {/* Pelanggaran */}
                    <td className="px-4 py-3.5 max-w-[150px]">
                      <p className="text-xs truncate">{vt?.name}</p>
                      <Chip cls={`${getCatCls(vt?.category||"")} mt-1`}>{vt?.category}</Chip>
                    </td>
                    {/* Poin */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-destructive tabular-nums" style={{fontFamily:"'JetBrains Mono',monospace"}}>+{vt?.points}</span>
                    </td>
                    {/* Tanggal */}
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{fmtDate(v.date)}</td>
                    {/* Dicatat oleh */}
                    <td className="px-4 py-3.5">
                      <p className="text-xs whitespace-nowrap">{v.officer}</p>
                      {v.evidence&&<span className="text-[10px] text-sky-600 flex items-center gap-1 mt-0.5"><ImageIcon size={9}/> Ada foto</span>}
                    </td>
                    {/* Status Pencatatan */}
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold ${vi.cls}`}>
                        <VI size={9}/>{vi.label}
                      </span>
                    </td>
                    {/* Tindak Lanjut */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5 items-start">
                        {vTab==="aktif"&&v.verifyStatus==="diverifikasi"&&vt?.category!=="ringan"&&v.status!=="selesai"?(
                          <select value={v.status} onChange={e=>onStatus(v.id,e.target.value as Violation["status"])}
                            className={`text-xs px-2 py-1.5 rounded-lg border font-semibold cursor-pointer outline-none ${getStatusInfo(v.status).cls}`}>
                            <option value="belum">Belum ditindaklanjuti</option>
                            <option value="proses">Sedang diproses</option>
                            <option value="selesai">Selesai</option>
                          </select>
                        ):vTab==="riwayat"?(
                          <span className="text-xs text-emerald-600 font-semibold">Selesai</span>
                        ):(
                          <span className={`text-xs ${tl.cls}`}>{tl.label}</span>
                        )}
                        {/* Kurangi Poin — tampil saat selesai & terverifikasi */}
                        {v.verifyStatus==="diverifikasi"&&v.status==="selesai"&&(
                          v.pointReduction
                            ? <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                                <CheckCircle size={9}/> -{v.pointReduction} poin
                              </span>
                            : <button onClick={()=>setReduceTarget(v)}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap">
                                <MinusCircle size={9}/> Kurangi Poin
                              </button>
                        )}
                      </div>
                    </td>
                    {/* Aksi */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <AksiCell v={v} vt={vt}/>
                        <button onClick={()=>setConfirm(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors" title="Hapus"><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length===0&&<div className="py-16 text-center text-muted-foreground text-sm">Tidak ada catatan pelanggaran</div>}
        <Pagination page={vPag.page} totalPages={vPag.totalPages} total={vPag.total} onPage={vPag.setPage}/>
      </div>
    </div>
  );
}
