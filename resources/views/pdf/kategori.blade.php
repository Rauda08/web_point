<!DOCTYPE html>
<html>
<head><meta charset="utf-8">@include('pdf.partials.kop')</head>
<body>

<div class="doc-title">LAPORAN PELANGGARAN BERDASARKAN KATEGORI</div>

@foreach($grouped as $category => $items)
<div class="section-title">Kategori: {{ ucfirst($category) }}</div>
<table class="data">
    <thead>
        <tr><th>No</th><th>Jenis Pelanggaran</th><th>Nama Siswa</th><th>Kelas</th><th>Tanggal</th><th>Poin</th></tr>
    </thead>
    <tbody>
        @forelse($items as $i => $v)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ $v->violationType->name }}</td>
            <td>{{ $v->student->name }}</td>
            <td>{{ $v->student->kelas }}</td>
            <td>{{ \Carbon\Carbon::parse($v->date)->translatedFormat('d M Y') }}</td>
            <td>{{ $v->violationType->points }}</td>
        </tr>
        @empty
        <tr><td colspan="6">Tidak ada data.</td></tr>
        @endforelse
    </tbody>
</table>
@endforeach

<div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa SMA Negeri 2 Pangkalan Kuras.</div>
</body>
</html>
