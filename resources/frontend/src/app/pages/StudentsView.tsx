import { useRef, useState } from "react";
import {
  AlertTriangle, BookMarked, CheckCircle, Clock, Download, Edit2, Eye, FileText,
  GraduationCap, MinusCircle, Plus, Printer, Search, Shield, Trash2, X,
} from "lucide-react";
import type { GuidanceEntry, Student, Violation, ViolationType } from "@/app/types";
import {
  compareNewest, fmtDate, fmtTime, genId, getCatCls, getSanction, getVerifyInfo, isActiveStudent,
} from "@/app/lib/helpers";
import { pdfStudent, pdfWarning } from "@/app/lib/pdf";
import { Chip } from "@/app/components/shared/Chip";
import { Confirm, Modal } from "@/app/components/shared/Modal";
import { Pagination, usePagination } from "@/app/components/shared/Pagination";
import { StudentModal } from "@/app/components/modals/StudentModal";

export function StudentsView({ students, violations, vts, guidance, onAdd, onEdit, onDel, onPromote, onReduceStudentPoints, onSuccess }: {
  students: Student[]; violations: Violation[]; vts: ViolationType[]; guidance: GuidanceEntry[];
  onAdd:(s:Student)=>void; onEdit:(s:Student)=>void; onDel:(id:string)=>void;
  onPromote:()=>Promise<boolean>;
  onReduceStudentPoints:(studentId:string,amount:number,note:string)=>Promise<boolean>;
  onSuccess:(m:string)=>void;
}) {
  const [q,setQ]=useState(""); const [fKelas,setFKelas]=useState("");
  const [tab,setTab]=useState<"aktif"|"alumni">("aktif");
  const [modal,setModal]=useState<null|"add"|{mode:"edit"|"view";s:Student}>(null);
  const [confirm,setConfirm]=useState<null|Student>(null);
  const [reduceStudent,setReduceStudent]=useState<Student|null>(null);
  const [reduceAmount,setReduceAmount]=useState("");
  const [reduceNote,setReduceNote]=useState("");
  const [reduceError,setReduceError]=useState("");
  const [reducing,setReducing]=useState(false);
  const [showPromote,setShowPromote]=useState(false);
  const [importRows,setImportRows]=useState<Student[]|null>(null);
  const [importErr,setImportErr]=useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    import("xlsx").then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ["NIS","Nama Lengkap","Kelas","Jenis Kelamin (L/P)","Nama Orang Tua","No. HP Orang Tua"],
        ["12345","Contoh Siswa","X IPA 1","L","Bpk. Contoh","08123456789"],
      ]);
      ws["!cols"] = [{wch:12},{wch:28},{wch:12},{wch:20},{wch:28},{wch:20}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
      XLSX.writeFile(wb, "template_data_siswa.xlsx");
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileRef.current) return;
    fileRef.current.value = "";
    if (!file) return;
    setImportErr("");
    const reader = new FileReader();
    reader.onload = ev => {
      import("xlsx").then(XLSX => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string,string>>(ws, { defval: "" });
          if (rows.length === 0) { setImportErr("File kosong atau format tidak sesuai."); return; }
          const parsed: Student[] = rows.map((r, i) => {
            const nis        = String(r["NIS"] || r["nis"] || "").trim();
            const name       = String(r["Nama Lengkap"] || r["Nama"] || r["nama"] || "").trim();
            const kelas      = String(r["Kelas"] || r["kelas"] || "").trim();
            const gender     = String(r["Jenis Kelamin (L/P)"] || r["Jenis Kelamin"] || r["L/P"] || "").trim().toUpperCase();
            const parentName  = String(r["Nama Orang Tua"] || r["Orang Tua"] || "").trim();
            const parentPhone = String(r["No. HP Orang Tua"] || r["No HP"] || r["HP"] || "").trim();
            if (!nis || !name || !kelas) throw new Error(`Baris ${i+2}: kolom NIS, Nama, atau Kelas kosong.`);
            return { id: genId(), nis, name, kelas, gender: (gender === "P" ? "P" : "L") as "L"|"P", parentName, parentPhone, totalPoints: 0 };
          });
          const existingNis = students.map(s=>s.nis);
          const dupes = parsed.filter(s=>existingNis.includes(s.nis));
          if (dupes.length > 0) {
            setImportErr(`NIS sudah terdaftar: ${dupes.map(s=>s.nis).join(", ")} — baris ini dilewati.`);
          }
          const unique = parsed.filter(s=>!existingNis.includes(s.nis));
          if (unique.length === 0) { setImportErr("Semua NIS pada file sudah terdaftar, tidak ada data baru."); return; }
          setImportRows(unique);
        } catch(err) {
          setImportErr(err instanceof Error ? err.message : "Gagal membaca file.");
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }

  function confirmImport() {
    if (!importRows) return;
    importRows.forEach(s => onAdd(s));
    setImportRows(null);
    onSuccess(`${importRows.length} data siswa berhasil diimpor.`);
  }
  const active  = students.filter(s=>!s.archived).sort(compareNewest);
  const alumni  = students.filter(s=>s.archived).sort(compareNewest);
  const pool    = tab==="aktif" ? active : alumni;
  const classes = [...new Set(active.map(s=>s.kelas))].sort();
  const filtered = pool.filter(s=>(!q||s.name.toLowerCase().includes(q.toLowerCase())||s.nis.includes(q))&&(!fKelas||s.kelas===fKelas));
  const sPag = usePagination(filtered, `${q}${fKelas}${tab}`);

  // Promote preview counts
  const willLulus   = active.filter(s=>s.kelas.startsWith("XII")).length;
  const willNaik    = active.filter(s=>!s.kelas.startsWith("XII")).length;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>

      {/* Import preview modal */}
      {importRows&&(
        <Modal title="Konfirmasi Import Data Siswa" onClose={()=>setImportRows(null)} wide>
          <div className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-600 flex-shrink-0"/>
              <span>Ditemukan <strong>{importRows.length} siswa</strong> siap diimpor. Periksa data sebelum menyimpan.</span>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-primary">
                  <tr>{["NIS","Nama","Kelas","L/P","Nama Ortu"].map(h=><th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importRows.map((s,i)=>(
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono">{s.nis}</td>
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2">{s.kelas}</td>
                      <td className="px-3 py-2">{s.gender}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.parentName||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 pt-2 border-t border-border">
              <button onClick={()=>setImportRows(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
              <button onClick={confirmImport} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
                Simpan {importRows.length} Siswa
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Naik Kelas Massal modal */}
      {showPromote&&(
        <Modal title="Naik Kelas Massal" onClose={()=>setShowPromote(false)}>
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5"/>
              <span>Proses ini tidak dapat dibatalkan. Pastikan data sudah benar sebelum melanjutkan.</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary tabular-nums" style={{fontFamily:"'JetBrains Mono',monospace"}}>{willNaik}</p>
                <p className="text-xs font-semibold text-primary/80 mt-1">Siswa Naik Kelas</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">X→XI dan XI→XII</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-700 tabular-nums" style={{fontFamily:"'JetBrains Mono',monospace"}}>{willLulus}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">Siswa Lulus</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">XII → Arsip Alumni</p>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 bg-muted/30 rounded-xl p-4">
              <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-500 flex-shrink-0"/> Siswa <strong>X</strong> naik ke <strong>XI</strong> dengan nama/nomor kelas tetap</li>
              <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-500 flex-shrink-0"/> Siswa <strong>XI</strong> naik ke <strong>XII</strong> dengan nama/nomor kelas tetap</li>
              <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-500 flex-shrink-0"/> Siswa <strong>XII</strong> dipindah ke tab Arsip Alumni (lulus)</li>
              <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-500 flex-shrink-0"/> Riwayat dan poin pelanggaran tetap tersimpan</li>
            </ul>
            <div className="flex gap-3 pt-2 border-t border-border">
              <button onClick={()=>setShowPromote(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
              <button
                onClick={async()=>{
                  const success = await onPromote();
                  if (success) {
                    setShowPromote(false);
                    setTab("aktif");
                  }
                }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90"
              >
                Ya, Proses Naik Kelas
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal==="add"&&<StudentModal existingNis={students.map(s=>s.nis)} onSave={s=>{onAdd(s);setModal(null);onSuccess("Data siswa berhasil ditambahkan.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&modal.mode==="edit"&&<StudentModal init={modal.s} existingNis={students.map(s=>s.nis)} onSave={s=>{onEdit(s);setModal(null);onSuccess("Data siswa berhasil diperbarui.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&modal.mode==="view"&&(()=>{const s=modal.s;const sv=violations.filter(v=>v.studentId===s.id).sort(compareNewest);const reductions=sv.filter(v=>Number(v.pointReduction??0)>0).sort(compareNewest);const reductionHistory=Object.values(reductions.reduce((groups,v)=>{const title=v.pointReductionNote?.trim()||"Pengurangan poin siswa";const changedAt=v.updatedAt||v.createdAt||v.date;const minuteKey=String(changedAt||"").slice(0,16);const key=`${title.toLowerCase()}|${minuteKey}`;const amount=Number(v.pointReduction??0);if(!groups[key])groups[key]={key,title,amount:0,changedAt:String(changedAt||v.date)};groups[key].amount+=amount;return groups;},{} as Record<string,{key:string;title:string;amount:number;changedAt:string}>)).sort((a,b)=>b.changedAt.localeCompare(a.changedAt));const totalReduction=reductionHistory.reduce((sum,item)=>sum+item.amount,0);const sg=guidance.filter(g=>g.studentId===s.id).sort(compareNewest);const sanct=getSanction(s.totalPoints);return(
        <Modal title="Detail Siswa" sub={`${s.name} — NIS ${s.nis}`} onClose={()=>setModal(null)} wide>
          <div className="p-5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl">{s.name[0]}</div>
              <div className="flex-1">
                <h3 className="font-bold text-base">{s.name}</h3>
                <p className="text-sm text-muted-foreground">{s.kelas} · NIS {s.nis} · {s.gender==="L"?"Laki-laki":"Perempuan"}</p>
                <p className="text-sm text-muted-foreground">{s.parentName} · {s.parentPhone}</p>
                <div className="flex items-center gap-3 mt-2"><span className="text-2xl font-bold tabular-nums" style={{color:sanct.bar,fontFamily:"'JetBrains Mono',monospace"}}>{s.totalPoints}</span><span className="text-xs text-muted-foreground">poin</span><Chip cls={`${sanct.bg} ${sanct.text} ${sanct.border}`}><Shield size={10}/> {sanct.label}</Chip></div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2 w-48"><div className="h-full rounded-full" style={{width:`${Math.min((s.totalPoints/100)*100,100)}%`,backgroundColor:sanct.bar}}/></div>
              </div>
              {isActiveStudent(s)&&(
                <div className="flex flex-col gap-2">
                  <button onClick={()=>void pdfStudent(s,violations,vts)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/40 font-medium"><Download size={11}/> PDF</button>
                  <button onClick={()=>void pdfWarning(s,violations,vts,s.totalPoints<=49?1:2)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-amber-200 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-medium"><Printer size={11}/> SP</button>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Riwayat Pelanggaran ({sv.length})</p>
              {sv.length===0?<p className="text-sm text-muted-foreground py-4 text-center">Belum ada catatan</p>:(
                <div className="space-y-2">
                  {sv.map(v=>{const vt=vts.find(x=>x.id===v.violationTypeId);const vi=getVerifyInfo(v.verifyStatus);return(
                    <div key={v.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/50">
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium">{vt?.name}</p><p className="text-xs text-muted-foreground">{fmtDate(v.date)} · {v.location} · {v.officer}</p>
                      <div className="flex flex-wrap gap-2 mt-1"><Chip cls={getCatCls(vt?.category||"")}>{vt?.category}</Chip><span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${vi.cls}`}>{vi.label}</span></div></div>
                      <p className="text-sm font-bold text-destructive flex-shrink-0">+{vt?.points}</p>
                    </div>
                  );})}
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Riwayat Pengurangan Poin ({reductionHistory.length})
                </p>
                {totalReduction>0&&(
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    Total dikurangi {totalReduction} poin
                  </span>
                )}
              </div>

              {reductionHistory.length===0?(
                <div className="py-5 text-center rounded-xl border border-dashed border-border bg-muted/20">
                  <MinusCircle size={20} className="mx-auto mb-2 text-muted-foreground/40"/>
                  <p className="text-sm text-muted-foreground">Belum ada pengurangan poin</p>
                </div>
              ):(
                <div className="space-y-2">
                  {reductionHistory.map(item=>(
                    <div key={item.key} className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/45">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground leading-relaxed">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {fmtDate(item.changedAt)}
                                {fmtTime(item.changedAt)&&<> · {fmtTime(item.changedAt)}</>}
                                {" · "}
                                Kegiatan pengurangan poin siswa
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 border border-emerald-200 bg-white/70 px-2.5 py-1 rounded-full flex-shrink-0">
                              -{item.amount} poin
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {sg.length>0&&(
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Riwayat Bimbingan ({sg.length})</p>
                <div className="space-y-2">
                  {sg.map(g=>{
                    const scCls:{[k:string]:string}={dijadwalkan:"bg-purple-50 text-purple-700 border-purple-200",berlangsung:"bg-amber-50 text-amber-700 border-amber-200",selesai:"bg-emerald-50 text-emerald-700 border-emerald-200"};
                    const scLbl:{[k:string]:string}={dijadwalkan:"Dijadwalkan",berlangsung:"Berlangsung",selesai:"Selesai"};
                    return(
                      <div key={g.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/50">
                        <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><BookMarked size={12} className="text-purple-600"/></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{g.topic}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(g.date)} · {g.officer}</p>
                          {g.notes&&<p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded px-2 py-1">{g.notes}</p>}
                          {g.followUp&&<p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Tindak lanjut:</span> {g.followUp}</p>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${scCls[g.status]}`}>{scLbl[g.status]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      );})()}
      {reduceStudent&&(
        <Modal
          title="Kurangi Poin Siswa"
          sub={`${reduceStudent.name} — ${reduceStudent.kelas}`}
          onClose={()=>{
            if(reducing) return;
            setReduceStudent(null);
            setReduceAmount("");
            setReduceNote("");
            setReduceError("");
          }}
        >
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{fontFamily:"'JetBrains Mono',monospace"}}
                >
                  {reduceStudent.totalPoints}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Total Poin Saat Ini</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p
                  className="text-2xl font-bold tabular-nums text-emerald-700"
                  style={{fontFamily:"'JetBrains Mono',monospace"}}
                >
                  {Math.max(0,reduceStudent.totalPoints-(Number(reduceAmount)||0))}
                </p>
                <p className="text-[10px] text-emerald-700 mt-1">Perkiraan Poin Setelah Dikurangi</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                Tulis kegiatan atau alasan yang membuat siswa memperoleh pengurangan poin.
                Teks ini akan tampil sebagai judul tebal pada Riwayat Pengurangan Poin.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Jumlah Poin Dikurangi
              </label>
              <input
                type="number"
                min={1}
                max={reduceStudent.totalPoints}
                value={reduceAmount}
                onChange={e=>{
                  const raw=e.target.value;
                  if(raw===""){
                    setReduceAmount("");
                  }else{
                    const value=Math.max(1,Math.min(Number(raw),reduceStudent.totalPoints));
                    setReduceAmount(String(value));
                  }
                  setReduceError("");
                }}
                placeholder="Masukkan jumlah poin..."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Maksimal {reduceStudent.totalPoints} poin.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Kegiatan/Alasan Pengurangan Poin
              </label>
              <textarea
                rows={3}
                value={reduceNote}
                onChange={e=>{setReduceNote(e.target.value);setReduceError("");}}
                placeholder="Contoh: Membantu kegiatan kebersihan sekolah selama 3 hari..."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {reduceError&&(
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle size={13}/>
                {reduceError}
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <button
                disabled={reducing}
                onClick={()=>{
                  setReduceStudent(null);
                  setReduceAmount("");
                  setReduceNote("");
                  setReduceError("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={reducing}
                onClick={async()=>{
                  const amount=Number(reduceAmount);

                  if(!Number.isFinite(amount)||amount<1){
                    setReduceError("Jumlah pengurangan minimal 1 poin.");
                    return;
                  }
                  if(amount>reduceStudent.totalPoints){
                    setReduceError(`Jumlah maksimal ${reduceStudent.totalPoints} poin.`);
                    return;
                  }
                  if(!reduceNote.trim()){
                    setReduceError("Alasan pengurangan poin wajib diisi.");
                    return;
                  }

                  setReducing(true);
                  setReduceError("");

                  const success=await onReduceStudentPoints(
                    reduceStudent.id,
                    amount,
                    reduceNote.trim()
                  );

                  setReducing(false);

                  if(success){
                    onSuccess(`Poin ${reduceStudent.name} berhasil dikurangi sebesar ${amount}.`);
                    setReduceStudent(null);
                    setReduceAmount("");
                    setReduceNote("");
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {reducing
                  ? <><Clock size={14}/> Menyimpan...</>
                  : <><MinusCircle size={14}/> Simpan Pengurangan</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
      {confirm&&<Confirm title="Hapus Data Siswa" message={`Yakin hapus "${confirm.name}"? Seluruh riwayat pelanggaran juga terhapus.`} onOk={()=>{onDel(confirm.id);setConfirm(null);onSuccess("Data siswa berhasil dihapus.");}} onCancel={()=>setConfirm(null)}/>}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-3.5 py-2.5 border border-border bg-card text-sm font-medium rounded-xl hover:bg-muted/40 text-muted-foreground">
            <Download size={13}/> Template Excel
          </button>
          <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 px-3.5 py-2.5 border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl hover:bg-emerald-100">
            <FileText size={13}/> Import Excel
          </button>
          <button onClick={()=>setShowPromote(true)} className="flex items-center gap-2 px-3.5 py-2.5 border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-100">
            <GraduationCap size={13}/> Naik Kelas
          </button>
          <button onClick={()=>setModal("add")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Tambah Siswa</button>
        </div>
      </div>
      {importErr&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={14}/>{importErr}</div>}

      {/* Tab: Aktif / Alumni */}
      <div className="flex gap-1.5">
        {([["aktif",`Siswa Aktif (${active.length})`],["alumni",`Arsip Alumni (${alumni.length})`]] as const).map(([t,l])=>(
          <button key={t} onClick={()=>{setTab(t);setQ("");setFKelas("");}} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${tab===t?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nama atau NIS..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring"/></div>
        <select value={fKelas} onChange={e=>setFKelas(e.target.value)} className="px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"><option value="">Semua Kelas</option>{classes.map(k=><option key={k}>{k}</option>)}</select>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-primary/80 bg-primary">
              {(tab==="aktif"
                ? ["NIS","Nama Siswa","Kelas","Total Poin","Status Sanksi","Aksi"]
                : ["NIS","Nama Siswa","Kelas Terakhir","Tahun Lulus","Total Catatan","Aksi"]
              ).map(h=><th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {sPag.slice.map(s=>{
                const sanct=getSanction(s.totalPoints);
                const vc=violations.filter(v=>v.studentId===s.id).length;
                return(
                  <tr key={s.id} className="hover:bg-muted/15">
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{s.nis}</td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs ${tab==="alumni"?"bg-muted text-muted-foreground":"bg-primary/10 text-primary"}`}>{s.name[0]}</div>
                      <div><p className="font-medium text-sm">{s.name}</p>{tab==="alumni"&&<p className="text-[10px] text-emerald-600 font-semibold">Alumni</p>}</div>
                    </div></td>
                    <td className="px-5 py-3.5 text-sm">{s.kelas}</td>
                    {tab==="aktif"
                      ? <>
                          <td className="px-5 py-3.5"><p className="font-bold tabular-nums text-sm" style={{fontFamily:"'JetBrains Mono',monospace"}}>{s.totalPoints}</p><p className="text-[11px] text-muted-foreground">{vc} catatan</p></td>
                          <td className="px-5 py-3.5"><Chip cls={`${sanct.bg} ${sanct.text} ${sanct.border}`}>{sanct.label}</Chip></td>
                        </>
                      : <>
                          <td className="px-5 py-3.5"><span className="text-sm font-semibold text-emerald-700">{s.lulusYear||"—"}</span></td>
                          <td className="px-5 py-3.5"><p className="font-bold tabular-nums text-sm" style={{fontFamily:"'JetBrains Mono',monospace"}}>{vc}</p><p className="text-[11px] text-muted-foreground">pelanggaran</p></td>
                        </>
                    }
                    <td className="px-5 py-3.5"><div className="flex items-center gap-1">
                      <button onClick={()=>setModal({mode:"view",s})} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"><Eye size={13}/></button>
                      {tab==="aktif"&&<button onClick={()=>setModal({mode:"edit",s})} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground" title="Edit siswa"><Edit2 size={13}/></button>}
                      {tab==="aktif"&&s.totalPoints>0&&(
                        <button
                          onClick={()=>{
                            setReduceStudent(s);
                            setReduceAmount("");
                            setReduceNote("");
                            setReduceError("");
                          }}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-700"
                          title="Kurangi poin siswa"
                        >
                          <MinusCircle size={13}/>
                        </button>
                      )}
                      <button onClick={()=>setConfirm(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive" title="Hapus siswa"><Trash2 size={13}/></button>
                      {tab==="aktif"&&(
                        <button onClick={()=>void pdfStudent(s,violations,vts)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground"><Download size={13}/></button>
                      )}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length===0&&<div className="py-16 text-center text-muted-foreground text-sm">{tab==="alumni"?"Belum ada data alumni":"Tidak ada siswa ditemukan"}</div>}
        <Pagination page={sPag.page} totalPages={sPag.totalPages} total={sPag.total} onPage={sPag.setPage}/>
      </div>
    </div>
  );
}

