<!DOCTYPE html>
<html>
<head><meta charset="utf-8">@include('pdf.partials.kop')</head>
<body>

<div class="doc-title">LAPORAN KEDISIPLINAN PER KELAS</div>
<div class="doc-sub">Kelas {{ $kelas }}</div>

<table class="data">
    <thead>
        <tr><th>No</th><th>NIS</th><th>Nama</th><th>Jenis Kelamin</th><th>Total Poin</th><th>Jumlah Kasus</th><th>Status</th></tr>
    </thead>
    <tbody>
        @forelse($students as $i => $s)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ $s->nis }}</td>
            <td>{{ $s->name }}</td>
            <td>{{ $s->gender }}</td>
            <td>{{ $s->total_points }}</td>
            <td>{{ $s->violations_count }}</td>
            <td>{{ $s->sanctionLabel() }}</td>
        </tr>
        @empty
        <tr><td colspan="7">Tidak ada data siswa pada kelas ini.</td></tr>
        @endforelse
    </tbody>
</table>

<table class="sig-wrap">
    <tr>
        <td class="sig-cell">Waka Kesiswaan<br><br><br><br>(....................................)</td>
        <td class="sig-cell">
            Terantang Manuk, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}<br>
            Wali Kelas {{ $kelas }}<br><br><br>
            (....................................)
        </td>
    </tr>
</table>

<div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa SMA Negeri 2 Pangkalan Kuras.</div>
</body>
</html>
