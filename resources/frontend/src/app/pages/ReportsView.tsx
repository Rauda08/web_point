import { useState } from "react";
import { Calendar, Download, GraduationCap, Tag } from "lucide-react";
import type { GuidanceEntry, ParentSummon, Student, Violation, ViolationType } from "@/app/types";
import { getSanction, isActiveStudent, todayStr } from "@/app/lib/helpers";
import { pdfCategory, pdfClass, pdfPeriod } from "@/app/lib/pdf";
import { Chip } from "@/app/components/shared/Chip";
import { FSelect } from "@/app/components/shared/FormFields";
import { MonthlyView } from "@/app/pages/MonthlyView";

export function ReportsView({ students, violations, vts, guidance, summons }: { students:Student[]; violations:Violation[]; vts:ViolationType[]; guidance:GuidanceEntry[]; summons:ParentSummon[] }) {
  const [selKelas,setSelKelas]=useState("");
  const [from,setFrom]=useState(todayStr().slice(0,7)+"-01"); const [to,setTo]=useState(todayStr());
  const activeStudents = students.filter(isActiveStudent);
  const activeIds = new Set(activeStudents.map(s=>s.id));
  const activeViolations = violations.filter(v=>activeIds.has(v.studentId));
  const activeGuidance = guidance.filter(g=>activeIds.has(g.studentId));
  const activeSummons = summons.filter(s=>activeIds.has(s.studentId));

  const classes=[...new Set(activeStudents.map(s=>s.kelas))].sort();
  const periodCount=activeViolations.filter(v=>v.date>=from&&v.date<=to).length;

  // Daftar poin tertinggi hanya mengambil siswa aktif, bukan alumni.
  const top=[...activeStudents]
    .sort((a,b)=>b.totalPoints-a.totalPoints)
    .slice(0,7);
  const cards=[
    {icon:GraduationCap,iconCls:"text-sky-600 bg-sky-50",title:"Per Kelas",desc:"Rekap siswa aktif dalam satu kelas",body:<><FSelect value={selKelas} onChange={e=>setSelKelas(e.target.value)}><option value="">Pilih kelas...</option>{classes.map(k=><option key={k}>{k}</option>)}</FSelect><button disabled={!selKelas} onClick={()=>void pdfClass(selKelas,activeStudents,activeViolations,vts)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-40 mt-3"><Download size={14}/> Cetak PDF</button></>},
    {icon:Calendar,iconCls:"text-amber-600 bg-amber-50",title:"Per Periode",desc:"Filter berdasarkan rentang tanggal",body:<><div className="grid grid-cols-2 gap-2 mb-3"><div><label className="text-xs text-muted-foreground mb-1 block">Dari</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring"/></div><div><label className="text-xs text-muted-foreground mb-1 block">Sampai</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring"/></div></div><button onClick={()=>void pdfPeriod(from,to,activeViolations,activeStudents,vts)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"><Download size={14}/> Cetak ({periodCount})</button></>},
    {icon:Tag,iconCls:"text-purple-600 bg-purple-50",title:"Per Kategori",desc:"Rekap per kategori pelanggaran",body:<><p className="text-xs text-muted-foreground mb-3">Mencakup pelanggaran ringan, sedang, dan berat milik siswa aktif.</p><button onClick={()=>void pdfCategory(activeViolations,vts,activeStudents)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"><Download size={14}/> Cetak PDF</button></>},
  ];
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <MonthlyView students={activeStudents} violations={activeViolations} vts={vts} guidance={activeGuidance} summons={activeSummons} embedded/>
      <div className="pt-2 border-t border-border"><p className="text-sm font-semibold mb-4">Cetak Laporan</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map(card=>(
          <div key={card.title} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start gap-3 mb-4"><div className={`w-10 h-10 ${card.iconCls} rounded-xl flex items-center justify-center flex-shrink-0`}><card.icon size={17}/></div><div><p className="text-sm font-semibold">{card.title}</p><p className="text-xs text-muted-foreground">{card.desc}</p></div></div>
            {card.body}
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-5"><p className="text-sm font-semibold">Siswa dengan Poin Tertinggi</p><button onClick={()=>void pdfCategory(activeViolations,vts,activeStudents)} className="flex items-center gap-2 text-xs border border-border px-3.5 py-1.5 rounded-lg hover:bg-muted/40 font-medium"><Download size={11}/> Ekspor Semua</button></div>
        <div className="space-y-4">
          {top.length===0&&(
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada siswa aktif dengan catatan poin.
            </div>
          )}
          {top.map((s,i)=>{const sanct=getSanction(s.totalPoints);return(
            <div key={s.id} className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-4 text-right flex-shrink-0">{i+1}</span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">{s.name[0]}</div>
              <div className="flex-1"><div className="flex items-center justify-between mb-1.5"><div><span className="text-sm font-medium">{s.name}</span><span className="text-xs text-muted-foreground ml-2">{s.kelas}</span></div><div className="flex items-center gap-2"><Chip cls={`${sanct.bg} ${sanct.text} ${sanct.border} text-[10px]`}>{sanct.label}</Chip><span className="text-sm font-bold tabular-nums w-8 text-right" style={{fontFamily:"'JetBrains Mono',monospace"}}>{s.totalPoints}</span></div></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${Math.min((s.totalPoints/100)*100,100)}%`,backgroundColor:sanct.bar}}/></div></div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}
