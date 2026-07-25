import { useState } from "react";
import { Edit2, Send, XCircle } from "lucide-react";
import type { AppUser, Student, Violation, ViolationType } from "@/app/types";
import { compareNewest, fmtDate, fmtTime, getVerifyInfo, isActiveStudent } from "@/app/lib/helpers";
import { EvidencePreview } from "@/app/components/shared/Evidence";

export function PiketCasesList({ violations, students, vts, currentUser, onEdit, onSend }: {
  violations: Violation[]; students: Student[]; vts: ViolationType[]; currentUser: AppUser;
  onEdit:(v:Violation)=>void; onSend:(id:string)=>void;
}) {
  const activeStudents = students.filter(isActiveStudent);
  const myCases = [...violations.filter(v=>v.officerId===currentUser.id)].sort(compareNewest);
  const [fVs, setFVs] = useState("");
  const filtered = myCases.filter(v=>!fVs||v.verifyStatus===fVs);
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex gap-2 flex-wrap">
        {[{v:"",l:`Semua (${myCases.length})`},{v:"draft",l:`Draft (${myCases.filter(x=>x.verifyStatus==="draft").length})`},{v:"menunggu",l:`Menunggu (${myCases.filter(x=>x.verifyStatus==="menunggu").length})`},{v:"diverifikasi",l:`Diverifikasi (${myCases.filter(x=>x.verifyStatus==="diverifikasi").length})`},{v:"ditolak",l:`Ditolak (${myCases.filter(x=>x.verifyStatus==="ditolak").length})`}].map(f=>(
          <button key={f.v} onClick={()=>setFVs(f.v)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${fVs===f.v?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>{f.l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length===0&&<div className="py-16 text-center bg-card rounded-2xl border border-border text-muted-foreground text-sm">Tidak ada kasus</div>}
        {filtered.map(v=>{const s=activeStudents.find(x=>x.id===v.studentId)??students.find(x=>x.id===v.studentId);const vt=vts.find(x=>x.id===v.violationTypeId);const vi=getVerifyInfo(v.verifyStatus);const VI=vi.icon;const canEdit=v.verifyStatus==="draft"||v.verifyStatus==="ditolak";return(
          <div key={v.id} className={`bg-card rounded-2xl border overflow-hidden shadow-sm ${v.verifyStatus==="ditolak"?"border-red-200":v.verifyStatus==="diverifikasi"?"border-emerald-100":"border-border"}`}>
            <div className={`h-1 ${v.verifyStatus==="ditolak"?"bg-red-400":v.verifyStatus==="diverifikasi"?"bg-emerald-400":v.verifyStatus==="menunggu"?"bg-amber-400":"bg-gray-200"}`}/>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold flex-shrink-0">{s?.name[0]}</div>
                  <div><p className="font-semibold text-sm">{s?.name}</p><p className="text-xs text-muted-foreground">{s?.kelas} · {fmtDate(v.date)} {fmtTime(v.time)} · {v.location}</p></div>
                </div>
                <span className={`text-[10px] flex items-center gap-1 px-2.5 py-1 rounded-full border ${vi.cls} flex-shrink-0`}><VI size={10}/> {vi.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div><p className="text-muted-foreground">Jenis Pelanggaran</p><p className="font-medium mt-0.5">{vt?.name}</p></div>
                <div><p className="text-muted-foreground">Poin</p><p className="font-bold text-destructive mt-0.5" style={{fontFamily:"'JetBrains Mono',monospace"}}>+{vt?.points}</p></div>
                {v.sanksiLangsung&&<div className="col-span-2"><p className="text-muted-foreground">Sanksi Langsung</p><p className="font-medium mt-0.5">{v.sanksiLangsung}</p></div>}
              </div>
              {v.evidence&&<div className="mb-3 rounded-xl overflow-hidden border border-border"><EvidencePreview evidence={v.evidence} className="w-full max-h-36 object-cover"/></div>}
              {v.verifyStatus==="ditolak"&&<div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700"><XCircle size={11} className="inline mr-1.5"/>Catatan ditolak — perbaiki dan kirim ulang</div>}
              <div className="flex gap-2 justify-end">
                {canEdit&&<button onClick={()=>onEdit(v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/40 font-medium"><Edit2 size={11}/> Edit</button>}
                {v.verifyStatus==="draft"&&<button onClick={()=>onSend(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"><Send size={11}/> Kirim Verifikasi</button>}
                {v.verifyStatus==="ditolak"&&<button onClick={()=>onSend(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"><Send size={11}/> Kirim Ulang</button>}
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}
