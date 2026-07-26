import { useState, useMemo, useRef, useEffect } from "react";
import * as api from "@/lib/api";
import {
  LayoutDashboard, Users, AlertTriangle, Tag, FileText,
  LogOut, Search, Plus, Edit2, Trash2, Eye, Bell, Menu, X,
  Download, Shield, CheckCircle, Clock, AlertCircle,
  BookOpen, ArrowLeft, Calendar, Printer, ChevronRight,
  BookMarked, PhoneCall, Settings, GraduationCap, ClipboardList,
  UserCheck, Flag, ImageIcon, Send, BadgeCheck, XCircle,
  ShieldAlert, Camera, BarChart2, ChevronLeft, MinusCircle, Lock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import schoolLogo from "@/imports/image-1.png";
import riauLogo from "@/imports/image-3.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AppUser {
  id: string; email: string; password: string;
  role: "admin" | "guru_piket"; displayName: string; nip?: string;
}
interface Student {
  id: string; nis: string; name: string; kelas: string;
  gender: "L" | "P"; parentName: string; parentPhone: string; totalPoints: number;
  archived?: boolean;
  status?: "aktif" | "lulus" | "pindah" | "keluar";
  lulusYear?: number;
}
interface ViolationType {
  id: string; name: string; description: string;
  category: "ringan" | "sedang" | "berat"; points: number; sanction: string;
}
interface Violation {
  id: string; studentId: string; violationTypeId: string;
  date: string; time: string; location: string; chronology: string;
  officer: string; officerId: string; witness: string;
  status: "belum" | "proses" | "selesai";
  verifyStatus: "draft" | "menunggu" | "diverifikasi" | "ditolak";
  sanksiLangsung: string; evidence?: string;
  pointReduction?: number; pointReductionNote?: string;
}
interface GuidanceEntry {
  id: string; studentId: string; date: string; topic: string;
  notes: string; officer: string; followUp: string;
  status: "dijadwalkan" | "berlangsung" | "selesai";
  assignedTo?: string;   // userId guru piket yg ditugaskan (jika ada)
  requestedBy?: string;  // userId admin yg menugaskan
}
interface ParentSummon {
  id: string; studentId: string; date: string; reason: string;
  scheduledDate: string; jam: string; location: string;
  waliKelas: string;
  waliKelasJabatan?: string;
  waliKelasNip?: string;
  status: "aktif" | "selesai";
}
type AdminView = "dashboard" | "students" | "violations" | "guidance" | "summons" | "reports" | "settings";
type PiketView = "piket_catat" | "piket_kasus" | "piket_bimbingan";
type AppView = "login" | "public" | AdminView | PiketView;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genId() { return `id_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

type OrderedRecord = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  time?: string;
};

function compareNewest(a: OrderedRecord, b: OrderedRecord) {
  // Record yang baru dibuat atau baru diperbarui selalu berada di paling atas.
  const aStamp = a.updatedAt || a.createdAt || "";
  const bStamp = b.updatedAt || b.createdAt || "";

  if (aStamp !== bStamp) {
    return bStamp.localeCompare(aStamp);
  }

  // ID sementara dari frontend menyimpan timestamp: id_1720000000000_abcd
  const aLocal = String(a.id).match(/^id_(\d+)/)?.[1];
  const bLocal = String(b.id).match(/^id_(\d+)/)?.[1];

  if (aLocal && bLocal && aLocal !== bLocal) {
    return Number(bLocal) - Number(aLocal);
  }

  // ID database umumnya angka berurutan; ID lebih besar berarti lebih baru.
  const aNumber = Number(a.id);
  const bNumber = Number(b.id);

  if (
    Number.isFinite(aNumber) &&
    Number.isFinite(bNumber) &&
    aNumber !== bNumber
  ) {
    return bNumber - aNumber;
  }

  // Fallback untuk data lama yang belum mempunyai created_at/updated_at.
  const aDateTime = `${a.date || ""}T${a.time || ""}`;
  const bDateTime = `${b.date || ""}T${b.time || ""}`;

  if (aDateTime !== bDateTime) {
    return bDateTime.localeCompare(aDateTime);
  }

  return String(b.id).localeCompare(String(a.id), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function todayStr() { return new Date().toISOString().slice(0,10); }
function fmtDate(value: string) {
  if (!value) return "—";

  // Ambil tanggal saja agar ISO UTC tidak menggeser hari di zona WIB.
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return raw;

  const [, year, month, day] = match;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  return localDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(value?: string) {
  if (!value) return "";

  const raw = String(value);
  const isoMatch = raw.match(/T(\d{2}):(\d{2})/);
  const plainMatch = raw.match(/^(\d{2}):(\d{2})/);
  const match = isoMatch ?? plainMatch;

  return match ? `${match[1]}.${match[2]}` : raw;
}

/**
 * Digunakan oleh dashboard, rekap, dan seluruh cetak laporan.
 * Status lama yang belum mengirim field `status` tetap dianggap aktif
 * selama tidak archived dan tidak mempunyai tahun lulus.
 */
function isActiveStudent(student: Student) {
  const inactiveStatus =
    student.status === "lulus" ||
    student.status === "pindah" ||
    student.status === "keluar";

  return !student.archived && !inactiveStatus && !student.lulusYear;
}

function getSanction(pts: number) {
  if (pts === 0)   return { label:"Baik",                        bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-200", bar:"#10b981" };
  if (pts <= 75)   return { label:"Peringatan Lisan",            bg:"bg-sky-50",     text:"text-sky-700",     border:"border-sky-200",     bar:"#0ea5e9" };
  if (pts < 150)   return { label:"Hukuman Khusus",             bg:"bg-amber-50",   text:"text-amber-700",   border:"border-amber-200",   bar:"#f59e0b" };
  if (pts < 300)   return { label:"SP Tertulis + Panggil Ortu",  bg:"bg-orange-50",  text:"text-orange-700",  border:"border-orange-200",  bar:"#f97316" };
  if (pts < 400)   return { label:"Panggil Ortu + Skorsing",     bg:"bg-red-50",     text:"text-red-600",     border:"border-red-200",     bar:"#ef4444" };
  if (pts < 501)   return { label:"Panggil Ortu + Pernyataan",   bg:"bg-red-100",    text:"text-red-800",     border:"border-red-300",     bar:"#dc2626" };
  return                  { label:"Dikembalikan ke Orang Tua",   bg:"bg-red-200",    text:"text-red-900",     border:"border-red-500",     bar:"#991b1b" };
}
function getCatCls(cat: string) {
  if (cat==="ringan") return "bg-sky-50 text-sky-700 border-sky-200";
  if (cat==="sedang") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}
function getStatusInfo(status: string) {
  if (status==="selesai") return { cls:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Selesai",  dot:"bg-emerald-500" };
  if (status==="proses")  return { cls:"bg-amber-50 text-amber-700 border-amber-200",       label:"Diproses", dot:"bg-amber-500"   };
  return                         { cls:"bg-gray-50 text-gray-600 border-gray-200",           label:"Belum",    dot:"bg-gray-400"    };
}
function getVerifyInfo(vs: string) {
  if (vs==="diverifikasi") return { cls:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Diverifikasi", icon:BadgeCheck   };
  if (vs==="menunggu")     return { cls:"bg-amber-50 text-amber-700 border-amber-200",       label:"Menunggu",     icon:Clock        };
  if (vs==="ditolak")      return { cls:"bg-red-50 text-red-700 border-red-200",             label:"Ditolak",      icon:XCircle      };
  return                          { cls:"bg-gray-50 text-gray-500 border-gray-200",           label:"Draft",        icon:ClipboardList };
}
function getSummonStatus(s: string) {
  if (s==="hadir")       return { cls:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Orang Tua Hadir" };
  if (s==="tidak_hadir") return { cls:"bg-red-50 text-red-700 border-red-200",             label:"Tidak Hadir"     };
  if (s==="dikirim")     return { cls:"bg-amber-50 text-amber-700 border-amber-200",       label:"Sudah Dikirim"   };
  return                        { cls:"bg-gray-50 text-gray-500 border-gray-200",           label:"Draft"           };
}

// ─── PDF Helpers ───────────────────────────────────────────────────────────────
const PDF_CSS = `<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',Times,serif;font-size:12px;color:#111;padding:28px 36px}
  .kop{display:flex;align-items:center;gap:12px;padding-bottom:10px}
  .kop-logo{width:80px;height:80px;object-fit:contain;flex-shrink:0}
  .kop-center{flex:1;text-align:center;line-height:1.35}
  .kop-prov{font-size:13px}
  .kop-school{font-size:22px;font-weight:bold}
  .kop-addr{font-size:11px}
  .kop-meta{font-size:11px;display:flex;justify-content:space-between;margin-top:3px;padding:0 20px;text-decoration:none}
  .kop-akred{font-size:12px;font-weight:bold;font-style:italic;text-align:center;margin-top:2px}
  .kop-line1{border:none;border-top:4px solid #111;margin:6px 0 1px}
  .kop-line2{border:none;border-top:2px solid #111;margin:0 0 16px}
  .doc-title{display:block;width:100%;text-align:center!important;font-size:14px;font-weight:bold;margin:14px 0 4px}
  .doc-sub{display:block;width:100%;text-align:center!important;font-size:11px;color:#444;margin-bottom:16px}
  .doc-no{display:block;text-align:center;font-size:12px;margin-bottom:16px}
  .section-title{font-size:12px;font-weight:bold;margin:14px 0 6px;border-bottom:2px solid #111;padding-bottom:3px}
  table{
    width:100%;
    border-collapse:collapse;
    margin-bottom:14px;
    font-size:11px;
    border:1px solid #000
  }
  th{
    background:#e8e8e8!important;
    color:#000!important;
    padding:6px 9px;
    text-align:left;
    font-size:11px;
    font-weight:bold;
    border:1px solid #000;
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
    box-shadow:inset 0 0 0 1000px #e8e8e8
  }
  td{
    padding:5px 9px;
    border:1px solid #000;
    font-size:11px;
    background:#fff;
    color:#000
  }
  tr:nth-child(even) td{background:#f7f7f7}
  .formal-summary{
    width:100%;
    border-collapse:collapse;
    margin:6px 0 14px;
    font-size:11px;
    border:1px solid #000
  }
  .formal-summary th{
    background:#e8e8e8!important;
    color:#000!important;
    border:1px solid #000;
    padding:5px 8px;
    text-align:left;
    font-size:11px;
    font-weight:bold;
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
    box-shadow:inset 0 0 0 1000px #e8e8e8
  }
  .formal-summary td{
    background:#fff!important;
    color:#000!important;
    border:1px solid #000;
    padding:5px 8px;
    font-size:11px
  }
  .formal-summary .number{
    width:90px;
    text-align:center;
    font-weight:bold
  }
  .letter-table{width:auto;margin-bottom:0;border:none!important}
  .letter-table td{border:none!important;background:none!important;padding:2px 6px 2px 0;font-size:12px;vertical-align:top}
  .info-row{display:flex;gap:6px;margin-bottom:5px;font-size:12px}
  .info-label{font-weight:bold;width:160px;flex-shrink:0}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:bold}
  .b-ok{background:#d1fae5;color:#065f46}.b-warn{background:#fef3c7;color:#92400e}.b-bad{background:#fee2e2;color:#991b1b}
  .sig-row{display:flex;justify-content:space-between;margin-top:24px}
  .footer{margin-top:20px;font-size:9px;color:#888;border-top:1px solid #ddd;padding-top:6px}
  /* Edit mode */
  .editable [contenteditable]{outline:none;border-bottom:1.5px dashed #2d6a4f;min-width:20px;display:inline-block;cursor:text}
  .editable [contenteditable]:focus{background:rgba(45,106,79,0.06);border-radius:3px}
  .editable [contenteditable]:empty::before{content:attr(data-ph);color:#aaa;font-style:italic}
  .edit-bar{position:fixed;top:0;left:0;right:0;height:48px;background:#1a3528;display:flex;align-items:center;justify-content:space-between;padding:0 18px;z-index:999;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
  .edit-bar-title{color:#c8dece;font-size:12px;display:flex;align-items:center;gap:8px}
  .edit-bar-dot{width:8px;height:8px;border-radius:50%;background:#52b788}
  .edit-bar-hint{color:rgba(200,222,206,0.5);font-size:11px;font-style:italic}
  .btn-print{background:#52b788;color:#1a3528;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold}
  .btn-print:hover{background:#3a8a65}
  .btn-edit{background:rgba(255,255,255,0.12);color:#c8dece;border:1px solid rgba(255,255,255,0.2);padding:7px 16px;border-radius:6px;cursor:pointer;font-size:12px}
  .btn-edit:hover{background:rgba(255,255,255,0.2)}
  .doc-wrap{margin-top:56px}
  @media print{
    @page{size:A4 portrait;margin:20mm 20mm 20mm 25mm}
    html,body,table,thead,tbody,tr,th,td{
      -webkit-print-color-adjust:exact!important;
      print-color-adjust:exact!important
    }
    body{padding:0;margin:0}
    .no-print,.edit-bar{display:none!important}
    .doc-wrap{margin-top:0}
    th,.formal-summary th{
      background:#e8e8e8!important;
      color:#000!important;
      border-color:#000!important;
      box-shadow:inset 0 0 0 1000px #e8e8e8!important
    }
    td,.formal-summary td{
      border-color:#000!important;
      color:#000!important
    }
    [contenteditable]{border:none!important;background:none!important}
  }
</style>`;

async function toB64(url: string) {
  const r = await fetch(url); const b = await r.blob();
  return new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); });
}
function kopHtml(rl: string, sl: string) {
  return `<div class="kop"><img class="kop-logo" src="${rl}"/><div class="kop-center"><div class="kop-prov">PEMERINTAH PROVINSI RIAU</div><div class="kop-school">SMA NEGERI 2 PANGKALAN KURAS</div><div class="kop-addr">Jl. Lintas Timur KM. 102 Terantang Manuk Kode Pos 28382</div><div>e-mail: <u>pklkuras@yahoo.co.id</u></div><div class="kop-meta"><span>NSS: 301040605018</span><span>NPSN: 10494082</span></div><div class="kop-akred">AKREDITASI: A</div></div><img class="kop-logo" src="${sl}"/></div><hr class="kop-line1"/><hr class="kop-line2"/>`;
}
async function printDoc(html: string, hideFooter = false) {
  const w = window.open("","_blank","width=980,height=820");
  if (!w) return;
  const [rl, sl] = await Promise.all([toB64(riauLogo), toB64(schoolLogo)]);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>SMAN 2 Pangkalan Kuras</title>${PDF_CSS}</head><body>
    <div class="edit-bar">
      <div class="edit-bar-title">
        <span class="edit-bar-dot" id="editDot"></span>
        <span id="editLabel">Mode Edit Aktif — klik teks untuk mengedit</span>
        <span class="edit-bar-hint" id="editHint">Nomor surat, tanggal, nama penandatangan, dll dapat diubah langsung</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-edit" onclick="toggleEdit()" id="btnToggle">🔒 Kunci Dokumen</button>
        <button class="btn-print" onclick="window.print()">🖨 Cetak / PDF</button>
      </div>
    </div>
    <div class="doc-wrap editable" id="docWrap">
      ${kopHtml(rl,sl)}${html}
      ${hideFooter ? "" : `<div class="footer">Dicetak: <span contenteditable="true" data-ph="tanggal cetak">${new Date().toLocaleString("id-ID")}</span> | SMAN 2 Pangkalan Kuras</div>`}
    </div>
    <script>
      var editing = true;
      function toggleEdit() {
        editing = !editing;
        var wrap = document.getElementById('docWrap');
        var btn = document.getElementById('btnToggle');
        var dot = document.getElementById('editDot');
        var label = document.getElementById('editLabel');
        var hint = document.getElementById('editHint');
        if (editing) {
          wrap.classList.add('editable');
          btn.textContent = '🔒 Kunci Dokumen';
          dot.style.background = '#52b788';
          label.textContent = 'Mode Edit Aktif — klik teks untuk mengedit';
          hint.style.display = '';
        } else {
          wrap.classList.remove('editable');
          btn.textContent = '✏️ Edit Dokumen';
          dot.style.background = '#f59e0b';
          label.textContent = 'Dokumen dikunci — siap untuk dicetak';
          hint.style.display = 'none';
        }
      }
      // Make key fields editable on load
      document.addEventListener('DOMContentLoaded', function() {
        // doc-title, doc-no, info-row values, sig names/NIP
        document.querySelectorAll('.doc-title, .doc-no').forEach(function(el) {
          el.setAttribute('contenteditable','true');
        });
        document.querySelectorAll('.info-row').forEach(function(el) {
          var spans = el.querySelectorAll('span:not(.info-label)');
          spans.forEach(function(s){ s.setAttribute('contenteditable','true'); });
        });
        document.querySelectorAll('.sig-row > div p').forEach(function(el) {
          el.setAttribute('contenteditable','true');
        });
      });
    </script>
  </body></html>`);
  w.document.close();
}
function hdr(title: string, sub?: string) {
  return `<div class="doc-title">${title}</div>${sub?`<div class="doc-sub">${sub}</div>`:""}`;
}
function tbl(headers: string[], rows: (string|number)[][]) {
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function sig(...labels: string[]) {
  const d = new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
  const signers = labels.map(l=>`<div style="display:block;text-align:center;font-size:11px;padding:0 8px;min-width:160px">
    <p style="margin:0 0 60px 0;display:block" contenteditable="true">${l}</p>
    <p style="margin:0 0 0 0;display:block;font-weight:bold;border-bottom:1.5px solid #333;padding-bottom:3px" contenteditable="true">________________________</p>
    <p style="margin:5px 0 0 0;display:block;font-size:10px" contenteditable="true">NIP. _____________________</p>
  </div>`).join("");
  return `<div style="margin-top:40px">
    <div style="display:block;text-align:right;font-size:11px;margin-bottom:24px" contenteditable="true">Terantang Manuk, ${d}</div>
    <div class="sig-row">${signers}</div>
  </div>`;
}
function bdgCls(pts: number) { return pts===0?"b-ok":pts<=75?"b-warn":pts<150?"b-warn":"b-bad"; }

async function pdfStudent(s: Student, violations: Violation[], vts: ViolationType[]) {
  if (!isActiveStudent(s)) return;

  const sv = violations
    .filter(v=>v.studentId===s.id)
    .sort(compareNewest);

  const rows = sv.map((v,i)=>{
    const vt=vts.find(x=>x.id===v.violationTypeId);
    return [i+1,fmtDate(v.date),vt?.name||"-",vt?.category||"-",vt?.points||0,v.officer,v.status];
  });
  await printDoc(`${hdr("LAPORAN PELANGGARAN SISWA",`No: LP/${s.nis}/${new Date().getFullYear()}`)}
    <div class="section-title">DATA SISWA</div>
    <div class="info-row"><span class="info-label">Nama</span><span>: ${s.name}</span></div>
    <div class="info-row"><span class="info-label">NIS</span><span>: ${s.nis}</span></div>
    <div class="info-row"><span class="info-label">Kelas</span><span>: ${s.kelas}</span></div>
    <div class="info-row"><span class="info-label">Total Poin</span><span>: <strong>${s.totalPoints}</strong></span></div>
    <div class="info-row"><span class="info-label">Status Sanksi</span><span>: <span class="badge ${bdgCls(s.totalPoints)}">${getSanction(s.totalPoints).label}</span></span></div>
    <div class="section-title">RIWAYAT PELANGGARAN (${sv.length} catatan)</div>
    ${rows.length?tbl(["No","Tanggal","Jenis Pelanggaran","Kategori","Poin","Petugas","Status"],rows):"<p>Tidak ada catatan.</p>"}
    ${sig("Guru BK / Wali Kelas","Kepala Sekolah","Orang Tua / Wali")}`, true);
}
async function pdfClass(kelas: string, students: Student[], violations: Violation[], vts: ViolationType[]) {
  const cls = students
    .filter(isActiveStudent)
    .filter(s=>s.kelas===kelas)
    .sort(compareNewest);

  const activeIds = new Set(cls.map(s=>s.id));
  const activeViolations = violations.filter(v=>activeIds.has(v.studentId));

  const rows = cls.map((s,i)=>{
    const vc=activeViolations.filter(v=>v.studentId===s.id).length;
    return [
      i+1,
      s.nis,
      s.name,
      s.gender,
      s.totalPoints,
      vc,
      `<span class="badge ${bdgCls(s.totalPoints)}">${getSanction(s.totalPoints).label}</span>`,
    ];
  });

  await printDoc(
    `${hdr(`LAPORAN PELANGGARAN SISWA AKTIF KELAS ${kelas}`)}
     ${tbl(["No","NIS","Nama","L/P","Total Poin","Jml Pelanggaran","Status Sanksi"],rows)}
     ${sig("Wali Kelas","Guru BK","Kepala Sekolah")}`,
    true
  );
}
async function pdfPeriod(from: string, to: string, violations: Violation[], students: Student[], vts: ViolationType[]) {
  const activeStudents = students.filter(isActiveStudent);
  const activeIds = new Set(activeStudents.map(s=>s.id));

  const filtered = violations
    .filter(v=>activeIds.has(v.studentId))
    .filter(v=>v.date>=from&&v.date<=to)
    .sort(compareNewest);

  const rows = filtered.map((v,i)=>{
    const s=activeStudents.find(x=>x.id===v.studentId);
    const vt=vts.find(x=>x.id===v.violationTypeId);

    return [
      i+1,
      fmtDate(v.date),
      s?.name||"-",
      s?.kelas||"-",
      vt?.name||"-",
      vt?.category||"-",
      vt?.points||0,
      v.officer,
    ];
  });

  await printDoc(
    `${hdr(
      "LAPORAN PELANGGARAN SISWA AKTIF PER PERIODE",
      `Periode: ${fmtDate(from)} s/d ${fmtDate(to)} &nbsp;|&nbsp; Total: ${filtered.length} pelanggaran`
    )}
    ${tbl(["No","Tanggal","Siswa","Kelas","Jenis","Kategori","Poin","Petugas"],rows)}
    ${sig("Guru BK","Kepala Sekolah")}`,
    true
  );
}
async function pdfCategory(violations: Violation[], vts: ViolationType[], students: Student[]) {
  const activeStudents = students.filter(isActiveStudent);
  const activeIds = new Set(activeStudents.map(s=>s.id));
  const activeViolations = violations.filter(v=>activeIds.has(v.studentId));

  let body = hdr(
    "LAPORAN PELANGGARAN SISWA AKTIF PER KATEGORI",
    `Total ${activeViolations.length} pelanggaran`
  );

  (["ringan","sedang","berat"] as const).forEach(cat=>{
    const items = activeViolations.filter(v=>{
      const vt=vts.find(x=>x.id===v.violationTypeId);
      return vt?.category===cat;
    }).sort(compareNewest);

    const rows = items.map((v,i)=>{
      const s=activeStudents.find(x=>x.id===v.studentId);
      const vt=vts.find(x=>x.id===v.violationTypeId);

      return [
        i+1,
        vt?.name||"-",
        s?.name||"-",
        s?.kelas||"-",
        fmtDate(v.date),
        vt?.points||0,
      ];
    });

    body+=`
      <div class="section-title">
        Pelanggaran ${cat.charAt(0).toUpperCase()+cat.slice(1)} (${items.length})
      </div>
      ${tbl(["No","Jenis","Siswa","Kelas","Tanggal","Poin"],rows)}
    `;
  });

  body+=sig("Guru BK","Kepala Sekolah");
  await printDoc(body, true);
}
async function pdfWarning(s: Student, violations: Violation[], vts: ViolationType[], n: number) {
  if (!isActiveStudent(s)) return;

  const sv=violations.filter(v=>v.studentId===s.id).sort(compareNewest);
  const rows=sv.map((v,i)=>{const vt=vts.find(x=>x.id===v.violationTypeId);return[i+1,fmtDate(v.date),vt?.name||"-",vt?.points||0,v.location,v.officer];});
  await printDoc(`${hdr(`SURAT PERINGATAN KE-${n}`,`Nomor: SP-${n}/SMAN2.PKK/BK/${new Date().getFullYear()}`)}
    <p style="font-size:12px;margin-bottom:14px">Sehubungan dengan akumulasi poin pelanggaran yang telah mencapai <strong>${s.totalPoints} poin</strong>, kami memberikan Surat Peringatan ke-${n} kepada:</p>
    <div class="info-row"><span class="info-label">Nama</span><span>: ${s.name}</span></div>
    <div class="info-row"><span class="info-label">NIS</span><span>: ${s.nis}</span></div>
    <div class="info-row"><span class="info-label">Kelas</span><span>: ${s.kelas}</span></div>
    <div class="info-row"><span class="info-label">Total Poin</span><span>: <strong>${s.totalPoints}</strong></span></div>
    <div class="section-title">Dasar Pelanggaran</div>
    ${tbl(["No","Tanggal","Jenis Pelanggaran","Poin","Lokasi","Petugas"],rows)}
    ${sig("Guru Bimbingan Konseling","Kepala Sekolah")}`);
}
async function pdfParent(s: Student, summon?: ParentSummon) {
  const yr  = new Date().getFullYear();
  const seq = summon ? summon.id.slice(-3).replace(/\D/g,"").padStart(3,"0") : "001";
  const nomor = `400.3.8.1/SMAN-2/I/${yr}/${seq}`;
  // Format scheduledDate ke bentuk panjang Indonesia.
  // Backend mengirim tanggal sebagai "YYYY-MM-DD" ATAU sebagai ISO datetime penuh
  // ("YYYY-MM-DDTHH:mm:ss.ssssssZ") tergantung cast Eloquent — ambil bagian
  // tanggalnya saja lewat regex (sama seperti fmtDate) agar tidak jadi Invalid Date.
  const scheduledMatch = summon?.scheduledDate ? String(summon.scheduledDate).match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  const jadwal = scheduledMatch
    ? new Date(Number(scheduledMatch[1]), Number(scheduledMatch[2])-1, Number(scheduledMatch[3])).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
    : "………………………………………………………………………";
  const jam      = summon?.jam      ? `${summon.jam} WIB` : "………………………… WIB";
  const agenda   = summon?.reason   || "………………………………………………………………………";
  const waliKls     = summon?.waliKelas || "";
  const waliJabatan = summon?.waliKelasJabatan ?? "Wali Kelas";
  const waliNip     = summon?.waliKelasNip || "";

  await printDoc(`
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
      <p style="font-size:12px">Terantang Manuk, ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</p>
    </div>
    <table class="letter-table" style="margin-bottom:24px">
      <tr><td style="min-width:70px">Nomor</td><td style="padding:2px 6px">:</td><td contenteditable="true">${nomor}</td></tr>
      <tr><td>Lampiran</td><td style="padding:2px 6px">:</td><td>-</td></tr>
      <tr><td>Sifat</td><td style="padding:2px 6px">:</td><td>Penting</td></tr>
      <tr><td>Hal</td><td style="padding:2px 6px">:</td><td><strong>Panggilan</strong></td></tr>
    </table>
    <div style="padding-left:40px;margin-bottom:32px;font-size:12px">
      <p style="margin-bottom:4px">Kepada Yth,</p>
      <p style="margin-bottom:4px">Bapak/Ibu Orang Tua/Wali Siswa</p>
      <p style="margin-bottom:4px"><strong>${s.parentName || "………………………………………"}</strong></p>
      <p style="margin-bottom:4px">(Orang Tua / Wali dari: <strong>${s.name}</strong>, Kelas <strong>${s.kelas}</strong>)</p>
      <p style="margin-bottom:2px;margin-top:16px">Di_</p>
      <p style="padding-left:20px">Tempat</p>
    </div>
    <p style="font-size:12px;margin-bottom:6px">Dengan hormat,</p>
    <p style="font-size:12px;margin-bottom:6px;line-height:1.8;text-align:justify">Teriring salam dan do'a semoga Bapak/Ibu orang tua siswa dalam keadaan sehat wal afiat, Amiin.</p>
    <p style="font-size:12px;margin-bottom:20px;line-height:1.8;text-align:justify">Kepala SMAN 2 Pangkalan Kuras memanggil Bapak/Ibu orang tua siswa untuk dapat hadir pada :</p>
    <table class="letter-table" style="margin-bottom:24px;margin-left:20px">
      <tr><td style="min-width:110px"><strong>Hari/Tanggal</strong></td><td style="padding:3px 10px">:</td><td style="min-width:300px" contenteditable="true">${jadwal}</td></tr>
      <tr><td><strong>Jam</strong></td><td style="padding:3px 10px">:</td><td contenteditable="true">${jam}</td></tr>
      <tr><td><strong>Tempat</strong></td><td style="padding:3px 10px">:</td><td>Kantor SMAN 2 Pangkalan Kuras</td></tr>
      <tr><td><strong>Agenda</strong></td><td style="padding:3px 10px">:</td><td contenteditable="true">${agenda}</td></tr>
    </table>
    <p style="font-size:12px;margin-bottom:48px;line-height:1.8;text-align:justify">Demikian surat panggilan ini kami sampaikan, atas kehadirannya kami ucapkan terima kasih.</p>
    <div style="display:flex;justify-content:flex-end">
      <div style="text-align:center;min-width:200px">
        <p style="font-size:12px;margin-bottom:4px">${waliJabatan}</p>
        <p style="font-size:12px;margin-bottom:52px">&nbsp;</p>
        <p style="font-size:12px;font-weight:bold;margin-bottom:4px" contenteditable="true">${waliKls||"……………………………………"}</p>
        <div style="border-bottom:1px solid #000;margin-bottom:4px"></div>
        <p style="font-size:12px" contenteditable="true">${waliNip ? `NIP/NIPPPK. ${waliNip}` : "NIP/NIPPPK. …………………………………"}</p>
      </div>
    </div>
  `, true);
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
function Chip({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium border ${cls}`}>{children}</span>;
}
function FInput({ label, ...rest }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <input className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow" {...rest} />
    </div>
  );
}
function FSelect({ label, children, ...rest }: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow" {...rest}>{children}</select>
    </div>
  );
}
function FTextarea({ label, ...rest }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <textarea className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow" {...rest} />
    </div>
  );
}

function StudentSearch({ students, value, onChange, label, placeholder, filter }: {
  students: Student[]; value: string; onChange: (id: string) => void;
  label?: string; placeholder?: string; filter?: (s: Student) => boolean;
}) {
  const pool = [...(filter ? students.filter(filter) : students)].sort(compareNewest);
  const selected = pool.find(s => s.id === value);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = q.trim() ? pool.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.nis.includes(q)) : pool.slice(0,8);
  const pick = (s: Student) => { onChange(s.id); setQ(""); setOpen(false); };
  return (
    <div className="relative">
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-input-background text-sm transition-shadow ${open?"ring-2 ring-ring border-ring/50":"border-border"}`}>
        <Search size={13} className="text-muted-foreground flex-shrink-0"/>
        <input value={open?q:(selected?`${selected.name} – ${selected.nis} (${selected.kelas})`:"")}
          placeholder={open?"Ketik nama atau NIS...":(placeholder??"Cari siswa...")}
          className="flex-1 bg-transparent outline-none min-w-0"
          onFocus={()=>setOpen(true)} onChange={e=>{setQ(e.target.value);if(!open)setOpen(true);}}
          onBlur={()=>setTimeout(()=>setOpen(false),150)} />
        {value&&!open&&<button type="button" onClick={()=>{onChange("");setQ("");}} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X size={13}/></button>}
      </div>
      {open&&(
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {results.length===0?<div className="px-4 py-3 text-sm text-muted-foreground">Tidak ditemukan</div>:(
            <ul className="max-h-52 overflow-y-auto divide-y divide-border">
              {results.map(s=>{const sanct=getSanction(s.totalPoints);return(
                <li key={s.id}><button type="button" onMouseDown={()=>pick(s)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors ${s.id===value?"bg-primary/5":""}`}>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">{s.name[0]}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.name}</p><p className="text-xs text-muted-foreground">{s.nis} · {s.kelas}</p></div>
                  <div className="text-right flex-shrink-0"><p className="text-xs font-bold">{s.totalPoints} poin</p><span className={`text-[10px] ${sanct.text}`}>{sanct.label}</span></div>
                </button></li>
              );})}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Modal({ title, sub, wide, onClose, children }: {
  title: string; sub?: string; wide?: boolean; onClose: ()=>void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] w-full ${wide?"max-w-2xl":"max-w-lg"}`}>
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div><h3 className="font-semibold text-sm">{title}</h3>{sub&&<p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground ml-4"><X size={15}/></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
function Confirm({ title, message, onOk, onCancel }: { title: string; message: string; onOk:()=>void; onCancel:()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-destructive"/></div>
        <h3 className="font-semibold text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button onClick={onOk} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90">Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ─── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={28} className="text-emerald-500"/>
        </div>
        <p className="font-semibold text-base mb-1">Berhasil!</p>
        <p className="text-sm text-muted-foreground mb-6">{msg}</p>
        <button onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          Oke
        </button>
      </div>
    </div>
  );
}
function ErrorModal({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-red-500"/>
        </div>
        <p className="font-semibold text-base mb-1">Gagal</p>
        <p className="text-sm text-muted-foreground mb-6">{msg}</p>
        <button onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          Tutup
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
function usePagination<T>(items: T[], resetKey?: unknown) {
  const [page, setPage] = useState(1);
  // reset to page 1 whenever the data set changes (filter, search)
  const prevKey = useRef(resetKey);
  if (prevKey.current !== resetKey) { prevKey.current = resetKey; if (page !== 1) setPage(1); }
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const slice      = items.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);
  return { page: safePage, setPage, totalPages, slice, total: items.length };
}

function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage:(p:number)=>void;
}) {
  if (totalPages <= 1) return null;
  const from = (page-1)*PAGE_SIZE + 1;
  const to   = Math.min(page*PAGE_SIZE, total);

  // build page number window: always show first, last, current ±1, with ellipsis
  const pages: (number|"…")[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1); add(totalPages);
  for (let i = Math.max(1, page-1); i <= Math.min(totalPages, page+1); i++) add(i);
  const sorted = (pages.filter(p=>typeof p==="number") as number[]).sort((a,b)=>a-b);
  const withDots: (number|"…")[] = [];
  sorted.forEach((n,i) => {
    if (i>0 && n-(sorted[i-1] as number)>1) withDots.push("…");
    withDots.push(n);
  });

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20">
      <p className="text-xs text-muted-foreground tabular-nums">
        Menampilkan <span className="font-semibold text-foreground">{from}–{to}</span> dari <span className="font-semibold text-foreground">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page<=1} onClick={()=>onPage(page-1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={13}/>
        </button>
        {withDots.map((p,i) => p==="…"
          ? <span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
          : <button key={p} onClick={()=>onPage(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${page===p?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:bg-muted/60"}`}>
              {p}
            </button>
        )}
        <button disabled={page>=totalPages} onClick={()=>onPage(page+1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={13}/>
        </button>
      </div>
    </div>
  );
}

// ─── Evidence Upload ───────────────────────────────────────────────────────────
function EvidencePreview({ evidence, className }: { evidence?: string; className?: string }) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let objectUrl: string | undefined;
    if (evidence?.startsWith("__server__:")) {
      api.fetchEvidenceBlobUrl(evidence.split(":")[1]).then(u => { objectUrl = u; setUrl(u); }).catch(() => setUrl(undefined));
    } else {
      setUrl(evidence);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidence]);
  if (!url) return <div className={`flex items-center justify-center text-xs text-muted-foreground bg-muted/30 ${className??"w-full max-h-36"}`}>Memuat bukti...</div>;
  return <img src={url} alt="Bukti" className={className??"w-full max-h-36 object-cover"}/>;
}

function EvidenceUpload({ value, onChange }: { value?: string; onChange: (b64?: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const isServerEvidence = value?.startsWith("__server__:");

  useEffect(() => {
    let objectUrl: string | undefined;
    if (isServerEvidence) {
      const violationId = value!.split(":")[1];
      api.fetchEvidenceBlobUrl(violationId).then(url => { objectUrl = url; setPreviewUrl(url); }).catch(() => setPreviewUrl(undefined));
    } else {
      setPreviewUrl(value);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value, isServerEvidence]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => onChange(fr.result as string);
    fr.readAsDataURL(file);
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bukti Foto (opsional)</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
          {previewUrl
            ? <img src={previewUrl} alt="Bukti" className="w-full max-h-48 object-cover"/>
            : <div className="w-full h-24 flex items-center justify-center text-xs text-muted-foreground">Memuat bukti...</div>}
          <button type="button" onClick={()=>onChange(undefined)}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors">
            <X size={13} className="text-white"/>
          </button>
        </div>
      ) : (
        <button type="button" onClick={()=>ref.current?.click()}
          className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
          <Camera size={20}/>
          <span className="text-xs font-medium">Klik untuk unggah foto bukti</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
    </div>
  );
}

// ─── Violation Form (shared by admin & guru piket) ─────────────────────────────
function ViolationModal({ init, students, vts, currentUser, onSave, onClose }: {
  init?: Violation; students: Student[]; vts: ViolationType[];
  currentUser: AppUser; onSave:(v:Violation)=>void; onClose:()=>void;
}) {
  type F = Omit<Violation,"id">;
  const blank: F = {
    studentId:"", violationTypeId:"", date:todayStr(), time:"", location:"", chronology:"",
    officer: currentUser.displayName, officerId: currentUser.id,
    witness:"", status:"belum",
    // Catatan yang dibuat admin langsung berstatus diverifikasi.
    // Guru piket tetap menyimpan sebagai draft sampai menekan "Kirim Verifikasi".
    verifyStatus: currentUser.role === "admin" ? "diverifikasi" : "draft",
    sanksiLangsung:"", evidence:undefined,
  };
  const [f, setF] = useState<F>(init ? {
    studentId:init.studentId, violationTypeId:init.violationTypeId, date:init.date, time:init.time,
    location:init.location, chronology:init.chronology, officer:init.officer, officerId:init.officerId,
    witness:init.witness, status:init.status, verifyStatus:init.verifyStatus,
    sanksiLangsung:init.sanksiLangsung, evidence:init.evidence,
  } : blank);
  const set = (k: keyof F, v: string|undefined) => setF(p=>({...p,[k]:v}));
  const save = (e: React.FormEvent, vs?: Violation["verifyStatus"]) => {
    e.preventDefault();
    onSave({id:init?.id??genId(), ...f, verifyStatus: vs ?? f.verifyStatus});
  };
  const isPiket = currentUser.role === "guru_piket";

  return (
    <Modal title={init?"Edit Catatan Pelanggaran":"Catat Pelanggaran Baru"}
      sub={isPiket?`Dicatat oleh: ${currentUser.displayName}`:undefined} onClose={onClose} wide>
      <form onSubmit={e=>save(e)} className="p-5 space-y-4">
        <StudentSearch
          label="Siswa"
          students={students}
          value={f.studentId}
          onChange={id=>set("studentId",id)}
          placeholder="Cari nama atau NIS..."
          // Form catatan baru hanya menampilkan siswa berstatus aktif.
          // Fallback !archived dipakai untuk kompatibilitas data lama.
          // Saat mengedit catatan lama, siswa terkait tetap dapat terlihat.
          filter={s=>
            s.id===f.studentId ||
            (
              !s.archived &&
              s.status!=="lulus" &&
              !s.lulusYear
            )
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FSelect label="Jenis Pelanggaran" value={f.violationTypeId} onChange={e=>set("violationTypeId",e.target.value)} required>
            <option value="">Pilih pelanggaran...</option>
            {[...vts].sort(compareNewest).map(vt=><option key={vt.id} value={vt.id}>{vt.name} ({vt.points} poin)</option>)}
          </FSelect>
          {!isPiket && (
            <FSelect label="Status Tindak Lanjut" value={f.status} onChange={e=>set("status",e.target.value)}>
              <option value="belum">Belum Ditindaklanjuti</option>
              <option value="proses">Sedang Diproses</option>
              <option value="selesai">Sudah Selesai</option>
            </FSelect>
          )}
          <FInput label="Tanggal" type="date" value={f.date} onChange={e=>set("date",e.target.value)} required/>
          <FInput label="Waktu" type="time" value={f.time} onChange={e=>set("time",e.target.value)} required/>
          <FInput label="Lokasi Kejadian" value={f.location} onChange={e=>set("location",e.target.value)} placeholder="Contoh: Gerbang sekolah" required/>
          <FInput label="Nama Petugas" value={f.officer} onChange={e=>set("officer",e.target.value)} readOnly={isPiket} required/>
          <FInput label="Saksi" value={f.witness} onChange={e=>set("witness",e.target.value)}/>
        </div>
        <FTextarea label="Kronologi Kejadian" value={f.chronology} onChange={e=>set("chronology",e.target.value)} rows={3} required/>
        <FInput label="Sanksi Langsung yang Diberikan" value={f.sanksiLangsung} onChange={e=>set("sanksiLangsung",e.target.value)} placeholder="Contoh: Peringatan lisan, HP disita, dll."/>
        <EvidenceUpload value={f.evidence} onChange={b64=>set("evidence",b64)}/>

        <div className={`flex gap-3 pt-2 border-t border-border ${isPiket?"flex-col sm:flex-row":""}`}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          {isPiket ? (
            <>
              <button type="button" onClick={e=>save(e as unknown as React.FormEvent,"draft")}
                className="flex-1 py-2.5 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80">
                Simpan Draft
              </button>
              <button type="button" onClick={e=>save(e as unknown as React.FormEvent,"menunggu")}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 flex items-center justify-center gap-2">
                <Send size={13}/> Kirim Verifikasi
              </button>
            </>
          ) : (
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{init?"Simpan":"Catat Pelanggaran"}</button>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── CRUD Modals ───────────────────────────────────────────────────────────────
function StudentModal({ init, existingNis, onSave, onClose }: { init?: Student; existingNis: string[]; onSave:(s:Student)=>void; onClose:()=>void }) {
  type F = { nis:string; name:string; kelas:string; gender:"L"|"P"; parentName:string; parentPhone:string };
  const [f, setF] = useState<F>(init?{nis:init.nis,name:init.name,kelas:init.kelas,gender:init.gender,parentName:init.parentName,parentPhone:init.parentPhone}:{nis:"",name:"",kelas:"",gender:"L",parentName:"",parentPhone:""});
  const set = (k: keyof F, v: string) => setF(p=>({...p,[k]:v}));
  const nisDuplicate = f.nis.trim() !== "" && f.nis.trim() !== init?.nis && existingNis.includes(f.nis.trim());
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (nisDuplicate) return;
    onSave({id:init?.id??genId(),totalPoints:init?.totalPoints??0,...f});
  };
  return (
    <Modal title={init?"Edit Data Siswa":"Tambah Siswa Baru"} onClose={onClose}>
      <form onSubmit={save} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FInput label="NIS" value={f.nis} onChange={e=>set("nis",e.target.value)} placeholder="2024009" required/>
            {nisDuplicate&&<p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={11}/> NIS sudah terdaftar</p>}
          </div>
          <FSelect label="Jenis Kelamin" value={f.gender} onChange={e=>set("gender",e.target.value as "L"|"P")}>
            <option value="L">Laki-laki</option><option value="P">Perempuan</option>
          </FSelect>
        </div>
        <FInput label="Nama Lengkap" value={f.name} onChange={e=>set("name",e.target.value)} required/>
        <FSelect label="Kelas" value={f.kelas} onChange={e=>set("kelas",e.target.value)} required>
          <option value="">Pilih kelas...</option>{KELAS_OPTIONS.map(k=><option key={k}>{k}</option>)}
        </FSelect>
        <FInput label="Nama Orang Tua / Wali" value={f.parentName} onChange={e=>set("parentName",e.target.value)} required/>
        <FInput label="No. Telepon Orang Tua" value={f.parentPhone} onChange={e=>set("parentPhone",e.target.value)} required/>
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button type="submit" disabled={nisDuplicate} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">{init?"Simpan":"Tambah Siswa"}</button>
        </div>
      </form>
    </Modal>
  );
}
function CategoryModal({ init, onSave, onClose }: { init?: ViolationType; onSave:(vt:ViolationType)=>void; onClose:()=>void }) {
  type F = { name:string; description:string; category:"ringan"|"sedang"|"berat"; points:number; sanction:string };
  const [f,setF]=useState<F>(init?{name:init.name,description:init.description,category:init.category,points:init.points,sanction:init.sanction}:{name:"",description:"",category:"ringan",points:5,sanction:""});
  const set=(k: keyof F, v:string|number)=>setF(p=>({...p,[k]:v}));
  const save=(e: React.FormEvent)=>{e.preventDefault();onSave({id:init?.id??genId(),...f});};
  return (
    <Modal title={init?"Edit Jenis Pelanggaran":"Tambah Jenis Pelanggaran"} onClose={onClose}>
      <form onSubmit={save} className="p-5 space-y-4">
        <FInput label="Nama Pelanggaran" value={f.name} onChange={e=>set("name",e.target.value)} required/>
        <FTextarea label="Deskripsi" value={f.description} onChange={e=>set("description",e.target.value)} rows={2}/>
        <div className="grid grid-cols-2 gap-4">
          <FSelect label="Kategori" value={f.category} onChange={e=>set("category",e.target.value)}>
            <option value="ringan">Ringan</option><option value="sedang">Sedang</option><option value="berat">Berat</option>
          </FSelect>
          <FInput label="Poin" type="number" min={1} max={100} value={f.points} onChange={e=>set("points",Number(e.target.value))} required/>
        </div>
        <FInput label="Sanksi / Tindak Lanjut" value={f.sanction} onChange={e=>set("sanction",e.target.value)} required/>
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{init?"Simpan":"Tambah"}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function LoginView({ onLoginSuccess, onPublic }: { onLoginSuccess:(u:AppUser)=>void; onPublic:()=>void }) {
  const [email,setEmail]=useState(""); const [pwd,setPwd]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { user, token } = await api.login(email, pwd);
      api.setToken(token);
      onLoginSuccess(user);
    } catch (e) {
      setErr(api.apiErrorMessage(e, "Email atau password tidak valid."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden flex"
      style={{
        fontFamily:"'Inter',sans-serif",
        background:"linear-gradient(135deg,#eaf3ed 0%,#f7f5ef 48%,#e9f1ec 100%)",
      }}
    >
      {/* Background dekoratif khusus tablet/HP */}
      <div className="lg:hidden absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:"linear-gradient(155deg,#173829 0%,#285f47 48%,#3d8261 100%)",
          }}
        />
        <div className="absolute -top-28 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl"/>
        <div className="absolute top-[42%] -left-24 w-64 h-64 rounded-full bg-emerald-200/10 blur-3xl"/>
        <div className="absolute -bottom-28 right-[-30px] w-80 h-80 rounded-full bg-amber-200/10 blur-3xl"/>
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
          <defs>
            <pattern id="loginDotsMobile" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginDotsMobile)"/>
        </svg>
      </div>

      {/* Panel informasi desktop */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{background:"linear-gradient(160deg,#1a3528 0%,#2d6a4f 55%,#3a8a65 100%)"}}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white/5 translate-x-1/3 -translate-y-1/3"/>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/5 -translate-x-1/3 translate-y-1/3"/>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div className="relative flex flex-col h-full p-12 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 p-0.5">
              <ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">SMAN 2 Pangkalan Kuras</p>
              <p className="text-white/50 text-xs">Kab. Pelalawan, Riau</p>
            </div>
          </div>

          <div className="text-white">
            <h1
              className="text-4xl font-bold leading-tight mb-3"
              style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}
            >
              Sistem Poin<br/>Pelanggaran Siswa
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs mb-10">
              Platform pengelolaan tata tertib siswa — pencatatan, verifikasi,
              pembinaan, dan laporan resmi dalam satu sistem terintegrasi.
            </p>

            <div className="space-y-3">
              {[
                {role:"Admin Sekolah",desc:"Akses penuh: verifikasi, laporan, manajemen data",icon:Shield},
                {role:"Guru Piket / Tim Disiplin",desc:"Catat pelanggaran, unggah bukti, kirim verifikasi",icon:UserCheck},
              ].map(r=>(
                <div key={r.role} className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <r.icon size={14} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{r.role}</p>
                    <p className="text-[10px] text-white/45 leading-snug">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/25 text-xs">© 2026 SMAN 2 Pangkalan Kuras</p>
        </div>
      </div>

      {/* Area formulir */}
      <div className="flex-1 relative z-10 flex items-center justify-center px-4 py-7 sm:p-8 lg:p-10">
        <div
          className="
            relative w-full max-w-md
            rounded-[28px] border border-white/55
            bg-white/[0.96] backdrop-blur-xl
            shadow-[0_24px_70px_rgba(4,25,15,0.28)]
            px-5 py-6 sm:px-8 sm:py-8
            lg:max-w-sm lg:rounded-none lg:border-0 lg:bg-transparent
            lg:backdrop-blur-none lg:shadow-none lg:p-0
          "
        >
          {/* Aksen atas hanya pada perangkat kecil */}
          <div className="lg:hidden absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r from-emerald-300 via-amber-300 to-emerald-300"/>

          <div className="lg:hidden flex items-center gap-3 mb-7 pt-1">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-100 p-0.5 shadow-sm">
              <ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/>
            </div>
            <div>
              <p className="font-bold text-[15px] leading-tight text-slate-900">SMAN 2 Pangkalan Kuras</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sistem Poin Pelanggaran Siswa</p>
            </div>
          </div>

          <div className="mb-7">
            <div className="lg:hidden inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-4">
              <Shield size={11}/> Portal Petugas
            </div>
            <h2
              className="text-2xl sm:text-[28px] font-bold mb-1.5 text-slate-900"
              style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}
            >
              Masuk ke Sistem
            </h2>
            <p className="text-sm text-muted-foreground">
              Gunakan akun yang diberikan oleh admin sekolah
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <FInput
              label="Email"
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="email@sman2.sch.id"
              autoComplete="username"
              required
            />
            <FInput
              label="Password"
              type="password"
              value={pwd}
              onChange={e=>setPwd(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            {err&&(
              <div className="text-xs text-destructive flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0"/> {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="
                w-full py-3 bg-primary text-primary-foreground rounded-xl
                text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5
                hover:shadow-lg active:translate-y-0 transition-all duration-200
                disabled:opacity-60 disabled:transform-none
              "
            >
              {busy?"Memeriksa...":"Masuk"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border/80 text-center">
            <button
              onClick={onPublic}
              className="flex items-center gap-2 mx-auto text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Search size={13}/> Cek Poin Tanpa Login
            </button>
          </div>

          <div className="mt-5 bg-[#f4f2ec] border border-black/[0.03] rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Akun Demo</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
              <span className="font-mono">admin@sman2.sch.id</span> / <span className="font-mono">admin123</span> — Admin
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
              <span className="font-mono">hadi@sman2.sch.id</span> / <span className="font-mono">piket123</span> — Guru Piket
            </p>
          </div>

          <p className="lg:hidden text-center text-[10px] text-white/45 absolute -bottom-8 left-0 right-0">
            © 2026 SMAN 2 Pangkalan Kuras
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Public View ───────────────────────────────────────────────────────────────
function PublicView({ onBack }: { onBack:()=>void }) {
  const [nis,setNis]=useState(""); const [result,setResult]=useState<Awaited<ReturnType<typeof api.publicLookup>>|null|"not-found">(null);
  const [busy,setBusy]=useState(false);
  const [displayedPoints,setDisplayedPoints]=useState(0);
  const [resultReady,setResultReady]=useState(false);

  const movePublicHero = (e: React.MouseEvent<HTMLElement>) => {
    const section=e.currentTarget;
    const rect=section.getBoundingClientRect();
    const x=((e.clientX-rect.left)/rect.width)*100;
    const y=((e.clientY-rect.top)/rect.height)*100;
    const dx=(x-50)/50;
    const dy=(y-50)/50;

    section.style.setProperty("--cursor-x",`${x}%`);
    section.style.setProperty("--cursor-y",`${y}%`);
    section.style.setProperty("--parallax-x",`${dx*18}px`);
    section.style.setProperty("--parallax-y",`${dy*14}px`);
    section.style.setProperty("--parallax-x-reverse",`${dx*-12}px`);
    section.style.setProperty("--parallax-y-reverse",`${dy*-9}px`);
    section.style.setProperty("--card-x",`${dx*7}px`);
    section.style.setProperty("--card-y",`${dy*5}px`);
    section.style.setProperty("--tilt-x",`${dy*-2.2}deg`);
    section.style.setProperty("--tilt-y",`${dx*3}deg`);
  };

  const resetPublicHero = (e: React.MouseEvent<HTMLElement>) => {
    const section=e.currentTarget;
    section.style.setProperty("--cursor-x","50%");
    section.style.setProperty("--cursor-y","50%");
    section.style.setProperty("--parallax-x","0px");
    section.style.setProperty("--parallax-y","0px");
    section.style.setProperty("--parallax-x-reverse","0px");
    section.style.setProperty("--parallax-y-reverse","0px");
    section.style.setProperty("--card-x","0px");
    section.style.setProperty("--card-y","0px");
    section.style.setProperty("--tilt-x","0deg");
    section.style.setProperty("--tilt-y","0deg");
  };

  useEffect(() => {
    const elements=Array.from(
      document.querySelectorAll<HTMLElement>(
        ".public-scroll-reveal, .public-guide-reveal"
      )
    );

    if(!("IntersectionObserver" in window)){
      elements.forEach(element=>element.classList.add("public-scroll-reveal-visible"));
      return;
    }

    const observer=new IntersectionObserver(
      entries=>{
        entries.forEach(entry=>{
          if(!entry.isIntersecting) return;

          const element=entry.target as HTMLElement;
          const delay=Number(element.dataset.revealDelay||0);
          element.style.transitionDelay=`${delay}ms`;

          requestAnimationFrame(()=>{
            requestAnimationFrame(()=>{
              element.classList.add("public-scroll-reveal-visible");
              observer.unobserve(element);
            });
          });
        });
      },
      {
        threshold:0.06,
        rootMargin:"0px 0px 8% 0px",
      }
    );

    elements.forEach(element=>{
      if(!element.classList.contains("public-scroll-reveal-visible")){
        observer.observe(element);
      }
    });

    return()=>observer.disconnect();
  },[result]);

  useEffect(() => {
    let animationFrame=0;
    let readyTimer=0;

    if(!result||result==="not-found"){
      setDisplayedPoints(0);
      setResultReady(false);
      return;
    }

    const total=Math.max(0,Number(result.total_poin)||0);
    const duration=950;
    const startedAt=performance.now();

    setDisplayedPoints(0);
    setResultReady(false);
    readyTimer=window.setTimeout(()=>setResultReady(true),70);

    const animate=(now:number)=>{
      const progress=Math.min((now-startedAt)/duration,1);
      const eased=1-Math.pow(1-progress,4);
      setDisplayedPoints(Math.round(total*eased));

      if(progress<1){
        animationFrame=requestAnimationFrame(animate);
      }
    };

    animationFrame=requestAnimationFrame(animate);

    return()=>{
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(readyTimer);
    };
  },[result]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api.publicLookup(nis.trim());
      setResult(data);
      setNis("");
    } catch {
      setResult("not-found");
    } finally {
      setBusy(false);
      setTimeout(()=>document.getElementById("hasil")?.scrollIntoView({behavior:"smooth",block:"start"}),100);
    }
  };
  const sv = result&&result!=="not-found" ? result.riwayat_pelanggaran : [];

  return (
    <div className="min-h-screen" style={{background:"#f5f4f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        .public-scroll-reveal{
          opacity:0;
          transform:translate3d(0,38px,0);
          filter:blur(5px);
          transition:
            opacity 720ms cubic-bezier(.22,1,.36,1),
            transform 760ms cubic-bezier(.22,1,.36,1),
            filter 680ms ease;
          will-change:opacity,transform,filter;
        }

        .public-scroll-reveal[data-reveal-direction="left"]{
          transform:translate3d(-48px,18px,0);
        }

        .public-scroll-reveal[data-reveal-direction="right"]{
          transform:translate3d(48px,18px,0);
        }

        .public-scroll-reveal[data-reveal-direction="scale"]{
          transform:translate3d(0,28px,0) scale(.965);
        }

        .public-scroll-reveal.public-scroll-reveal-visible{
          opacity:1;
          transform:translate3d(0,0,0) scale(1);
          filter:blur(0);
        }

        /*
         * Animasi Panduan dibuat ringan:
         * hanya opacity dan translateY agar tetap halus pada laptop maupun HP.
         */
        .public-guide-reveal{
          opacity:0;
          transform:translate3d(0,14px,0);
          transition:
            opacity 760ms cubic-bezier(.2,.8,.2,1),
            transform 900ms cubic-bezier(.2,.8,.2,1),
            box-shadow 280ms ease,
            border-color 280ms ease!important;
          backface-visibility:hidden;
          will-change:opacity,transform;
        }

        .public-guide-title{
          transform:translate3d(0,10px,0);
        }

        .public-guide-reveal.public-scroll-reveal-visible{
          opacity:1;
          transform:translate3d(0,0,0);
        }

        .public-guide-card.public-scroll-reveal-visible:hover{
          transform:translate3d(0,-4px,0)!important;
          border-color:rgba(45,106,79,.22);
          box-shadow:0 12px 28px rgba(26,53,40,.10);
        }

        .public-guide-card.public-scroll-reveal-visible:active{
          transform:translate3d(0,-2px,0)!important;
          transition-duration:120ms!important;
        }

        .public-guide-icon{
          transition:transform 320ms cubic-bezier(.2,.8,.2,1);
        }

        .public-guide-card.public-scroll-reveal-visible:hover .public-guide-icon{
          transform:translate3d(0,-1px,0) scale(1.04);
        }

        .public-hover-grow{
          position:relative;
          z-index:1;
          cursor:default;
          transition:
            opacity 720ms cubic-bezier(.22,1,.36,1),
            transform 260ms cubic-bezier(.22,1,.36,1),
            filter 680ms ease,
            box-shadow 260ms ease,
            border-color 260ms ease!important;
          transform-origin:center;
        }

        .public-hover-grow.public-scroll-reveal-visible:hover{
          transform:translate3d(0,-5px,0) scale(1.045)!important;
          z-index:20;
          box-shadow:0 16px 34px rgba(26,53,40,.14);
        }

        .public-hover-grow.public-scroll-reveal-visible:active{
          transform:translate3d(0,-2px,0) scale(1.025)!important;
          transition-duration:100ms!important;
        }

        @keyframes publicResultShellEnter{
          0%{opacity:0;transform:translate3d(0,38px,0) scale(.965);filter:blur(9px)}
          62%{opacity:1;transform:translate3d(0,-4px,0) scale(1.008);filter:blur(0)}
          100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}
        }

        @keyframes publicResultHeaderEnter{
          0%{opacity:0;transform:translateX(-28px)}
          100%{opacity:1;transform:translateX(0)}
        }

        @keyframes publicResultCardEnter{
          0%{opacity:0;transform:translate3d(0,28px,0) scale(.96)}
          70%{opacity:1;transform:translate3d(0,-3px,0) scale(1.008)}
          100%{opacity:1;transform:translate3d(0,0,0) scale(1)}
        }

        @keyframes publicResultSweep{
          0%{transform:translateX(-140%) skewX(-18deg);opacity:0}
          18%{opacity:1}
          100%{transform:translateX(175%) skewX(-18deg);opacity:0}
        }

        @keyframes publicResultAvatarPop{
          0%{opacity:0;transform:scale(.35) rotate(-14deg)}
          58%{opacity:1;transform:scale(1.16) rotate(5deg)}
          78%{transform:scale(.94) rotate(-2deg)}
          100%{opacity:1;transform:scale(1) rotate(0)}
        }

        @keyframes publicResultAvatarRing{
          0%{opacity:.55;transform:scale(.72)}
          100%{opacity:0;transform:scale(1.55)}
        }

        @keyframes publicResultNumberPop{
          0%{opacity:0;transform:translateY(16px) scale(.7)}
          65%{opacity:1;transform:translateY(-3px) scale(1.1)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }

        @keyframes publicResultHistoryEnter{
          0%{opacity:0;transform:translateY(24px)}
          100%{opacity:1;transform:translateY(0)}
        }

        @keyframes publicResultRowEnter{
          0%{opacity:0;transform:translateX(-22px)}
          72%{opacity:1;transform:translateX(4px)}
          100%{opacity:1;transform:translateX(0)}
        }

        @keyframes publicResultNotFoundShake{
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-7px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(3px)}
        }

        .public-result-shell{
          animation:publicResultShellEnter 820ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-heading{
          animation:publicResultHeaderEnter 560ms 100ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-main-card{
          position:relative;
          isolation:isolate;
          animation:publicResultCardEnter 720ms 160ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-main-card::after{
          content:"";
          position:absolute;
          inset:-35% auto -35% -24%;
          width:30%;
          pointer-events:none;
          z-index:5;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.66),transparent);
          animation:publicResultSweep 1150ms 360ms ease-out both;
        }

        .public-result-avatar{
          position:relative;
          animation:publicResultAvatarPop 760ms 300ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-avatar::after{
          content:"";
          position:absolute;
          inset:-5px;
          border-radius:18px;
          border:2px solid rgba(45,106,79,.28);
          animation:publicResultAvatarRing 980ms 620ms ease-out both;
          pointer-events:none;
        }

        .public-result-number{
          animation:publicResultNumberPop 720ms 380ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-progress{
          width:0;
          transition:width 1100ms 360ms cubic-bezier(.22,1,.36,1);
          position:relative;
          overflow:hidden;
        }

        .public-result-progress::after{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
          transform:translateX(-100%);
          animation:publicResultSweep 1200ms 620ms ease-out both;
        }

        .public-result-history{
          opacity:0;
          animation:publicResultHistoryEnter 660ms 470ms cubic-bezier(.22,1,.36,1) forwards;
        }

        .public-result-row{
          opacity:0;
          animation:publicResultRowEnter 560ms cubic-bezier(.22,1,.36,1) forwards;
          transition:background-color 180ms ease,transform 180ms ease;
        }

        .public-result-row:hover{
          background:rgba(45,106,79,.045);
          transform:translateX(5px);
        }

        .public-result-not-found{
          animation:
            publicResultCardEnter 620ms 120ms cubic-bezier(.22,1,.36,1) both,
            publicResultNotFoundShake 480ms 680ms ease both;
        }

        .public-result-not-found-icon{
          animation:publicResultAvatarPop 720ms 260ms cubic-bezier(.22,1,.36,1) both;
        }

        @media (prefers-reduced-motion:reduce){
          .public-scroll-reveal,
          .public-result-shell,
          .public-result-heading,
          .public-result-main-card,
          .public-result-avatar,
          .public-result-number,
          .public-result-history,
          .public-result-row,
          .public-result-not-found,
          .public-result-not-found-icon,
          .public-guide-reveal,
          .public-guide-icon{
            opacity:1!important;
            transform:none!important;
            filter:none!important;
            animation:none!important;
            transition:none!important;
          }

          .public-result-progress{
            transition:none!important;
          }

          .public-result-main-card::after,
          .public-result-avatar::after,
          .public-result-progress::after{
            display:none!important;
          }
        }
      `}</style>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"><ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/></div>
            <div>
              <p className="text-sm font-bold leading-tight">SMAN 2 Pangkalan Kuras</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Portal Informasi Poin Siswa</p>
            </div>
          </div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 hover:bg-primary/15 hover:-translate-y-0.5 hover:shadow-md px-4 py-2 rounded-lg transition-all duration-200"><Shield size={12}/> Login Petugas</button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 lg:py-28"
        onMouseMove={movePublicHero}
        onMouseLeave={resetPublicHero}
        style={{background:"linear-gradient(150deg,#1a3528 0%,#2d6a4f 55%,#3a8a65 100%)"}}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:"radial-gradient(circle 280px at var(--cursor-x,50%) var(--cursor-y,50%),rgba(255,255,255,0.15),rgba(255,255,255,0.04) 38%,transparent 72%)",
            }}
          />
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10"
            style={{
              transform:"translate3d(var(--parallax-x,0px),var(--parallax-y,0px),0)",
              transition:"transform 120ms ease-out",
              willChange:"transform",
            }}
          />
          <div
            className="absolute top-16 right-16 w-52 h-52 rounded-full border border-white/7"
            style={{
              transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y-reverse,0px),0)",
              transition:"transform 160ms ease-out",
              willChange:"transform",
            }}
          />
          <div
            className="absolute left-[8%] bottom-[16%] w-28 h-28 rounded-full bg-amber-300/5 blur-xl"
            style={{
              transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y,0px),0)",
              transition:"transform 180ms ease-out",
              willChange:"transform",
            }}
          />
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.045]"
            style={{
              transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y-reverse,0px),0) scale(1.03)",
              transition:"transform 220ms ease-out",
              willChange:"transform",
            }}
          >
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
        </div>
        <div className="relative w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div
              className="text-white"
              style={{
                transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y-reverse,0px),0)",
                transition:"transform 180ms ease-out",
                willChange:"transform",
              }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/><span>Portal Resmi SMAN 2 Pangkalan Kuras</span></div>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Sistem Poin<br/><span style={{color:"#fbbf24"}}>Pelanggaran Siswa</span></h1>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">Orang tua dan siswa dapat memantau catatan pelanggaran, total poin, dan status sanksi secara transparan melalui portal ini.</p>
              <div className="flex flex-wrap gap-4 text-xs text-white/55">
                {[{I:CheckCircle,l:"Tanpa perlu login"},{I:Shield,l:"Data terverifikasi"},{I:Clock,l:"Informasi real-time"}].map(({I,l})=>(
                  <span key={l} className="flex items-center gap-1.5"><I size={12} style={{color:"#fbbf24"}}/> {l}</span>
                ))}
              </div>
            </div>
            <div>
              <div
                className="bg-white rounded-2xl shadow-2xl p-7 border border-white/10"
                style={{
                  transform:"perspective(1200px) translate3d(var(--card-x,0px),var(--card-y,0px),0) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))",
                  transition:"transform 140ms ease-out,box-shadow 180ms ease",
                  transformStyle:"preserve-3d",
                  willChange:"transform",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Search size={17} className="text-primary"/></div>
                  <div><p className="text-sm font-semibold">Cek Poin Siswa</p><p className="text-xs text-muted-foreground">Masukkan NIS untuk melihat data</p></div>
                </div>
                <form onSubmit={search} className="space-y-4">
                  <FInput label="Nomor Induk Siswa (NIS)" value={nis} onChange={e=>setNis(e.target.value)} placeholder="Contoh: 2024001" required/>
                  <button type="submit" disabled={busy} className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 transition-all duration-200 flex items-center gap-2 justify-center disabled:opacity-60 disabled:transform-none"><Search size={14}/> {busy?"Mencari...":"Cari Data Siswa"}</button>
                </form>
                <p className="text-center text-xs text-muted-foreground mt-4">Data dijaga kerahasiaannya · Hanya catatan terverifikasi</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" className="w-full block"><path d="M0 50L480 15L960 40L1440 0V50H0Z" fill="#f5f4f0"/></svg></div>
      </section>

      {/* Info singkat */}
      <section className="py-8 bg-white/70 border-b border-border">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {l:"Tanpa perlu login",       I:Search,        c:"text-primary bg-primary/10"},
            {l:"Hanya data terverifikasi",I:Shield,        c:"text-amber-600 bg-amber-50"},
            {l:"Informasi real-time",     I:Clock,         c:"text-sky-600 bg-sky-50"},
          ].map((item,index)=>(
            <div
              key={item.l}
              data-reveal-delay={index*110}
              data-reveal-direction="scale"
              className="public-scroll-reveal bg-card rounded-xl border border-border p-4 flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.c}`}><item.I size={16}/></div>
              <p className="text-sm font-medium leading-snug">{item.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search result */}
      {result&&(
        <section key={result==="not-found"?"not-found":result.nis} id="hasil" aria-live="polite" className="public-result-shell py-10">
          <div className="max-w-2xl mx-auto px-5 space-y-4">
            <div className="public-result-heading flex items-center justify-between">
              <h2 className="font-semibold text-sm">Hasil Pencarian</h2>
              <button onClick={()=>{setResult(null);setNis("");window.scrollTo({top:0,behavior:"smooth"});}} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft size={11}/> Cari ulang</button>
            </div>
            {result==="not-found"?(
              <div className="public-result-not-found bg-card border border-red-200 rounded-2xl p-10 text-center shadow-sm">
                <div className="public-result-not-found-icon w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-red-400"/></div>
                <p className="font-semibold text-red-700">Siswa tidak ditemukan</p>
                <p className="text-sm text-red-400 mt-1">Periksa kembali NIS yang dimasukkan</p>
              </div>
            ):(()=>{
              const sanct=getSanction(result.total_poin);
              return (<>
                <div className="public-result-main-card bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="h-1.5" style={{backgroundColor:sanct.bar}}/>
                  <div className="p-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="public-result-avatar w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">{result.nama[0]}</div>
                      <div>
                        <h3 className="font-bold text-lg">{result.nama}</h3>
                        <p className="text-sm text-muted-foreground">{result.kelas} · NIS <span className="font-mono">{result.nis}</span></p>
                        <Chip cls={`${sanct.bg} ${sanct.text} ${sanct.border} mt-2`}><Shield size={10}/> {result.status_kedisiplinan}</Chip>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="public-result-number text-4xl font-bold tabular-nums" style={{color:sanct.bar,fontFamily:"'JetBrains Mono',monospace"}}>{displayedPoints}</p>
                      <p className="text-xs text-muted-foreground">total poin</p>
                    </div>
                  </div>
                  <div className="px-6 pb-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="public-result-progress h-full rounded-full" style={{width:resultReady?`${Math.min((result.total_poin/100)*100,100)}%`:"0%",backgroundColor:sanct.bar}}/>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>0 poin</span><span>100+ poin</span></div>
                  </div>
                </div>
                <div className="public-result-history bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Riwayat Pelanggaran Terverifikasi</h4>
                    <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">{sv.length} catatan</span>
                  </div>
                  {sv.length===0?(
                    <div className="py-12 text-center"><CheckCircle size={28} className="text-emerald-400 mx-auto mb-3"/><p className="text-sm font-medium text-emerald-700">Belum ada catatan pelanggaran terverifikasi</p></div>
                  ):(
                    <div className="divide-y divide-border">
                      {sv.map((v,i)=>(
                        <div key={i} className="public-result-row px-5 py-4 flex items-start gap-4" style={{animationDelay:`${620+(i*90)}ms`}}>
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5">{i+1}</div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div><p className="text-sm font-medium">{v.jenis_pelanggaran}</p><p className="text-xs text-muted-foreground">{fmtDate(v.tanggal)}</p></div>
                              <p className="text-sm font-bold text-destructive flex-shrink-0">+{v.poin}</p>
                            </div>
                            <Chip cls={`${getCatCls(v.kategori||"")} mt-2`}>{v.kategori}</Chip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>);
            })()}
          </div>
        </section>
      )}

      {/* Cara menggunakan */}
      <section className="py-16 border-t border-border">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div data-reveal-delay="20" className="public-guide-reveal public-guide-title text-center mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Panduan</p>
            <h2 className="text-2xl font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cara Menggunakan</h2>
            <p className="text-sm text-muted-foreground mt-2">Tiga langkah mudah untuk melihat data poin siswa</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {n:"01",t:"Siapkan NIS",d:"Nomor Induk Siswa (NIS) dapat dilihat di kartu pelajar, buku rapor, atau hubungi wali kelas.",I:BookOpen,c:"bg-primary/10 text-primary"},
              {n:"02",t:"Masukkan NIS",d:"Ketikkan NIS pada kolom pencarian di atas, lalu tekan tombol Cari Data Siswa.",I:Search,c:"bg-amber-50 text-amber-600"},
              {n:"03",t:"Lihat Hasilnya",d:"Sistem menampilkan total poin, status sanksi, dan riwayat pelanggaran yang sudah terverifikasi.",I:Eye,c:"bg-emerald-50 text-emerald-600"},
            ].map((i,index)=>(
              <div
                key={i.n}
                data-reveal-delay={80+(index*70)}
                className="public-guide-reveal public-guide-card relative bg-card rounded-2xl border border-border p-6"
              >
                <span className="absolute top-5 right-5 text-5xl font-bold text-primary/5 select-none" style={{fontFamily:"'JetBrains Mono',monospace"}}>{i.n}</span>
                <div className={`public-guide-icon w-11 h-11 ${i.c} rounded-xl flex items-center justify-center mb-4`}><i.I size={20}/></div>
                <h3 className="font-semibold mb-2">{i.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{i.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tentang sistem */}
      <section className="py-12 border-t border-border bg-white/50">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div data-reveal-direction="left" className="public-scroll-reveal">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Tentang Sistem</p>
              <h2 className="text-2xl font-bold mb-4" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Sistem Pengelolaan Tata Tertib Sekolah</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">Sistem Poin Pelanggaran Siswa SMAN 2 Pangkalan Kuras dirancang untuk menciptakan tata tertib yang transparan, terukur, dan berkeadilan. Setiap pelanggaran dicatat oleh Guru Piket, diverifikasi oleh Admin, dan dapat dipantau langsung oleh orang tua.</p>
              <div className="grid grid-cols-2 gap-3">
                {[{t:"Transparan",d:"Orang tua dapat memantau langsung"},{t:"Terverifikasi",d:"Setiap catatan melalui proses verifikasi"},{t:"Terstruktur",d:"Sanksi berdasarkan akumulasi poin"},{t:"Terdokumentasi",d:"Laporan resmi dapat dicetak kapan saja"}].map((i,index)=>(
                  <div
                    key={i.t}
                    data-reveal-delay={180+(index*80)}
                    data-reveal-direction="scale"
                    className="public-scroll-reveal public-hover-grow bg-card rounded-xl border border-border p-3 hover:border-primary/30"
                  >
                    <div className="flex items-center gap-2 mb-1"><CheckCircle size={12} className="text-primary flex-shrink-0"/><p className="text-xs font-semibold">{i.t}</p></div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{i.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div data-reveal-direction="right" data-reveal-delay="130" className="public-scroll-reveal space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ketentuan Sanksi</p>
              {[{r:"1–19 poin",s:"Peringatan Lisan",c:"bg-sky-50 border-sky-200 text-sky-700",bar:"bg-sky-400"},{r:"20–49 poin",s:"Surat Peringatan 1",c:"bg-amber-50 border-amber-200 text-amber-700",bar:"bg-amber-400"},{r:"50–74 poin",s:"SP 2 + Panggilan Orang Tua",c:"bg-orange-50 border-orange-200 text-orange-700",bar:"bg-orange-400"},{r:"75–99 poin",s:"Pembinaan Khusus",c:"bg-red-50 border-red-200 text-red-700",bar:"bg-red-400"},{r:"≥ 100 poin",s:"Tindakan Disiplin Sekolah",c:"bg-red-100 border-red-400 text-red-900",bar:"bg-red-700"}].map((i,index)=>(
                <div
                  key={i.r}
                  data-reveal-delay={180+(index*75)}
                  data-reveal-direction="right"
                  className={`public-scroll-reveal public-hover-grow flex items-center gap-3 border rounded-xl px-4 py-3 ${i.c}`}
                >
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 ${i.bar}`}/>
                  <div className="flex-1"><p className="text-xs font-semibold">{i.s}</p></div>
                  <span className="text-[10px] font-mono font-bold opacity-70">{i.r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10" style={{background:"#1a3528"}}>
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div data-reveal-direction="scale" className="public-scroll-reveal grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10"><ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/></div>
                <p className="text-sm font-bold text-white">SMAN 2 Pangkalan Kuras</p>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">Sistem Pengelolaan Poin Pelanggaran Siswa — alat bantu transparansi tata tertib sekolah berbasis digital.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Kontak Sekolah</p>
              <div className="space-y-1.5 text-xs text-white/45">
                <p>Jl. Lintas Timur KM. 102 Terantang Manuk</p>
                <p>Kab. Pelalawan, Riau 28382</p>
                <p className="mt-2">NSS: 301040605018 · NPSN: 10494082</p>
                <p>Email: pklkuras@yahoo.co.id</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Jam Pelayanan</p>
              <div className="space-y-1.5 text-xs text-white/45">
                <p>Senin – Jumat: 07.00 – 15.00 WIB</p>
                <p>Sabtu: 07.00 – 12.00 WIB</p>
                <p className="mt-2 font-semibold text-white/60">Akreditasi: A</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/25">
            <p>© 2026 | Designed & Developed by @Rw0daa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Admin Sidebar ─────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { label:"Utama",        items:[{id:"dashboard",   label:"Dashboard",           icon:LayoutDashboard}] },
  { label:"Akademik",     items:[{id:"students",    label:"Data Siswa",           icon:Users}] },
  { label:"Pelanggaran",  items:[{id:"violations",  label:"Pencatatan & Verifikasi", icon:ClipboardList}] },
  { label:"Pembinaan",    items:[{id:"guidance",    label:"Jurnal Bimbingan",     icon:BookMarked},{id:"summons",label:"Panggilan Orang Tua",icon:PhoneCall}] },
  { label:"Administrasi", items:[{id:"reports",label:"Laporan & Cetak",icon:FileText},{id:"settings",label:"Pengaturan",icon:Settings}] },
];
const PIKET_NAV = [
  { label:"Menu", items:[{id:"piket_kasus", label:"Kasus Saya", icon:ClipboardList},{id:"piket_bimbingan",label:"Tugas Bimbingan",icon:BookMarked}] },
];

function Sidebar({ view, onNav, onLogout, currentUser, badge, isMobile, onClose }: {
  view: string; onNav:(v:string)=>void; onLogout:()=>void; currentUser: AppUser;
  badge?: Record<string,number>; isMobile?:boolean; onClose?:()=>void;
}) {
  const navGroups = currentUser.role === "admin" ? ADMIN_NAV : PIKET_NAV;
  let sequence = 0;

  return (
    <div
      className={`app-sidebar-panel relative isolate flex flex-col h-full flex-shrink-0 overflow-hidden ${
        isMobile ? "w-full" : "w-[220px]"
      }`}
      style={{background:"linear-gradient(180deg,#173729 0%,#1a3528 55%,#10291e 100%)"}}
    >
      <div className="sidebar-ambient pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="sidebar-orb sidebar-orb-one"/>
        <div className="sidebar-orb sidebar-orb-two"/>
        <div className="sidebar-grid-pattern"/>
      </div>

      <div
        className={`sidebar-brand px-4 border-b flex items-center justify-between ${
          isMobile ? "min-h-[72px] py-3.5" : "min-h-[66px] py-3"
        }`}
        style={{borderColor:"rgba(255,255,255,0.08)"}}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="sidebar-logo w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 border border-white/10 p-0.5 shadow-lg">
            <ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight truncate">SMAN 2 PKK</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{color:"rgba(200,222,206,0.55)"}}>Pangkalan Kuras</p>
          </div>
        </div>

        {isMobile&&onClose&&(
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="sidebar-close-button w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.06] hover:bg-white/12 active:scale-90 transition-all"
            style={{color:"rgba(235,248,239,0.78)"}}
          >
            <X size={17}/>
          </button>
        )}
      </div>

      <div className="sidebar-role px-3.5 py-3 border-b" style={{borderColor:"rgba(255,255,255,0.06)"}}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          currentUser.role==="admin"
            ? "bg-emerald-300/10 border-emerald-200/10"
            : "bg-amber-400/10 border-amber-300/10"
        }`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            currentUser.role==="admin" ? "bg-emerald-300/10" : "bg-amber-300/10"
          }`}>
            {currentUser.role==="admin"
              ? <Shield size={12} className="text-emerald-300"/>
              : <UserCheck size={12} className="text-amber-300"/>
            }
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold ${
              currentUser.role==="admin" ? "text-emerald-200" : "text-amber-200"
            }`}>
              {currentUser.role==="admin"?"Admin Sekolah":"Guru Piket"}
            </p>
            <p className="text-[9px] truncate" style={{color:"rgba(200,222,206,0.36)"}}>
              {currentUser.role==="admin"?"Pengelola utama sistem":"Tim pencatatan disiplin"}
            </p>
          </div>
        </div>
      </div>

      <nav className={`sidebar-nav flex-1 overflow-y-auto overscroll-contain px-2.5 space-y-4 ${
        isMobile ? "py-4" : "py-3"
      }`}>
        {navGroups.map((group,groupIndex)=>(
          <div
            key={group.label}
            className="sidebar-nav-group"
            style={{animationDelay:`${80+(groupIndex*85)}ms`,transitionDelay:`${80+(groupIndex*70)}ms`}}
          >
            <p
              className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.17em]"
              style={{color:"rgba(200,222,206,0.34)"}}
            >
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map(item=>{
                const active=view===item.id;
                const itemSequence=sequence++;
                const itemBadge=badge?.[item.id]||0;

                return(
                  <button
                    key={item.id}
                    type="button"
                    onClick={()=>{onNav(item.id);onClose?.();}}
                    aria-current={active?"page":undefined}
                    className={`sidebar-nav-item group relative w-full ${
                      isMobile ? "min-h-[46px] px-3.5" : "min-h-[42px] px-3"
                    } py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium text-left overflow-hidden ${
                      active ? "sidebar-nav-item-active text-white" : "text-emerald-50/55 hover:text-white"
                    }`}
                    style={{animationDelay:`${130+(itemSequence*36)}ms`}}
                  >
                    <span className="sidebar-active-line" aria-hidden="true"/>

                    <span className={`sidebar-nav-icon w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      active ? "bg-emerald-300/15 text-emerald-300" : "bg-white/[0.035]"
                    }`}>
                      <item.icon size={14}/>
                    </span>

                    <span className="flex-1 truncate">{item.label}</span>

                    {itemBadge>0&&(
                      <span className="sidebar-badge bg-amber-400 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[19px] text-center leading-tight shadow-sm">
                        {itemBadge}
                      </span>
                    )}

                    <ChevronRight
                      size={12}
                      className={`sidebar-nav-chevron flex-shrink-0 ${
                        active ? "opacity-70 translate-x-0" : "opacity-0 -translate-x-1"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-user p-3 border-t" style={{borderColor:"rgba(255,255,255,0.08)"}}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.025] border border-white/[0.04]">
          <div className="sidebar-user-avatar w-8 h-8 rounded-full bg-emerald-300/15 border border-emerald-200/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {currentUser.displayName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{currentUser.displayName}</p>
            <p className="text-[10px] truncate" style={{color:"rgba(200,222,206,0.4)"}}>
              {currentUser.role==="admin"?"Superadmin":"Tim Disiplin"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`sidebar-logout mt-1.5 w-full flex items-center gap-2.5 px-3 rounded-xl text-xs hover:bg-red-400/10 hover:text-red-200 active:scale-[0.98] transition-all ${
            isMobile ? "min-h-[46px]" : "min-h-[40px]"
          }`}
          style={{color:"rgba(200,222,206,0.45)"}}
        >
          <LogOut size={13}/> Keluar
        </button>
      </div>
    </div>
  );
}

// ─── Mobile Bottom Nav (Guru Piket only — replaces sidebar drawer on phone) ────
function MobileBottomNav({ view, onNav, onLogout, badge }: {
  view: string; onNav:(v:string)=>void; onLogout:()=>void; badge?: Record<string,number>;
}) {
  const items = PIKET_NAV.flatMap(g=>g.items);
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-stretch"
      style={{paddingBottom:"env(safe-area-inset-bottom)"}}
    >
      {items.map(item=>{
        const active = view===item.id;
        const itemBadge = badge?.[item.id]||0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={()=>onNav(item.id)}
            aria-current={active?"page":undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${active?"text-primary":"text-muted-foreground"}`}
          >
            <span className="relative">
              <item.icon size={19}/>
              {itemBadge>0&&<span className="absolute -top-1.5 -right-2 bg-amber-400 text-amber-950 text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center leading-none">{itemBadge}</span>}
            </span>
            {item.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onLogout}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
      >
        <LogOut size={19}/> Keluar
      </button>
    </nav>
  );
}

// ─── Guru Piket Views ──────────────────────────────────────────────────────────
function PiketCasesList({ violations, students, vts, currentUser, onAdd, onEdit, onSend }: {
  violations: Violation[]; students: Student[]; vts: ViolationType[]; currentUser: AppUser;
  onAdd:()=>void; onEdit:(v:Violation)=>void; onSend:(id:string)=>void;
}) {
  const activeStudents = students.filter(isActiveStudent);
  const myCases = [...violations.filter(v=>v.officerId===currentUser.id)].sort(compareNewest);
  const [fVs, setFVs] = useState("");
  const [q, setQ] = useState("");
  const byStatus = myCases.filter(v=>!fVs||v.verifyStatus===fVs);
  const filtered = byStatus.filter(v=>{
    if(!q.trim()) return true;
    const s = students.find(x=>x.id===v.studentId);
    return s?.name.toLowerCase().includes(q.trim().toLowerCase());
  });
  const cPag = usePagination(filtered, `${fVs}${q}`);
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-end">
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Catat Pelanggaran</button>
      </div>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nama siswa..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring"/>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{v:"",l:`Semua (${myCases.length})`},{v:"draft",l:`Draft (${myCases.filter(x=>x.verifyStatus==="draft").length})`},{v:"menunggu",l:`Menunggu (${myCases.filter(x=>x.verifyStatus==="menunggu").length})`},{v:"diverifikasi",l:`Diverifikasi (${myCases.filter(x=>x.verifyStatus==="diverifikasi").length})`},{v:"ditolak",l:`Ditolak (${myCases.filter(x=>x.verifyStatus==="ditolak").length})`}].map(f=>(
          <button key={f.v} onClick={()=>setFVs(f.v)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${fVs===f.v?"bg-primary text-primary-foreground border-primary":"bg-card text-muted-foreground border-border hover:bg-muted/40"}`}>{f.l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length===0&&<div className="py-16 text-center bg-card rounded-2xl border border-border text-muted-foreground text-sm">Tidak ada kasus</div>}
        {cPag.slice.map(v=>{const s=activeStudents.find(x=>x.id===v.studentId)??students.find(x=>x.id===v.studentId);const vt=vts.find(x=>x.id===v.violationTypeId);const vi=getVerifyInfo(v.verifyStatus);const VI=vi.icon;const canEdit=v.verifyStatus==="draft"||v.verifyStatus==="ditolak";return(
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
      {cPag.totalPages>1&&(
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <Pagination page={cPag.page} totalPages={cPag.totalPages} total={cPag.total} onPage={cPag.setPage}/>
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
function DashboardView({ students, violations, vts }: {
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

// ─── Students View ─────────────────────────────────────────────────────────────
function StudentsView({ students, violations, vts, guidance, onAdd, onEdit, onDel, onPromote, onReduceStudentPoints, onSuccess }: {
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

// ─── Violations View (Admin) ───────────────────────────────────────────────────
function ViolationsView({ violations, students, vts, currentUser, onAdd, onEdit, onDel, onStatus, onVerify, onReducePoints, onSuccess }: {
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

// ─── Categories View ───────────────────────────────────────────────────────────
function CategoriesView({ vts, onAdd, onEdit, onDel, onSuccess }: {
  vts: ViolationType[]; onAdd:(v:ViolationType)=>void; onEdit:(v:ViolationType)=>void; onDel:(id:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{vt:ViolationType}>(null);
  const [confirm,setConfirm]=useState<null|ViolationType>(null);
  return (
    <div className="p-6 space-y-5">
      {modal==="add"&&<CategoryModal onSave={v=>{onAdd(v);setModal(null);onSuccess("Jenis pelanggaran berhasil ditambahkan.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<CategoryModal init={modal.vt} onSave={v=>{onEdit(v);setModal(null);onSuccess("Jenis pelanggaran berhasil diperbarui.");}} onClose={()=>setModal(null)}/>}
      {confirm&&<Confirm title="Hapus Jenis Pelanggaran" message={`Yakin hapus "${confirm.name}"?`} onOk={()=>{onDel(confirm.id);setConfirm(null);onSuccess("Jenis pelanggaran berhasil dihapus.");}} onCancel={()=>setConfirm(null)}/>}
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-xl font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Konfigurasi Sanksi</h1><p className="text-sm text-muted-foreground">{vts.length} jenis pelanggaran terdaftar</p></div>
        <button onClick={()=>setModal("add")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90"><Plus size={14}/> Tambah Jenis</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(["ringan","sedang","berat"] as const).map(cat=>{
          const cfg={ringan:{label:"Ringan",hdr:"bg-sky-600",card:"border-sky-100 bg-sky-50/30"},sedang:{label:"Sedang",hdr:"bg-amber-600",card:"border-amber-100 bg-amber-50/30"},berat:{label:"Berat",hdr:"bg-red-600",card:"border-red-100 bg-red-50/30"}}[cat];
          const items=vts.filter(v=>v.category===cat).sort(compareNewest);
          return(<div key={cat} className={`rounded-2xl border overflow-hidden ${cfg.card}`}>
            <div className={`${cfg.hdr} px-5 py-4 flex items-center justify-between`}>
              <p className="text-white font-semibold text-sm">Pelanggaran {cfg.label}</p>
              <span className="text-xs bg-white/20 text-white border border-white/25 px-2.5 py-0.5 rounded-full font-semibold">{items.length}</span>
            </div>
            <div className="p-4 space-y-2.5">
              {items.map(vt=>(
                <div key={vt.id} className="bg-white rounded-xl border border-white/90 p-4 shadow-sm group">
                  <div className="flex items-start justify-between gap-2 mb-2"><p className="text-sm font-semibold leading-tight">{vt.name}</p><span className="font-bold text-destructive text-sm flex-shrink-0" style={{fontFamily:"'JetBrains Mono',monospace"}}>{vt.points}</span></div>
                  <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{vt.description}</p>
                  <p className="text-xs text-muted-foreground pt-2.5 border-t border-border leading-relaxed"><span className="font-semibold text-foreground">Sanksi:</span> {vt.sanction}</p>
                  <div className="flex gap-1 mt-2.5 justify-end flex">
                    <button onClick={()=>setModal({vt})} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"><Edit2 size={12}/></button>
                    <button onClick={()=>setConfirm(vt)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>);
        })}
      </div>
    </div>
  );
}

// ─── Guidance Modal (top-level: stable identity across GuidanceView re-renders) ──
function GuidModal({ students, guruList, currentUser, init, onSave, onClose }: {
  students: Student[]; guruList: AppUser[]; currentUser: AppUser;
  init?:GuidanceEntry; onSave:(g:GuidanceEntry)=>Promise<boolean>; onClose:()=>void
}) {
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

// ─── Guidance View ─────────────────────────────────────────────────────────────
function GuidanceView({ guidance, students, users, currentUser, onAdd, onEdit, onDel, onSuccess }: {
  guidance: GuidanceEntry[]; students: Student[]; users: AppUser[]; currentUser: AppUser;
  onAdd:(g:GuidanceEntry)=>Promise<boolean>; onEdit:(g:GuidanceEntry)=>Promise<boolean>; onDel:(id:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{g:GuidanceEntry}>(null);
  const [confirm,setConfirm]=useState<null|GuidanceEntry>(null);
  const guruList = users.filter(u=>u.role==="guru_piket").sort(compareNewest);
  const [gTab,setGTab]=useState<"aktif"|"riwayat">("aktif");
  const sCfg:{[k:string]:{cls:string;label:string}}={dijadwalkan:{cls:"bg-purple-50 text-purple-700 border-purple-200",label:"Dijadwalkan"},berlangsung:{cls:"bg-amber-50 text-amber-700 border-amber-200",label:"Berlangsung"},selesai:{cls:"bg-emerald-50 text-emerald-700 border-emerald-200",label:"Selesai"}};
  const sorted=[...guidance].sort(compareNewest);
  const aktifGuid   = sorted.filter(g=>g.status!=="selesai");
  const riwayatGuid = sorted.filter(g=>g.status==="selesai");
  const pool = gTab==="aktif" ? aktifGuid : riwayatGuid;
  const gPag=usePagination(pool, `${gTab}${pool.length}`);
  return (
    <div className="p-4 sm:p-6 space-y-5">
      {modal==="add"&&<GuidModal students={students} guruList={guruList} currentUser={currentUser} onSave={async g=>{
        const success=await onAdd(g);
        if(success){
          setModal(null);
          onSuccess("Jurnal bimbingan berhasil ditambahkan.");
        }
        return success;
      }} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<GuidModal students={students} guruList={guruList} currentUser={currentUser} init={modal.g} onSave={async g=>{
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

// ─── Jurnal Modal (top-level: stable identity across PiketBimbinganView re-renders) ──
function JurnalModal({ g, students, sCfg, onEdit, onSuccess, onClose }: {
  g: GuidanceEntry; students: Student[]; sCfg:{[k:string]:{cls:string;label:string}};
  onEdit:(g:GuidanceEntry)=>void; onSuccess:(m:string)=>void; onClose:()=>void
}) {
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

// ─── Piket Bimbingan View ──────────────────────────────────────────────────────
function PiketBimbinganView({ guidance, students, currentUser, onEdit, onSuccess }: {
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

  return(
    <div className="p-4 sm:p-6 space-y-5">
      {selected&&<JurnalModal g={selected} students={students} sCfg={sCfg} onEdit={onEdit} onSuccess={onSuccess} onClose={()=>setSelected(null)}/>}
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

// ─── Summon Modal (top-level: stable identity across SummonsView re-renders) ──
function SummonModal({ students, init, onSave, onClose }: { students: Student[]; init?:ParentSummon; onSave:(s:ParentSummon)=>void; onClose:()=>void }) {
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

// ─── Summons View ──────────────────────────────────────────────────────────────
function SummonsView({ summons, students, onAdd, onEdit, onDel, onSelesai, onSuccess }: {
  summons: ParentSummon[]; students: Student[];
  onAdd:(s:ParentSummon)=>void; onEdit:(s:ParentSummon)=>void; onDel:(id:string)=>void;
  onSelesai:(id:string)=>void; onSuccess:(m:string)=>void;
}) {
  const [modal,setModal]=useState<null|"add"|{s:ParentSummon}>(null);
  const [confirm,setConfirm]=useState<null|ParentSummon>(null);
  const [tab,setTab]=useState<"aktif"|"riwayat">("aktif");

  const aktif   = summons.filter(s=>s.status!=="selesai").sort(compareNewest);
  const riwayat = summons.filter(s=>s.status==="selesai").sort(compareNewest);
  const pool    = tab==="aktif" ? aktif : riwayat;
  const spPag   = usePagination(pool, `${tab}${pool.length}`);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {modal==="add"&&<SummonModal students={students} onSave={s=>{onAdd(s);setModal(null);onSuccess("Surat panggilan berhasil dibuat.");}} onClose={()=>setModal(null)}/>}
      {modal&&typeof modal==="object"&&<SummonModal students={students} init={modal.s} onSave={s=>{onEdit(s);setModal(null);onSuccess("Surat panggilan berhasil diperbarui.");}} onClose={()=>setModal(null)}/>}
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

// ─── Monthly PDF ───────────────────────────────────────────────────────────────
async function pdfMonthly(
  monthLabel: string, monthKey: string,
  violations: Violation[], students: Student[], vts: ViolationType[],
  guidance: GuidanceEntry[], summons: ParentSummon[]
) {
  const activeStudents = students.filter(isActiveStudent);
  const activeIds = new Set(activeStudents.map(s=>s.id));

  const mv = violations.filter(
    v=>activeIds.has(v.studentId)&&v.date.startsWith(monthKey)
  ).sort(compareNewest);
  const mg = guidance.filter(
    g=>activeIds.has(g.studentId)&&g.date.startsWith(monthKey)
  ).sort(compareNewest);
  const ms = summons.filter(
    s=>activeIds.has(s.studentId)&&s.date.startsWith(monthKey)
  ).sort(compareNewest);

  const uniqueStudents = [...new Set(mv.map(v=>v.studentId))];
  const catCount = {ringan:0,sedang:0,berat:0};
  mv.forEach(v=>{const vt=vts.find(x=>x.id===v.violationTypeId);if(vt)catCount[vt.category]++;});

  const vRows = mv.map((v,i)=>{
    const s=students.find(x=>x.id===v.studentId);
    const vt=vts.find(x=>x.id===v.violationTypeId);
    return [i+1,fmtDate(v.date),s?.name||"-",s?.kelas||"-",vt?.name||"-",vt?.category||"-",vt?.points||0,v.officer,getVerifyInfo(v.verifyStatus).label];
  });
  const gRows = mg.map((g,i)=>{
    const s=students.find(x=>x.id===g.studentId);
    return [i+1,fmtDate(g.date),s?.name||"-",s?.kelas||"-",g.topic,g.officer,g.status];
  });
  const sRows = ms.map((s,i)=>{
    const st=activeStudents.find(x=>x.id===s.studentId);
    return [i+1,fmtDate(s.date),st?.name||"-",st?.kelas||"-",s.reason.slice(0,40)+"...",fmtDate(s.scheduledDate),getSummonStatus(s.status).label];
  });

  await printDoc(`
    ${hdr(`LAPORAN BULANAN TATA TERTIB SISWA`,`Periode: ${monthLabel} | No: LB/${monthKey.replace("-","/")}/${new Date().getFullYear()}`)}
    <div class="section-title">Ringkasan Bulanan</div>
    <table class="formal-summary">
      <tbody>
        <tr>
          <th>Total Pelanggaran</th>
          <td class="number">${mv.length}</td>
          <th>Siswa Terlibat</th>
          <td class="number">${uniqueStudents.length}</td>
        </tr>
        <tr>
          <th>Sesi Bimbingan</th>
          <td class="number">${mg.length}</td>
          <th>Panggilan Orang Tua</th>
          <td class="number">${ms.length}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Rekap Kategori Pelanggaran</div>
    <table class="formal-summary">
      <thead>
        <tr>
          <th>Kategori</th>
          <th class="number">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Ringan</td>
          <td class="number">${catCount.ringan}</td>
        </tr>
        <tr>
          <td>Sedang</td>
          <td class="number">${catCount.sedang}</td>
        </tr>
        <tr>
          <td>Berat</td>
          <td class="number">${catCount.berat}</td>
        </tr>
      </tbody>
    </table>
    <div class="section-title">Daftar Pelanggaran Bulan ${monthLabel} (${mv.length})</div>
    ${mv.length?tbl(["No","Tanggal","Siswa","Kelas","Jenis Pelanggaran","Kategori","Poin","Petugas","Status Verifikasi"],vRows):"<p>Tidak ada pelanggaran pada bulan ini.</p>"}
    <div class="section-title">Jurnal Bimbingan Bulan ${monthLabel} (${mg.length})</div>
    ${mg.length?tbl(["No","Tanggal","Siswa","Kelas","Topik","Petugas","Status"],gRows):"<p>Tidak ada sesi bimbingan pada bulan ini.</p>"}
    <div class="section-title">Panggilan Orang Tua Bulan ${monthLabel} (${ms.length})</div>
    ${ms.length?tbl(["No","Tanggal Surat","Siswa","Kelas","Alasan","Jadwal","Status"],sRows):"<p>Tidak ada panggilan orang tua pada bulan ini.</p>"}
    ${sig("Guru Bimbingan Konseling","Waka Kesiswaan","Kepala Sekolah")}
  `, true);
}

// ─── Monthly View ───────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function MonthlyView({ students, violations, vts, guidance, summons, embedded }: {
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

// ─── Reports View ──────────────────────────────────────────────────────────────
function ReportsView({ students, violations, vts, guidance, summons }: { students:Student[]; violations:Violation[]; vts:ViolationType[]; guidance:GuidanceEntry[]; summons:ParentSummon[] }) {
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

// ─── User Modal (top-level: stable identity across SettingsView re-renders) ──
function UserModal({ users, init, onSave, onClose }: { users: AppUser[]; init?:AppUser; onSave:(u:AppUser)=>void; onClose:()=>void }) {
    type F={displayName:string;email:string;password:string;nip:string;role:"admin"|"guru_piket"};
    const [f,setF]=useState<F>(init
      ?{displayName:init.displayName,email:init.email,password:init.password,nip:init.nip||"",role:init.role}
      :{displayName:"",email:"",password:"",nip:"",role:"guru_piket"});
    const [showPwd,setShowPwd]=useState(false);
    const [emailErr,setEmailErr]=useState("");
    const set=(k:keyof F,v:string)=>setF(p=>({...p,[k]:v}));
    const save=(e:React.FormEvent)=>{
      e.preventDefault();
      const dup=users.find(u=>u.email===f.email&&u.id!==init?.id);
      if(dup){setEmailErr("Email sudah terdaftar.");return;}
      onSave({id:init?.id??genId(),...f});
    };
    return(
      <Modal title={init?"Edit Akun":"Tambah Akun Pengguna"} onClose={onClose}>
        <form onSubmit={save} className="p-5 space-y-4">
          <FInput label="Nama Lengkap" value={f.displayName} onChange={e=>set("displayName",e.target.value)} required placeholder="cth: Bpk. Ahmad"/>
          <div>
            <FInput label="Email" type="email" value={f.email} onChange={e=>{set("email",e.target.value);setEmailErr("");}} required placeholder="cth: ahmad@sman2.sch.id"/>
            {emailErr&&<p className="text-xs text-destructive mt-1">{emailErr}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Password{init&&" (kosongkan jika tidak diubah)"}</label>
            <div className="relative">
              <input type={showPwd?"text":"password"} value={f.password} onChange={e=>set("password",e.target.value)}
                required={!init} placeholder={init?"Biarkan kosong untuk tidak mengubah":"Min. 6 karakter"}
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring"/>
              <button type="button" onClick={()=>setShowPwd(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <Eye size={14}/>
              </button>
            </div>
          </div>
          <FInput label="NIP (opsional)" value={f.nip} onChange={e=>set("nip",e.target.value)} placeholder="cth: 198001012005011001"/>
          <FSelect label="Peran" value={f.role} onChange={e=>set("role",e.target.value)}>
            <option value="guru_piket">Guru Piket</option>
            <option value="admin">Admin</option>
          </FSelect>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90">{init?"Simpan":"Tambah Akun"}</button>
          </div>
        </form>
      </Modal>
    );
}

// ─── Settings View ─────────────────────────────────────────────────────────────
function SettingsView({ vts, onAdd, onEdit, onDel, users, onAddUser, onEditUser, onDelUser, currentUserId, onSuccess }: {
  vts: ViolationType[]; onAdd:(v:ViolationType)=>void; onEdit:(v:ViolationType)=>void; onDel:(id:string)=>void;
  users: AppUser[]; onAddUser:(u:AppUser)=>void; onEditUser:(u:AppUser)=>void; onDelUser:(id:string)=>void;
  currentUserId: string; onSuccess:(m:string)=>void;
}) {
  const [userModal,setUserModal]=useState<null|"add"|{u:AppUser}>(null);
  const [userConfirm,setUserConfirm]=useState<null|AppUser>(null);
  const sortedUsers = [...users].sort(compareNewest);
  const levels=[
    {range:"1–75",   sanction:"Peringatan Lisan",                    pihak:"Ditangani guru piket, dikonfirmasi ke wali kelas",                          c:"sky"},
    {range:"76–149", sanction:"Hukuman Khusus",                       pihak:"Ditangani guru piket, wali kelas & guru BK",                                c:"amber"},
    {range:"150–299",sanction:"SP Tertulis + Panggilan Orang Tua",    pihak:"Ditangani guru piket, wali kelas, guru BK — dikonfirmasi ke orang tua",     c:"orange"},
    {range:"300–399",sanction:"Panggilan Ortu + Skorsing 6 Hari",     pihak:"Ditangani wali kelas, guru BK dan wakil kesiswaan",                         c:"red"},
    {range:"400–500",sanction:"Panggilan Ortu + Surat Pernyataan",    pihak:"Ditangani guru BK dan Kepala Sekolah",                                      c:"rose"},
    {range:"≥ 501",  sanction:"Dikembalikan kepada Orang Tua",        pihak:"Konferensi kasus",                                                          c:"dark"},
  ];
  const bgs:{[k:string]:string}={sky:"bg-sky-50 border-sky-200",amber:"bg-amber-50 border-amber-200",orange:"bg-orange-50 border-orange-200",red:"bg-red-50 border-red-200",rose:"bg-rose-50 border-rose-300",dark:"bg-red-100 border-red-400"};
  const txts:{[k:string]:string}={sky:"text-sky-700",amber:"text-amber-700",orange:"text-orange-700",red:"text-red-700",rose:"text-rose-700",dark:"text-red-900"};
  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Jenis Pelanggaran — embedded CategoriesView */}
      <CategoriesView vts={vts} onAdd={onAdd} onEdit={onEdit} onDel={onDel} onSuccess={onSuccess}/>

      {/* Tingkatan Sanksi + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold mb-4">Tingkatan Sanksi Aktif</p>
          <div className="space-y-3">
            {levels.map(l=>(
              <div key={l.range} className={`border rounded-xl p-4 ${bgs[l.c]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className={`font-semibold text-sm ${txts[l.c]}`}>{l.sanction}</p><p className="text-xs text-muted-foreground mt-0.5">{l.pihak}</p></div>
                  <Chip cls={`${bgs[l.c]} ${txts[l.c]} text-[10px] flex-shrink-0`}>{l.range} poin</Chip>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          {userModal==="add"&&<UserModal users={users} onSave={u=>{onAddUser(u);setUserModal(null);onSuccess("Akun pengguna berhasil ditambahkan.");}} onClose={()=>setUserModal(null)}/>}
          {userModal&&typeof userModal==="object"&&<UserModal users={users} init={userModal.u} onSave={u=>{
            const upd={...u,password:u.password||userModal.u.password};
            onEditUser(upd);setUserModal(null);onSuccess("Akun pengguna berhasil diperbarui.");
          }} onClose={()=>setUserModal(null)}/>}
          {userConfirm&&<Confirm title="Hapus Akun" message={`Yakin hapus akun "${userConfirm.displayName}"?`} onOk={()=>{onDelUser(userConfirm.id);setUserConfirm(null);onSuccess("Akun berhasil dihapus.");}} onCancel={()=>setUserConfirm(null)}/>}

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div><p className="text-sm font-semibold">Akun Pengguna Sistem</p><p className="text-xs text-muted-foreground">{users.length} akun terdaftar</p></div>
              <button onClick={()=>setUserModal("add")} className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Plus size={13}/> Tambah Akun
              </button>
            </div>
            <div className="divide-y divide-border">
              {sortedUsers.map(u=>{
                const isMe = u.id===currentUserId;
                return(
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/15">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.role==="admin"?"bg-primary/10 text-primary":"bg-amber-50 text-amber-700"}`}>{u.displayName[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{u.displayName}</p>
                        {isMe&&<Chip cls="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Anda</Chip>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}{u.nip&&` · NIP ${u.nip}`}</p>
                    </div>
                    <Chip cls={`text-[10px] flex-shrink-0 ${u.role==="admin"?"bg-primary/8 text-primary border-primary/15":"bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {u.role==="admin"?"Admin":"Guru Piket"}
                    </Chip>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={()=>setUserModal({u})} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground" title="Edit"><Edit2 size={13}/></button>
                      <button onClick={()=>!isMe&&setUserConfirm(u)} disabled={isMe} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed" title={isMe?"Tidak bisa hapus akun sendiri":"Hapus"}><Trash2 size={13}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState<AppView>("public");
  const [currentUser,setCurrentUser]=useState<AppUser|null>(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const mobileMenuButtonRef=useRef<HTMLButtonElement>(null);
  const [editTarget,setEditTarget]=useState<Violation|null>(null);
  const [studs,setStuds]=useState<Student[]>([]);
  const [viols,setViols]=useState<Violation[]>([]);
  const [vts,setVts]=useState<ViolationType[]>([]);
  const [guid,setGuid]=useState<GuidanceEntry[]>([]);
  const [summ,setSumm]=useState<ParentSummon[]>([]);
  const [appUsers,setAppUsers]=useState<AppUser[]>([]);
  const [successMsg,setSuccessMsg]=useState("");
  const [errorMsg,setErrorMsg]=useState("");
  const [booting,setBooting]=useState(true);      // cek sesi tersimpan saat pertama kali load
  const [loadingData,setLoadingData]=useState(false); // mengambil data setelah login
  const ok=(msg:string)=>setSuccessMsg(msg);
  const fail=(e:unknown)=>setErrorMsg(api.apiErrorMessage(e));

  const closeMobileSidebar=(restoreFocus=true)=>{
    const focused=document.activeElement as HTMLElement|null;

    // Lepaskan fokus dari tombol di dalam drawer sebelum drawer dibuat inert/tersembunyi.
    if(focused?.closest(".mobile-sidebar-layer")){
      focused.blur();
    }

    setSidebarOpen(false);

    if(restoreFocus){
      window.requestAnimationFrame(()=>{
        mobileMenuButtonRef.current?.focus();
      });
    }
  };

  // Sidebar mobile: kunci scroll halaman, tutup dengan Esc, dan tutup saat layar kembali desktop.
  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";

    const handleKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape") closeMobileSidebar();
    };

    const handleResize=()=>{
      if(window.innerWidth>=768) closeMobileSidebar(false);
    };

    window.addEventListener("keydown",handleKeyDown);
    window.addEventListener("resize",handleResize);

    return()=>{
      document.body.style.overflow=previousOverflow;
      window.removeEventListener("keydown",handleKeyDown);
      window.removeEventListener("resize",handleResize);
    };
  },[sidebarOpen]);

  // Ambil semua data dari backend & taruh ke state lokal (dipanggil setelah login / restore sesi)
  const loadAllData = async (role?: AppUser["role"]) => {
    setLoadingData(true);
    try {
      const boot = await api.fetchBootstrap(role==="admin");
      setStuds(boot.students);
      setVts(boot.violationTypes);
      setViols(boot.violations);
      setGuid(boot.guidance);
      setSumm(boot.summons);

      if(role==="admin"){
        setAppUsers(boot.users);
      }else{
        setAppUsers([]);
      }
    } catch (e) {
      fail(e);
    } finally {
      setLoadingData(false);
    }
  };

  // Pulihkan sesi tab ini (token tersimpan di sessionStorage) saat aplikasi pertama kali dibuka
  useEffect(() => {
    (async () => {
      if (api.getToken()) {
        try {
          const u = await api.fetchMe();
          setCurrentUser(u);
          setView(u.role==="admin"?"dashboard":"piket_kasus");
          await loadAllData(u.role);
        } catch {
          api.setToken(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  // Sinkronkan daftar pelanggaran secara ringan.
  // Berguna ketika admin dan guru piket bekerja dari tab/browser berbeda.
  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    const refreshOperationalData = async () => {
      try {
        const [studentsNow, violationsNow] = await Promise.all([
          api.fetchStudents(),
          api.fetchViolations(),
        ]);

        if (cancelled) return;
        setStuds(studentsNow);
        setViols(violationsNow);
      } catch {
        // Refresh diam-diam: error utama tetap ditangani saat aksi pengguna.
      }
    };

    const handleFocus = () => {
      void refreshOperationalData();
    };

    window.addEventListener("focus", handleFocus);
    const timer = window.setInterval(() => {
      void refreshOperationalData();
    }, 10000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(timer);
    };
  }, [currentUser?.id]);

  const addUser=async(u:AppUser)=>{try{const created=await api.createUser(u);setAppUsers(p=>[created,...p.filter(item=>item.id!==created.id)]);ok("Akun berhasil ditambahkan.");}catch(e){fail(e);}};
  const editUser=async(u:AppUser)=>{try{const updated=await api.updateUser(u.id,u);setAppUsers(p=>p.map(x=>x.id===u.id?updated:x));}catch(e){fail(e);}};
  const delUser=async(id:string)=>{
    try{
      await api.deleteUser(id);
      setAppUsers(p=>p.filter(x=>x.id!==id));
      setGuid(p=>p.map(g=>g.assignedTo===id?{...g,assignedTo:undefined,requestedBy:undefined}:g));
    }catch(e){fail(e);}
  };

  const addS=async(s:Student)=>{try{const created=await api.createStudent(s);setStuds(p=>[created,...p.filter(item=>item.id!==created.id)]);ok("Siswa berhasil ditambahkan.");}catch(e){fail(e);}};
  const editS=async(s:Student)=>{try{const updated=await api.updateStudent(s.id,s);setStuds(p=>p.map(x=>x.id===s.id?updated:x));}catch(e){fail(e);}};
  const delS=async(id:string)=>{
    try{
      await api.deleteStudent(id);
      // Backend mengarsipkan (bukan menghapus permanen) siswa yang punya riwayat pelanggaran,
      // jadi kita ambil ulang daftar siswa supaya status arsip ter-refresh dengan benar.
      setStuds(await api.fetchStudents());
    }catch(e){fail(e);}
  };

  const promoteAll = async (): Promise<boolean> => {
    const year = new Date().getFullYear();

    // Mendukung format kelas seperti X.1, XI.1, XII.1, X IPA 1, XI IPA 1, dan XII IPA 1.
    const parseClass = (kelas: string) => {
      const value = kelas.trim();

      if (/^XII(?:[.\s-]|$)/i.test(value)) {
        return { grade: "XII" as const, suffix: value.slice(3) };
      }

      if (/^XI(?:[.\s-]|$)/i.test(value)) {
        return { grade: "XI" as const, suffix: value.slice(2) };
      }

      if (/^X(?:[.\s-]|$)/i.test(value)) {
        return { grade: "X" as const, suffix: value.slice(1) };
      }

      return null;
    };

    const activeStudents = studs.filter(student => !student.archived);
    const graduatingIds: number[] = [];
    const targetClasses = new Map<string, number[]>();

    for (const student of activeStudents) {
      const studentId = Number(student.id);
      const parsed = parseClass(student.kelas);

      if (!Number.isInteger(studentId) || studentId <= 0 || !parsed) {
        continue;
      }

      if (parsed.grade === "XII") {
        graduatingIds.push(studentId);
        continue;
      }

      const targetClass = parsed.grade === "X"
        ? `XI${parsed.suffix}`
        : `XII${parsed.suffix}`;

      const ids = targetClasses.get(targetClass) ?? [];
      ids.push(studentId);
      targetClasses.set(targetClass, ids);
    }

    const requests: Promise<void>[] = [];

    // X -> XI dan XI -> XII.
    for (const [kelas, studentIds] of targetClasses.entries()) {
      requests.push(
        api.bulkPromoteStudents({
          student_ids: studentIds,
          kelas,
          status: "aktif",
        }),
      );
    }

    // XII -> alumni.
    if (graduatingIds.length > 0) {
      requests.push(
        api.bulkPromoteStudents({
          student_ids: graduatingIds,
          status: "lulus",
          lulus_year: year,
        }),
      );
    }

    if (requests.length === 0) {
      fail(new Error("Tidak ditemukan siswa dengan kelas X, XI, atau XII yang dapat diproses."));
      return false;
    }

    try {
      await Promise.all(requests);
      setStuds(await api.fetchStudents());
      ok("Naik kelas massal berhasil diproses.");
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  };

  const refreshStudentsAndViolations = async () => {
    const [s,v] = await Promise.all([api.fetchStudents(), api.fetchViolations()]);
    setStuds(s); setViols(v);
  };

  const addV=async(v:Violation)=>{
    try{
      const created=await api.createViolation(v);
      const [studentsNow,violationsNow]=await Promise.all([
        api.fetchStudents(),
        api.fetchViolations(),
      ]);

      setStuds(studentsNow);
      setViols([
        created,
        ...violationsNow.filter(item=>item.id!==created.id),
      ]);
      ok(
        v.verifyStatus==="menunggu"
          ? "Catatan berhasil dikirim dan menunggu verifikasi admin."
          : v.verifyStatus==="draft"
            ? "Draft pelanggaran berhasil disimpan."
            : "Pelanggaran berhasil dicatat."
      );
    }catch(e){
      fail(e);
    }
  };
  const editV=async(upd:Violation)=>{
    try{ await api.updateViolation(upd.id, upd); await refreshStudentsAndViolations(); }catch(e){fail(e);}
  };
  const delV=async(id:string)=>{
    try{ await api.deleteViolation(id); await refreshStudentsAndViolations(); }catch(e){fail(e);}
  };
  const updStatus=async(id:string,status:Violation["status"])=>{
    try{ const updated=await api.updateViolationStatus(id,status); setViols(p=>p.map(v=>v.id===id?updated:v)); }catch(e){fail(e);}
  };
  const updVerify=async(id:string,vs:Violation["verifyStatus"])=>{
    try{
      if(vs==="diverifikasi") await api.verifyViolation(id,"verify");
      else if(vs==="ditolak") await api.verifyViolation(id,"reject",{rejection_reason:"Ditolak oleh admin."});
      await refreshStudentsAndViolations();
    }catch(e){fail(e);}
  };
  const sendVerify=async(id:string)=>{
    try{ const updated=await api.submitViolation(id); setViols(p=>p.map(v=>v.id===id?updated:v)); }catch(e){fail(e);}
  };
  const reducePoints=async(id:string,amount:number,note:string)=>{
    try{ await api.reduceViolationPoints(id,amount,note); await refreshStudentsAndViolations(); }catch(e){fail(e);}
  };

  const reduceStudentPoints=async(
    studentId:string,
    amount:number,
    note:string
  ):Promise<boolean>=>{
    try{
      const student=studs.find(s=>s.id===studentId);

      if(!student){
        setErrorMsg("Data siswa tidak ditemukan.");
        return false;
      }

      if(amount<1||amount>student.totalPoints){
        setErrorMsg(`Jumlah pengurangan harus antara 1 sampai ${student.totalPoints} poin.`);
        return false;
      }

      const eligible=[...viols]
        .filter(v=>v.studentId===studentId&&v.verifyStatus==="diverifikasi")
        .sort(compareNewest);

      let remaining=amount;
      let changed=0;

      for(const violation of eligible){
        if(remaining<=0) break;

        const violationType=vts.find(vt=>vt.id===violation.violationTypeId);
        const originalPoints=Number(violationType?.points??0);
        const currentReduction=Math.max(0,Number(violation.pointReduction??0));
        const available=Math.max(0,originalPoints-currentReduction);

        if(available<=0) continue;

        const applied=Math.min(remaining,available);
        const nextReduction=currentReduction+applied;

        await api.reduceViolationPoints(
          violation.id,
          nextReduction,
          note
        );

        remaining-=applied;
        changed+=applied;
      }

      if(remaining>0){
        setErrorMsg(
          `Pengurangan hanya dapat diterapkan sebesar ${changed} poin karena tidak ada cukup poin dari catatan terverifikasi.`
        );
        await refreshStudentsAndViolations();
        return false;
      }

      await refreshStudentsAndViolations();
      return true;
    }catch(e){
      fail(e);
      return false;
    }
  };

  const addCat=async(v:ViolationType)=>{try{const created=await api.createViolationType(v);setVts(p=>[created,...p.filter(item=>item.id!==created.id)]);ok("Jenis pelanggaran ditambahkan.");}catch(e){fail(e);}};
  const editCat=async(v:ViolationType)=>{try{const updated=await api.updateViolationType(v.id,v);setVts(p=>p.map(x=>x.id===v.id?updated:x));}catch(e){fail(e);}};
  const delCat=async(id:string)=>{try{await api.deleteViolationType(id);setVts(p=>p.filter(x=>x.id!==id));}catch(e){fail(e);}};
  const addG=async(g:GuidanceEntry):Promise<boolean>=>{
    try{
      const created=await api.createGuidance(g);
      setGuid(p=>[created,...p.filter(item=>item.id!==created.id)]);
      return true;
    }catch(e){
      fail(e);
      return false;
    }
  };
  const editG=async(g:GuidanceEntry):Promise<boolean>=>{
    try{
      const updated=await api.updateGuidance(g.id,g);
      setGuid(p=>p.map(x=>x.id===g.id?updated:x));
      return true;
    }catch(e){
      fail(e);
      return false;
    }
  };
  const delG=async(id:string)=>{try{await api.deleteGuidance(id);setGuid(p=>p.filter(x=>x.id!==id));}catch(e){fail(e);}};
  const addSp=async(s:ParentSummon)=>{try{const created=await api.createSummon(s);setSumm(p=>[created,...p.filter(item=>item.id!==created.id)]);ok("Surat pemanggilan dibuat.");}catch(e){fail(e);}};
  const editSp=async(s:ParentSummon)=>{try{const updated=await api.updateSummon(s.id,s);setSumm(p=>p.map(x=>x.id===s.id?updated:x));}catch(e){fail(e);}};
  const delSp=async(id:string)=>{try{await api.deleteSummon(id);setSumm(p=>p.filter(x=>x.id!==id));}catch(e){fail(e);}};
  const selesaiSp=async(id:string)=>{
    try{
      const target=summ.find(x=>x.id===id);
      if(!target) return;
      const updated=await api.updateSummon(id,{...target,status:"selesai"});
      setSumm(p=>p.map(x=>x.id===id?updated:x));
    }catch(e){fail(e);}
  };

  const handleLoginSuccess=async(u:AppUser)=>{
    setCurrentUser(u);
    setView(u.role==="admin"?"dashboard":"piket_kasus");
    await loadAllData(u.role);
  };
  const handleLogout=async()=>{
    await api.logout();
    setCurrentUser(null);
    setView("public");
    closeMobileSidebar(false);
    setStuds([]);setViols([]);setVts([]);setGuid([]);setSumm([]);setAppUsers([]);
  };

  if(booting){
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground" style={{background:"#f5f4f0"}}>Memuat sesi...</div>;
  }
  if(view==="login") return <LoginView onLoginSuccess={handleLoginSuccess} onPublic={()=>setView("public")}/>;
  if(view==="public") return <PublicView onBack={()=>setView("login")}/>;
  if(!currentUser) return null;
  if(loadingData){
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground" style={{background:"#f5f4f0"}}>Memuat data...</div>;
  }

  const menunggu=viols.filter(v=>v.verifyStatus==="menunggu").length;

  const piketContent=(()=>{
    switch(view){
      case "piket_kasus":        return <PiketCasesList violations={viols} students={studs} vts={vts} currentUser={currentUser} onAdd={()=>{setEditTarget(null);setView("piket_catat");}} onEdit={v=>{setEditTarget(v);setView("piket_catat");}} onSend={sendVerify}/>;
      case "piket_bimbingan":    return <PiketBimbinganView guidance={guid} students={studs} currentUser={currentUser} onEdit={editG} onSuccess={ok}/>;
      case "piket_catat":     return (
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl">
            <ViolationModal
              init={editTarget??undefined} students={studs} vts={vts} currentUser={currentUser}
              onSave={v=>{if(editTarget)editV(v);else addV(v);setEditTarget(null);setView("piket_kasus");}}
              onClose={()=>{setEditTarget(null);setView("piket_kasus");}}
            />
          </div>
        </div>
      );
      default: return null;
    }
  })();

  const adminContent=(()=>{
    switch(view){
      case "dashboard":  return <DashboardView students={studs} violations={viols} vts={vts}/>;
      case "students":   return <StudentsView students={studs} violations={viols} vts={vts} guidance={guid} onAdd={addS} onEdit={editS} onDel={delS} onPromote={promoteAll} onReduceStudentPoints={reduceStudentPoints} onSuccess={ok}/>;
      case "violations": return <ViolationsView violations={viols} students={studs} vts={vts} currentUser={currentUser} onAdd={addV} onEdit={editV} onDel={delV} onStatus={updStatus} onVerify={updVerify} onReducePoints={reducePoints} onSuccess={ok}/>;

      case "guidance":   return <GuidanceView guidance={guid} students={studs} users={appUsers} currentUser={currentUser} onAdd={addG} onEdit={editG} onDel={delG} onSuccess={ok}/>;
      case "summons":    return <SummonsView summons={summ} students={studs} onAdd={addSp} onEdit={editSp} onDel={delSp} onSelesai={selesaiSp} onSuccess={ok}/>;
      case "reports":    return <ReportsView students={studs} violations={viols} vts={vts} guidance={guid} summons={summ}/>;
      case "settings":   return <SettingsView vts={vts} onAdd={addCat} onEdit={editCat} onDel={delCat} users={appUsers} onAddUser={addUser} onEditUser={editUser} onDelUser={delUser} currentUserId={currentUser.id} onSuccess={ok}/>;
      default: return null;
    }
  })();

  const content = currentUser.role==="guru_piket" ? piketContent : adminContent;
  const allNavGroups = currentUser.role==="admin" ? ADMIN_NAV : PIKET_NAV;
  const navLabel = allNavGroups.flatMap(g=>g.items).find(i=>i.id===view)?.label ?? "Catat Pelanggaran";
  const pageTitle = view==="piket_catat"&&editTarget ? "Edit Catatan Pelanggaran" : navLabel;

  // Ringkasan untuk subjudul pada card putih paling atas.
  const headerActiveStudents = studs.filter(isActiveStudent);
  const headerActiveIds = new Set(headerActiveStudents.map(s=>s.id));
  const headerViolations = viols.filter(v=>headerActiveIds.has(v.studentId));
  const headerVerifiedViolations = headerViolations.filter(v=>v.verifyStatus!=="draft");
  const headerActiveViolations = headerVerifiedViolations.filter(v=>v.status!=="selesai");
  const headerFinishedViolations = headerVerifiedViolations.filter(v=>v.status==="selesai");
  const headerPendingViolations = headerViolations.filter(v=>v.verifyStatus==="menunggu");

  const headerGuidance = guid.filter(g=>headerActiveIds.has(g.studentId));
  const headerActiveGuidance = headerGuidance.filter(g=>g.status!=="selesai");
  const headerFinishedGuidance = headerGuidance.filter(g=>g.status==="selesai");

  const headerSummons = summ.filter(s=>headerActiveIds.has(s.studentId));
  const headerActiveSummons = headerSummons.filter(s=>s.status!=="selesai");
  const headerFinishedSummons = headerSummons.filter(s=>s.status==="selesai");

  const headerMyCases = viols.filter(v=>v.officerId===currentUser.id);
  const headerMyGuidance = guid.filter(g=>g.assignedTo===currentUser.id);
  const headerMyActiveGuidance = headerMyGuidance.filter(g=>g.status!=="selesai");
  const headerMyFinishedGuidance = headerMyGuidance.filter(g=>g.status==="selesai");

  const pageSubtitle = (()=>{
    switch(view){
      case "dashboard":
        return new Date().toLocaleDateString("id-ID",{dateStyle:"long"});
      case "students":
        return `${headerActiveStudents.length} siswa aktif · ${studs.length-headerActiveStudents.length} alumni`;
      case "violations":
        return `${headerActiveViolations.length} aktif · ${headerFinishedViolations.length} selesai · ${headerPendingViolations.length} menunggu verifikasi`;
      case "guidance":
        return `${headerActiveGuidance.length} aktif · ${headerFinishedGuidance.length} selesai`;
      case "summons":
        return `${headerActiveSummons.length} aktif · ${headerFinishedSummons.length} selesai`;
      case "reports":
        return "Buat dan cetak laporan resmi sekolah";
      case "settings":
        return "Konfigurasi jenis pelanggaran, sanksi, dan informasi sistem";
      case "piket_kasus":
        return `${headerMyCases.length} kasus yang Anda catat`;
      case "piket_bimbingan":
        return `${headerMyActiveGuidance.length} tugas aktif · ${headerMyFinishedGuidance.length} selesai`;
      case "piket_catat":
        return editTarget
          ? "Perbarui catatan, lalu simpan atau kirim kembali untuk verifikasi"
          : "Isi form, simpan draft, atau kirim untuk verifikasi admin";
      default:
        return "";
    }
  })();

  const notifCount = currentUser.role==="admin" ? menunggu : viols.filter(v=>v.officerId===currentUser.id&&v.verifyStatus==="ditolak").length;

  // For piket_catat, render inline (no modal overlay)
  const isPiketCatat = view==="piket_catat";

  return (
    <div className="flex h-screen overflow-hidden" style={{background:"var(--background)",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @keyframes sidebarDesktopEnter{
          0%{opacity:0;transform:translate3d(-26px,0,0)}
          100%{opacity:1;transform:translate3d(0,0,0)}
        }

        @keyframes sidebarGroupEnter{
          0%{opacity:0;transform:translate3d(-14px,8px,0)}
          100%{opacity:1;transform:translate3d(0,0,0)}
        }

        @keyframes sidebarItemEnter{
          0%{opacity:0;transform:translate3d(-10px,0,0)}
          100%{opacity:1;transform:translate3d(0,0,0)}
        }

        @keyframes sidebarOrbFloatOne{
          0%,100%{transform:translate3d(0,0,0) scale(1)}
          50%{transform:translate3d(14px,20px,0) scale(1.08)}
        }

        @keyframes sidebarOrbFloatTwo{
          0%,100%{transform:translate3d(0,0,0) scale(1)}
          50%{transform:translate3d(-12px,-16px,0) scale(.94)}
        }

        @keyframes sidebarActiveIcon{
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.08)}
        }

        @keyframes sidebarBadgePulse{
          0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.25)}
          50%{box-shadow:0 0 0 5px rgba(251,191,36,0)}
        }

        .desktop-sidebar-shell{
          animation:sidebarDesktopEnter 650ms cubic-bezier(.16,1,.3,1) both;
        }

        .app-sidebar-panel{
          box-shadow:10px 0 34px rgba(7,28,18,.12);
        }

        .sidebar-orb{
          position:absolute;
          border-radius:999px;
          filter:blur(2px);
          will-change:transform;
        }

        .sidebar-orb-one{
          width:180px;
          height:180px;
          top:-72px;
          right:-88px;
          background:radial-gradient(circle,rgba(82,183,136,.18),transparent 68%);
          animation:sidebarOrbFloatOne 9s ease-in-out infinite;
        }

        .sidebar-orb-two{
          width:150px;
          height:150px;
          bottom:72px;
          left:-88px;
          background:radial-gradient(circle,rgba(255,214,102,.09),transparent 70%);
          animation:sidebarOrbFloatTwo 11s ease-in-out infinite;
        }

        .sidebar-grid-pattern{
          position:absolute;
          inset:0;
          opacity:.035;
          background-image:
            linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px);
          background-size:28px 28px;
          mask-image:linear-gradient(to bottom,black,transparent 88%);
        }

        .sidebar-logo{
          transition:transform 420ms cubic-bezier(.16,1,.3,1),box-shadow 420ms ease;
        }

        .sidebar-brand:hover .sidebar-logo{
          transform:rotate(-4deg) scale(1.06);
          box-shadow:0 10px 24px rgba(0,0,0,.18);
        }

        .desktop-sidebar-shell .sidebar-nav-group{
          opacity:0;
          animation:sidebarGroupEnter 580ms cubic-bezier(.16,1,.3,1) forwards;
        }

        .desktop-sidebar-shell .sidebar-nav-item{
          opacity:0;
          animation:sidebarItemEnter 480ms cubic-bezier(.16,1,.3,1) forwards;
        }

        .sidebar-nav{
          scrollbar-width:thin;
          scrollbar-color:rgba(200,222,206,.16) transparent;
        }

        .sidebar-nav::-webkit-scrollbar{width:5px}
        .sidebar-nav::-webkit-scrollbar-track{background:transparent}
        .sidebar-nav::-webkit-scrollbar-thumb{
          background:rgba(200,222,206,.15);
          border-radius:999px;
        }

        .sidebar-nav-item{
          isolation:isolate;
          transition:
            color 220ms ease,
            background-color 220ms ease,
            transform 260ms cubic-bezier(.16,1,.3,1),
            box-shadow 260ms ease;
        }

        .sidebar-nav-item::after{
          content:"";
          position:absolute;
          inset:0;
          z-index:-2;
          border-radius:inherit;
          background:linear-gradient(100deg,rgba(82,183,136,.19),rgba(82,183,136,.07));
          opacity:0;
          transform:scaleX(.82);
          transform-origin:left center;
          transition:opacity 250ms ease,transform 330ms cubic-bezier(.16,1,.3,1);
        }

        .sidebar-nav-item:hover{
          background:rgba(255,255,255,.055);
          transform:translate3d(3px,0,0);
        }

        .sidebar-nav-item-active{
          box-shadow:inset 0 0 0 1px rgba(82,183,136,.12),0 7px 18px rgba(5,24,15,.12);
        }

        .sidebar-nav-item-active::after{
          opacity:1;
          transform:scaleX(1);
        }

        .sidebar-active-line{
          position:absolute;
          left:0;
          top:50%;
          width:3px;
          height:0;
          border-radius:0 999px 999px 0;
          background:#6ee7a8;
          box-shadow:0 0 14px rgba(110,231,168,.55);
          transform:translateY(-50%);
          transition:height 340ms cubic-bezier(.16,1,.3,1);
        }

        .sidebar-nav-item-active .sidebar-active-line{
          height:58%;
        }

        .sidebar-nav-icon{
          transition:transform 300ms cubic-bezier(.16,1,.3,1),background-color 220ms ease;
        }

        .sidebar-nav-item:hover .sidebar-nav-icon{
          transform:rotate(-5deg) scale(1.1);
        }

        .sidebar-nav-item-active .sidebar-nav-icon{
          animation:sidebarActiveIcon 2.8s ease-in-out infinite;
        }

        .sidebar-nav-chevron{
          transition:opacity 240ms ease,transform 300ms cubic-bezier(.16,1,.3,1);
        }

        .sidebar-nav-item:hover .sidebar-nav-chevron{
          opacity:.72;
          transform:translateX(2px);
        }

        .sidebar-badge{
          animation:sidebarBadgePulse 2.2s ease-in-out infinite;
        }

        .sidebar-user-avatar{
          transition:transform 300ms cubic-bezier(.16,1,.3,1);
        }

        .sidebar-user:hover .sidebar-user-avatar{
          transform:scale(1.08);
        }

        .mobile-sidebar-layer{
          transition:visibility 0s linear 460ms;
        }

        .mobile-sidebar-layer.mobile-sidebar-open{
          transition-delay:0s;
        }

        .mobile-sidebar-backdrop{
          opacity:0;
          transition:opacity 320ms ease;
        }

        .mobile-sidebar-open .mobile-sidebar-backdrop{
          opacity:1;
        }

        .mobile-sidebar-drawer{
          transform:translate3d(-105%,0,0);
          opacity:.94;
          transition:
            transform 480ms cubic-bezier(.16,1,.3,1),
            opacity 320ms ease,
            box-shadow 480ms ease;
          will-change:transform;
        }

        .mobile-sidebar-open .mobile-sidebar-drawer{
          transform:translate3d(0,0,0);
          opacity:1;
          box-shadow:20px 0 55px rgba(0,0,0,.32);
        }

        .mobile-sidebar-drawer .sidebar-brand,
        .mobile-sidebar-drawer .sidebar-role,
        .mobile-sidebar-drawer .sidebar-nav-group,
        .mobile-sidebar-drawer .sidebar-user{
          opacity:0;
          transform:translate3d(-18px,0,0);
          transition:
            opacity 400ms cubic-bezier(.16,1,.3,1),
            transform 480ms cubic-bezier(.16,1,.3,1);
        }

        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-brand,
        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-role,
        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-nav-group,
        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-user{
          opacity:1;
          transform:translate3d(0,0,0);
        }

        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-brand{transition-delay:110ms}
        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-role{transition-delay:155ms}
        .mobile-sidebar-open .mobile-sidebar-drawer .sidebar-user{transition-delay:230ms}

        @media (max-width:767px){
          .app-sidebar-panel{
            box-shadow:none;
          }

          .sidebar-nav-item{
            font-size:13px;
          }
        }

        @media (prefers-reduced-motion:reduce){
          .desktop-sidebar-shell,
          .sidebar-nav-group,
          .sidebar-nav-item,
          .sidebar-orb,
          .sidebar-nav-icon,
          .sidebar-badge,
          .mobile-sidebar-drawer,
          .mobile-sidebar-backdrop,
          .sidebar-brand,
          .sidebar-role,
          .sidebar-user{
            animation:none!important;
            transition:none!important;
          }
        }
      `}</style>
      {successMsg&&<SuccessModal msg={successMsg} onClose={()=>setSuccessMsg("")}/>}
      {errorMsg&&<ErrorModal msg={errorMsg} onClose={()=>setErrorMsg("")}/>}
      <aside className="desktop-sidebar-shell hidden md:flex flex-shrink-0">
        <Sidebar
          view={view}
          onNav={v=>{if(v==="piket_catat"){setEditTarget(null);}setView(v as AppView);}}
          onLogout={handleLogout}
          currentUser={currentUser}
          badge={currentUser.role==="admin"
            ? {violations:menunggu}
            : {
                piket_kasus:viols.filter(v=>v.officerId===currentUser.id&&v.verifyStatus==="ditolak").length||0,
                piket_bimbingan:guid.filter(g=>g.assignedTo===currentUser.id&&g.status!=="selesai").length||0,
              }
          }
        />
      </aside>

      <div
        ref={element=>{
          if(!element) return;
          if(sidebarOpen){
            element.removeAttribute("inert");
          }else{
            element.setAttribute("inert","");
          }
        }}
        className={`mobile-sidebar-layer md:hidden fixed inset-0 z-50 ${
          sidebarOpen ? "mobile-sidebar-open visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Tutup menu samping"
          className="mobile-sidebar-backdrop absolute inset-0 w-full h-full bg-black/45 backdrop-blur-[3px]"
          onClick={()=>closeMobileSidebar()}
        />

        <aside
          id="mobile-app-sidebar"
          className="mobile-sidebar-drawer absolute inset-y-0 left-0 h-[100dvh]"
          style={{width:"min(88vw,310px)"}}
        >
          <Sidebar
            view={view}
            onNav={v=>{
              if(v==="piket_catat") setEditTarget(null);
              setView(v as AppView);
              closeMobileSidebar();
            }}
            onLogout={handleLogout}
            currentUser={currentUser}
            isMobile
            onClose={()=>closeMobileSidebar()}
            badge={currentUser.role==="admin"
              ? {violations:menunggu}
              : {
                  piket_kasus:viols.filter(v=>v.officerId===currentUser.id&&v.verifyStatus==="ditolak").length||0,
                  piket_bimbingan:guid.filter(g=>g.assignedTo===currentUser.id&&g.status!=="selesai").length||0,
                }
            }
          />
        </aside>
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="border-b border-primary/80 bg-primary text-white flex items-center px-4 sm:px-6 lg:px-8 gap-3 flex-shrink-0"
          style={{height:"78px"}}
        >
          {currentUser.role==="admin"&&(
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={()=>setSidebarOpen(true)}
              aria-label="Buka menu samping"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-app-sidebar"
              className="md:hidden w-10 h-10 rounded-xl border border-white/15 bg-white/[0.06] flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white active:scale-90 transition-all flex-shrink-0"
            >
              <Menu size={18}/>
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-semibold leading-tight truncate text-white">
                {pageTitle}
              </p>
              <p className="text-[11px] sm:text-sm text-white/80 mt-1 leading-tight truncate">
                {pageSubtitle}
              </p>
            </div>
            {currentUser.role==="guru_piket"&&<Chip cls="bg-white/10 text-white border-white/20 text-[10px]"><UserCheck size={9}/> Guru Piket</Chip>}
          </div>
          <div className="flex items-center gap-2">
            {notifCount>0&&(
              <div
                className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 sm:px-3 py-2 rounded-xl"
                title={`${notifCount} ${currentUser.role==="admin"?"menunggu verifikasi":"ditolak"}`}
              >
                <Bell size={13}/>
                <span className="hidden sm:inline text-xs font-semibold">
                  {notifCount} {currentUser.role==="admin"?"menunggu verifikasi":"ditolak"}
                </span>
                <span className="sm:hidden text-[10px] font-bold">{notifCount}</span>
              </div>
            )}
            <div
              className="w-9 h-9 rounded-full bg-white border-2 border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.18)] flex items-center justify-center text-sm font-bold text-primary ring-2 ring-white/20 flex-shrink-0"
              title={currentUser.displayName}
              aria-label={`Profil ${currentUser.displayName}`}
            >
              {currentUser.displayName[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto ${currentUser.role==="guru_piket"?"pb-16 md:pb-0":""}`}>
          {isPiketCatat ? (
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <button onClick={()=>{setEditTarget(null);setView("piket_kasus");}} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/40 text-xs font-medium text-muted-foreground">
                  <ArrowLeft size={14}/> Kembali ke Kasus Saya
                </button>
              </div>
              <div className="max-w-2xl">
                <ViolationModal
                  init={editTarget??undefined} students={studs} vts={vts} currentUser={currentUser}
                  onSave={v=>{if(editTarget)editV(v);else addV(v);setEditTarget(null);setView("piket_kasus");}}
                  onClose={()=>{setEditTarget(null);setView("piket_kasus");}}
                />
              </div>
            </div>
          ) : content}
        </main>
        {currentUser.role==="guru_piket"&&(
          <MobileBottomNav
            view={view}
            onNav={v=>{if(v==="piket_catat")setEditTarget(null);setView(v as AppView);}}
            onLogout={handleLogout}
            badge={{
              piket_kasus:viols.filter(v=>v.officerId===currentUser.id&&v.verifyStatus==="ditolak").length||0,
              piket_bimbingan:guid.filter(g=>g.assignedTo===currentUser.id&&g.status!=="selesai").length||0,
            }}
          />
        )}
      </div>
    </div>
  );
}
