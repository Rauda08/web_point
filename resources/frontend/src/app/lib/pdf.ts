import type { Student, Violation, ViolationType, GuidanceEntry, ParentSummon } from "@/app/types";
import { getSanction, fmtDate, fmtTime, getVerifyInfo, getSummonStatus, MONTH_NAMES } from "@/app/lib/helpers";
import schoolLogo from "@/imports/image-1.png";
import riauLogo from "@/imports/image-3.png";

export const PDF_CSS = `<style>
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
  .letter-table{width:auto;margin-bottom:0}
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

export async function toB64(url: string) {
  const r = await fetch(url); const b = await r.blob();
  return new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); });
}
export function kopHtml(rl: string, sl: string) {
  return `<div class="kop"><img class="kop-logo" src="${rl}"/><div class="kop-center"><div class="kop-prov">PEMERINTAH PROVINSI RIAU</div><div class="kop-school">SMA NEGERI 2 PANGKALAN KURAS</div><div class="kop-addr">Jl. Lintas Timur KM. 102 Terantang Manuk Kode Pos 28382</div><div>e-mail: <u>pklkuras@yahoo.co.id</u></div><div class="kop-meta"><span>NSS: 301040605018</span><span>NPSN: 10494082</span></div><div class="kop-akred">AKREDITASI: A</div></div><img class="kop-logo" src="${sl}"/></div><hr class="kop-line1"/><hr class="kop-line2"/>`;
}
export async function printDoc(html: string, hideFooter = false) {
  const [rl, sl] = await Promise.all([toB64(riauLogo), toB64(schoolLogo)]);
  const w = window.open("","_blank","width=980,height=820");
  if (!w) return;
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
export function hdr(title: string, sub?: string) {
  return `<div class="doc-title">${title}</div>${sub?`<div class="doc-sub">${sub}</div>`:""}`;
}
export function tbl(headers: string[], rows: (string|number)[][]) {
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
export function sig(...labels: string[]) {
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
export function bdgCls(pts: number) { return pts===0?"b-ok":pts<=75?"b-warn":pts<150?"b-warn":"b-bad"; }

export async function pdfStudent(s: Student, violations: Violation[], vts: ViolationType[]) {
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
export async function pdfClass(kelas: string, students: Student[], violations: Violation[], vts: ViolationType[]) {
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
export async function pdfPeriod(from: string, to: string, violations: Violation[], students: Student[], vts: ViolationType[]) {
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
export async function pdfCategory(violations: Violation[], vts: ViolationType[], students: Student[]) {
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
export async function pdfWarning(s: Student, violations: Violation[], vts: ViolationType[], n: number) {
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
export async function pdfParent(s: Student, summon?: ParentSummon) {
  const yr  = new Date().getFullYear();
  const seq = summon ? summon.id.slice(-3).replace(/\D/g,"").padStart(3,"0") : "001";
  const nomor = `400.3.8.1/SMAN-2/I/${yr}/${seq}`;
  // Format scheduledDate from YYYY-MM-DD to Indonesian long form
  const jadwal = summon?.scheduledDate
    ? new Date(summon.scheduledDate+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
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

export async function pdfMonthly(
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
