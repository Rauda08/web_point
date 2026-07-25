<!DOCTYPE html>
<html>
<head><meta charset="utf-8">@include('pdf.partials.kop')</head>
<body>

<div class="doc-title">SURAT PERINGATAN {{ $ke === 1 ? 'PERTAMA' : ($ke === 2 ? 'KEDUA' : 'KE-'.$ke) }}</div>
<div class="doc-no">Nomor: {{ $nomorSurat }}</div>

<p style="margin-bottom:10px;">
    Sehubungan dengan rekapitulasi poin pelanggaran tata tertib sekolah, dengan ini pihak sekolah
    menyampaikan surat peringatan kepada:
</p>

<div class="info-row"><span class="info-label">Nama Siswa</span>: {{ $student->name }}</div>
<div class="info-row"><span class="info-label">NIS</span>: {{ $student->nis }}</div>
<div class="info-row"><span class="info-label">Kelas</span>: {{ $student->kelas }}</div>
<div class="info-row"><span class="info-label">Total Poin Saat Ini</span>: {{ $student->total_points }}</div>
<div class="info-row"><span class="info-label">Status</span>: {{ $student->sanctionLabel() }}</div>

<div class="section-title">Rincian Pelanggaran</div>
<table class="data">
    <thead>
        <tr><th>No</th><th>Tanggal</th><th>Jenis Pelanggaran</th><th>Poin</th><th>Lokasi</th><th>Petugas</th></tr>
    </thead>
    <tbody>
        @foreach($violations as $i => $v)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ \Carbon\Carbon::parse($v->date)->translatedFormat('d M Y') }}</td>
            <td>{{ $v->violationType->name }}</td>
            <td>{{ $v->violationType->points }}</td>
            <td>{{ $v->location }}</td>
            <td>{{ $v->officer }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<p style="margin-bottom:10px;">
    Kami mohon perhatian dan kerja sama Bapak/Ibu orang tua/wali untuk membimbing putra/putri
    agar tidak mengulangi pelanggaran serupa. Apabila poin pelanggaran terus bertambah, sekolah
    akan mengambil tindakan sesuai ketentuan tata tertib yang berlaku.
</p>

<table class="sig-wrap">
    <tr>
        <td class="sig-cell">Guru BK / Kesiswaan<br><br><br><br>(....................................)</td>
        <td class="sig-cell">
            Terantang Manuk, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}<br>
            Kepala Sekolah<br><br><br>
            (....................................)
        </td>
    </tr>
</table>

<div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa SMA Negeri 2 Pangkalan Kuras.</div>
</body>
</html>
