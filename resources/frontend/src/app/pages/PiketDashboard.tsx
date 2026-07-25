import { BadgeCheck, ClipboardList, Clock, XCircle } from "lucide-react";
import type { AppUser, Student, Violation, ViolationType } from "@/app/types";
import { compareNewest, fmtDate, getVerifyInfo, isActiveStudent } from "@/app/lib/helpers";

export function PiketDashboard({ violations, students, vts, currentUser }: {
  violations: Violation[]; students: Student[]; vts: ViolationType[]; currentUser: AppUser;
}) {
  const activeStudents = students.filter(isActiveStudent);
  const myCases = violations.filter(v=>v.officerId===currentUser.id);
  const draft    = myCases.filter(v=>v.verifyStatus==="draft").length;
  const menunggu = myCases.filter(v=>v.verifyStatus==="menunggu").length;
  const diverif  = myCases.filter(v=>v.verifyStatus==="diverifikasi").length;
  const ditolak  = myCases.filter(v=>v.verifyStatus==="ditolak").length;
  const recent   = [...myCases].sort(compareNewest).slice(0,5);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {l:"Total Kasus Saya",v:myCases.length,I:ClipboardList,clr:"text-primary bg-primary/10"},
          {l:"Menunggu Verifikasi",v:menunggu,I:Clock,clr:"text-amber-600 bg-amber-50"},
          {l:"Sudah Diverifikasi",v:diverif,I:BadgeCheck,clr:"text-emerald-600 bg-emerald-50"},
          {l:"Ditolak Admin",v:ditolak,I:XCircle,clr:"text-red-500 bg-red-50"},
        ].map(c=>(
          <div key={c.l} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${c.clr} rounded-xl flex items-center justify-center`}><c.I size={17}/></div>
              <p className="text-2xl font-bold tabular-nums" style={{fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</p>
            </div>
            <p className="text-xs font-semibold">{c.l}</p>
          </div>
        ))}
      </div>
      {ditolak>0&&(
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
          <div><p className="text-xs font-semibold text-red-800">{ditolak} catatan ditolak oleh admin</p><p className="text-[10px] text-red-600">Periksa di halaman "Kasus Saya" dan lakukan perbaikan.</p></div>
        </div>
      )}
      {draft>0&&(
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
          <div><p className="text-xs font-semibold text-amber-800">{draft} catatan masih berstatus draft</p><p className="text-[10px] text-amber-600">Segera kirim untuk diverifikasi admin.</p></div>
        </div>
      )}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><p className="text-sm font-semibold">Kasus Terbaru Saya</p></div>
        {recent.length===0?<div className="py-12 text-center text-muted-foreground text-sm">Belum ada catatan</div>:(
          <div className="divide-y divide-border">
            {recent.map(v=>{const s=activeStudents.find(x=>x.id===v.studentId)??students.find(x=>x.id===v.studentId);const vt=vts.find(x=>x.id===v.violationTypeId);const vi=getVerifyInfo(v.verifyStatus);const VI=vi.icon;return(
              <div key={v.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">{s?.name[0]}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{s?.name} — {vt?.name}</p><p className="text-[11px] text-muted-foreground">{fmtDate(v.date)} · {v.location}</p></div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <VI size={12} className={vi.cls.includes("emerald")?"text-emerald-600":vi.cls.includes("amber")?"text-amber-600":vi.cls.includes("red")?"text-red-500":"text-gray-400"}/>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${vi.cls}`}>{vi.label}</span>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}
