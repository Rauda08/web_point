<!DOCTYPE html>
<html>
<head><meta charset="utf-8">@include('pdf.partials.kop')</head>
<body>

<div class="doc-title">LAPORAN PELANGGARAN SISWA</div>
<div class="doc-sub">Tahun Pelajaran {{ $tahunPelajaran ?? now()->year }}</div>

<div class="info-row"><span class="info-label">Nama Siswa</span>: {{ $student->name }}</div>
<div class="info-row"><span class="info-label">NIS</span>: {{ $student->nis }}</div>
<div class="info-row"><span class="info-label">Kelas</span>: {{ $student->kelas }}</div>
<div class="info-row"><span class="info-label">Total Poin</span>: {{ $student->total_points }}</div>
<div class="info-row"><span class="info-label">Status Kedisiplinan</span>: {{ $student->sanctionLabel() }}</div>

<div class="section-title">Riwayat Pelanggaran</div>
<table class="data">
    <thead>
        <tr>
            <th>No</th><th>Tanggal</th><th>Jenis Pelanggaran</th><th>Kategori</th>
            <th>Poin</th><th>Petugas</th><th>Status</th>
        </tr>
    </thead>
    <tbody>
        @forelse($violations as $i => $v)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ \Carbon\Carbon::parse($v->date)->translatedFormat('d M Y') }}</td>
            <td>{{ $v->violationType->name }}</td>
            <td>{{ ucfirst($v->violationType->category) }}</td>
            <td>{{ $v->violationType->points }}</td>
            <td>{{ $v->officer }}</td>
            <td>{{ ucfirst($v->status) }}</td>
        </tr>
        @empty
        <tr><td colspan="7">Tidak ada riwayat pelanggaran.</td></tr>
        @endforelse
    </tbody>
</table>

<table class="sig-wrap">
    <tr>
        <td class="sig-cell">
            Wali Kelas / Guru BK<br><br><br><br>
            (....................................)
        </td>
        <td class="sig-cell">
            Terantang Manuk, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}<br>
            Orang Tua / Wali<br><br><br>
            (....................................)
        </td>
    </tr>
</table>

<div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa SMA Negeri 2 Pangkalan Kuras.</div>
</body>
</html>
