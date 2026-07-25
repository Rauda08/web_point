<!DOCTYPE html>
<html>
<head><meta charset="utf-8">@include('pdf.partials.kop')</head>
<body>

<div class="doc-title">LAPORAN PELANGGARAN PERIODE</div>
<div class="doc-sub">
    {{ \Carbon\Carbon::parse($from)->translatedFormat('d F Y') }}
    s.d.
    {{ \Carbon\Carbon::parse($to)->translatedFormat('d F Y') }}
</div>

<table class="data">
    <thead>
        <tr><th>No</th><th>Tanggal</th><th>Nama Siswa</th><th>Kelas</th><th>Jenis Pelanggaran</th><th>Kategori</th><th>Poin</th><th>Petugas</th></tr>
    </thead>
    <tbody>
        @forelse($violations as $i => $v)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ \Carbon\Carbon::parse($v->date)->translatedFormat('d M Y') }}</td>
            <td>{{ $v->student->name }}</td>
            <td>{{ $v->student->kelas }}</td>
            <td>{{ $v->violationType->name }}</td>
            <td>{{ ucfirst($v->violationType->category) }}</td>
            <td>{{ $v->violationType->points }}</td>
            <td>{{ $v->officer }}</td>
        </tr>
        @empty
        <tr><td colspan="8">Tidak ada pelanggaran pada periode ini.</td></tr>
        @endforelse
    </tbody>
</table>

<div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa SMA Negeri 2 Pangkalan Kuras.</div>
</body>
</html>
