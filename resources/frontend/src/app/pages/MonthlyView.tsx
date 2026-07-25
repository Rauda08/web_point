import { useMemo, useState } from "react";
import { AlertTriangle, BookMarked, ChevronLeft, ChevronRight, PhoneCall, Plus, Printer, Users } from "lucide-react";
import type { GuidanceEntry, ParentSummon, Student, Violation, ViolationType } from "@/app/types";
import { MONTH_NAMES, compareNewest, fmtDate, getSummonStatus, isActiveStudent } from "@/app/lib/helpers";
import { pdfMonthly } from "@/app/lib/pdf";
import { Chip } from "@/app/components/shared/Chip";

export function MonthlyView({ students, violations, vts, guidance, summons, embedded }: {
  students: Student[]; violations: Violation[]; vts: ViolationType[];
  guidance: GuidanceEntry[]; summons: ParentSummon[]; embedded?: boolean;
}) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const monthKey   = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const prevMonth  = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth  = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const activeStudents = useMemo(
    ()=>students.filter(isActiveStudent),
    [students]
  );
  const activeStudentIds = useMemo(
    ()=>new Set(activeStudents.map(s=>s.id)),
    [activeStudents]
  );
  const activeViolations = useMemo(
    ()=>violations.filter(v=>activeStudentIds.has(v.studentId)),
    [violations,activeStudentIds]
  );
  const activeGuidance = useMemo(
    ()=>guidance.filter(g=>activeStudentIds.has(g.studentId)),
    [guidance,activeStudentIds]
  );
  const activeSummons = useMemo(
    ()=>summons.filter(s=>activeStudentIds.has(s.studentId)),
    [summons,activeStudentIds]
  );

  const mv = useMemo(
    ()=>activeViolations.filter(v=>v.date.startsWith(monthKey)).sort(compareNewest),
    [activeViolations,monthKey]
  );
  const mg = useMemo(
    ()=>activeGuidance.filter(g=>g.date.startsWith(monthKey)).sort(compareNewest),
    [activeGuidance,monthKey]
  );
  const ms = useMemo(
    ()=>activeSummons.filter(s=>s.date.startsWith(monthKey)).sort(compareNewest),
    [activeSummons,monthKey]
  );

  const catCount = useMemo(()=>{
    const c={ringan:0,sedang:0,berat:0};
    mv.forEach(v=>{const vt=vts.find(x=>x.id===v.violationTypeId);if(vt)c[vt.category]++;});
    return c;
  },[mv,vts]);

  // build all months with data for the year
  const monthsWithData = useMemo(()=>{
    return Array.from({length:12},(_,i)=>{
      const k=`${year}-${String(i+1).padStart(2,"0")}`;
      return {
        idx:i,
        label:MONTH_NAMES[i].slice(0,3),
        v:activeViolations.filter(x=>x.date.startsWith(k)).length,
      };
    });
  },[activeViolations,year]);

  return (
    <div className={embedded ? "space-y-5" : "p-6 space-y-6"}>
      {/* Header + nav */}
      {!embedded && (
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Ringkasan Bulanan</h1>
          <p className="text-sm text-muted-foreground">Rekap pelanggaran, bimbingan, dan panggilan orang tua per bulan</p>
        </div>
        <button onClick={()=>void pdfMonthly(monthLabel,monthKey,violations,students,vts,guidance,summons)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Printer size={14}/> Cetak Laporan Bulan Ini
        </button>
      </div>
      )}
      {embedded && (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Ringkasan Bulanan</p>
          <p className="text-xs text-muted-foreground">Rekap pelanggaran, bimbingan, dan panggilan orang tua per bulan</p>
        </div>
        <button onClick={()=>void pdfMonthly(monthLabel,monthKey,violations,students,vts,guidance,summons)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Printer size={12}/> Cetak Bulan Ini
        </button>
      </div>
      )}

      {/* Month selector */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={()=>setYear(y=>y-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg"><ChevronLeft size={12}/> {year-1}</button>
          <p className="text-sm font-semibold">{year}</p>
          <button onClick={()=>setYear(y=>y+1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg">{year+1} <ChevronRight size={12}/></button>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
          {monthsWithData.map(m=>(
            <button key={m.idx} onClick={()=>setMonth(m.idx)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-all border ${month===m.idx?"bg-primary text-primary-foreground border-primary shadow-sm":"bg-background border-border hover:border-primary/40 hover:bg-primary/5"}`}>
              <span className="text-[10px] font-semibold">{m.label}</span>
              <span className={`text-base font-bold tabular-nums mt-0.5 ${month===m.idx?"text-primary-foreground":"text-foreground"}`} style={{fontFamily:"'JetBrains Mono',monospace"}}>{m.v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {l:"Total Pelanggaran",v:mv.length,I:AlertTriangle,clr:"text-red-500 bg-red-50"},
          {l:"Siswa Terlibat",v:[...new Set(mv.map(v=>v.studentId))].length,I:Users,clr:"text-amber-600 bg-amber-50"},
          {l:"Sesi Bimbingan",v:mg.length,I:BookMarked,clr:"text-purple-600 bg-purple-50"},
          {l:"Panggilan Orang Tua",v:ms.length,I:PhoneCall,clr:"text-sky-600 bg-sky-50"},
        ].map(c=>(
          <div key={c.l} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${c.clr} rounded-xl flex items-center justify-center`}><c.I size={17}/></div>
              <p className="text-2xl font-bold tabular-nums" style={{fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</p>
            </div>
            <p className="text-xs font-semibold">{c.l}</p>
            <p className="text-[10px] text-muted-foreground">{monthLabel}</p>
          </div>
        ))}
      </div>

      {/* Category + verifikasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {cat:"Ringan",v:catCount.ringan,color:"#2980b9",bg:"bg-sky-50",text:"text-sky-700",border:"border-sky-200"},
          {cat:"Sedang",v:catCount.sedang,color:"#b8860b",bg:"bg-amber-50",text:"text-amber-700",border:"border-amber-200"},
          {cat:"Berat", v:catCount.berat, color:"#c0392b",bg:"bg-red-50", text:"text-red-700", border:"border-red-200"},
        ].map(c=>(
          <div key={c.cat} className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
            <div className="flex items-start justify-between mb-2">
              <div><p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>Pelanggaran {c.cat}</p><p className="text-3xl font-bold tabular-nums mt-1" style={{color:c.color,fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</p></div>
              <div className="h-10 w-1.5 rounded-full" style={{background:c.color,opacity:0.3}}/>
            </div>
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-3">
              <div className="h-full rounded-full" style={{width:mv.length?`${(c.v/mv.length)*100}%`:"0%",background:c.color}}/>
            </div>
            <p className={`text-[10px] mt-1.5 ${c.text} opacity-70`}>{mv.length?Math.round((c.v/mv.length)*100):0}% dari total bulan ini</p>
          </div>
        ))}
      </div>

      {/* Guidance this month */}
      {mg.length>0&&(
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">Jurnal Bimbingan — {monthLabel}</p>
            <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">{mg.length} sesi</span>
          </div>
          <div className="divide-y divide-border">
            {mg.map(g=>{const s=activeStudents.find(x=>x.id===g.studentId);const sc:{[k:string]:{cls:string;label:string}}={dijadwalkan:{cls:"bg-purple-50 text-purple-700 border-purple-200",label:"Dijadwalkan"},berlangsung:{cls:"bg-amber-50 text-amber-700 border-amber-200",label:"Berlangsung"},selesai:{cls:"bg-emerald-50 text-emerald-700 border-emerald-200",label:"Selesai"}};return(
              <div key={g.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0"><BookMarked size={14} className="text-purple-600"/></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{g.topic}</p><p className="text-xs text-muted-foreground">{s?.name} · {s?.kelas} · {fmtDate(g.date)} · {g.officer}</p></div>
                <Chip cls={`${sc[g.status].cls} text-[10px] flex-shrink-0`}>{sc[g.status].label}</Chip>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* Summons this month */}
      {ms.length>0&&(
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">Panggilan Orang Tua — {monthLabel}</p>
            <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">{ms.length} surat</span>
          </div>
          <div className="divide-y divide-border">
            {ms.map(sp=>{const s=activeStudents.find(x=>x.id===sp.studentId);const sc=getSummonStatus(sp.status);return(
              <div key={sp.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0"><PhoneCall size={14} className="text-blue-600"/></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{s?.name} <span className="text-muted-foreground font-normal">· {s?.kelas}</span></p><p className="text-xs text-muted-foreground">{sp.reason.slice(0,60)}{sp.reason.length>60?"...":""}</p><p className="text-xs text-muted-foreground mt-0.5">Jadwal: {fmtDate(sp.scheduledDate)} · {sp.location}</p></div>
                <Chip cls={`${sc.cls} text-[10px] flex-shrink-0`}>{sc.label}</Chip>
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
}
