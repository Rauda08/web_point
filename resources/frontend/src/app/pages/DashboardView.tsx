import { CheckCircle, Flag, ShieldAlert, Users } from "lucide-react";
import type { Student, Violation, ViolationType } from "@/app/types";
import { compareNewest, fmtDate, getSanction, getVerifyInfo, isActiveStudent } from "@/app/lib/helpers";
import { Chip } from "@/app/components/shared/Chip";

export function DashboardView({ students, violations, vts }: {
  students: Student[]; violations: Violation[]; vts: ViolationType[];
}) {
  // Dashboard operasional hanya menampilkan siswa aktif.
  // Gunakan helper agar data lama yang belum memiliki field status tetap terbaca.
  const activeStudents = students.filter(isActiveStudent);
  const activeStudentIds = new Set(activeStudents.map(s=>s.id));
  const activeViolations = violations.filter(v=>activeStudentIds.has(v.studentId));

  const pending    = activeViolations.filter(v=>v.status==="belum").length;
  const menunggu   = activeViolations.filter(v=>v.verifyStatus==="menunggu").length;

  // Sebelumnya salah memakai batas 150, sehingga siswa berpoin 50–149 tidak masuk.
  const needAction = activeStudents
    .filter(s=>s.totalPoints>=50)
    .sort((a,b)=>b.totalPoints-a.totalPoints)
    .slice(0,5);

  const recent = [...activeViolations]
    .sort(compareNewest)
    .slice(0,5);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[{label:"Total Siswa",val:activeStudents.length,sub:"aktif terdaftar",I:Users,clr:"#2d6a4f",bg:"bg-emerald-50"},{label:"Perlu Verifikasi",val:menunggu,sub:"dari guru piket",I:ShieldAlert,clr:"#b8860b",bg:"bg-amber-50"},{label:"Perlu Tindakan",val:needAction.length,sub:"poin ≥ 50",I:Flag,clr:"#c0392b",bg:"bg-red-50"}].map(c=>(
          <div key={c.label} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between mb-3"><div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}><c.I size={17} style={{color:c.clr}}/></div><p className="text-2xl font-bold tabular-nums" style={{fontFamily:"'JetBrains Mono',monospace"}}>{c.val}</p></div>
            <p className="text-xs font-semibold">{c.label}</p><p className="text-[11px] text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col" style={{maxHeight:"420px"}}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0"><p className="text-sm font-semibold">Pelanggaran Terbaru</p><span className="text-xs text-muted-foreground">{recent.length} catatan</span></div>
          <div className="divide-y divide-border overflow-y-auto" style={{scrollbarWidth:"thin",scrollbarColor:"var(--border) transparent"}}>
            {recent.map(v=>{const s=students.find(x=>x.id===v.studentId);const vt=vts.find(x=>x.id===v.violationTypeId);const vi=getVerifyInfo(v.verifyStatus);const VI=vi.icon;return(
              <div key={v.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/15">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">{s?.name[0]}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{s?.name}</p><p className="text-[11px] text-muted-foreground">{vt?.name} · {fmtDate(v.date)}</p></div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-destructive">+{vt?.points}</p>
                  <span className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${vi.cls}`}><VI size={9}/>{vi.label}</span>
                </div>
              </div>
            );})}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col" style={{maxHeight:"420px"}}>
          <div className="px-5 py-4 border-b border-border flex-shrink-0"><p className="text-sm font-semibold">Siswa Perlu Perhatian</p><p className="text-xs text-muted-foreground">Poin ≥ 50</p></div>
          {needAction.length===0?<div className="py-10 text-center text-sm text-muted-foreground"><CheckCircle size={24} className="mx-auto mb-2 text-emerald-400"/>Tidak ada siswa bermasalah</div>:(
            <div className="divide-y divide-border overflow-y-auto" style={{scrollbarWidth:"thin",scrollbarColor:"var(--border) transparent"}}>
              {needAction.map(s=>{const sanct=getSanction(s.totalPoints);return(
                <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/15">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">{s.name[0]}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold">{s.name}</p><p className="text-[11px] text-muted-foreground">{s.kelas}</p></div>
                  <div className="text-right flex-shrink-0"><p className="text-sm font-bold tabular-nums" style={{color:sanct.bar,fontFamily:"'JetBrains Mono',monospace"}}>{s.totalPoints}</p><Chip cls={`${sanct.bg} ${sanct.text} ${sanct.border} text-[10px]`}>{sanct.label}</Chip></div>
                </div>
              );})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
