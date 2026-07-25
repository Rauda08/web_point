<!DOCTYPE html>
<html>
<head><meta charset="utf-8">@include('pdf.partials.kop')</head>
<body>

<div class="doc-title">SURAT PANGGILAN ORANG TUA / WALI</div>
<div class="doc-no">Nomor: {{ $nomorSurat }}</div>

<p style="margin-bottom:10px;">
    Dengan hormat, sehubungan dengan permasalahan kedisiplinan putra/putri Bapak/Ibu di sekolah,
    kami mengundang Bapak/Ibu orang tua/wali dari:
</p>

<div class="info-row"><span class="info-label">Nama Siswa</span>: {{ $summon->student->name }}</div>
<div class="info-row"><span class="info-label">NIS</span>: {{ $summon->student->nis }}</div>
<div class="info-row"><span class="info-label">Kelas</span>: {{ $summon->student->kelas }}</div>
<div class="info-row"><span class="info-label">Nama Orang Tua/Wali</span>: {{ $summon->student->parent_name }}</div>

<p style="margin:10px 0;">untuk hadir pada:</p>

<div class="info-row"><span class="info-label">Hari/Tanggal</span>: {{ \Carbon\Carbon::parse($summon->scheduled_date)->translatedFormat('l, d F Y') }}</div>
<div class="info-row"><span class="info-label">Pukul</span>: {{ \Carbon\Carbon::parse($summon->jam)->format('H:i') }} WIB</div>
<div class="info-row"><span class="info-label">Tempat</span>: {{ $summon->location }}</div>
<div class="info-row"><span class="info-label">Keperluan</span>: {{ $summon->reason }}</div>

<p style="margin:10px 0;">
    Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan
    terima kasih.
</p>

<table class="sig-wrap">
    <tr>
        <td class="sig-cell"></td>
        <td class="sig-cell">
            Terantang Manuk, {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}<br>
            Wali Kelas {{ $summon->wali_kelas ? '('.$summon->wali_kelas.')' : '' }}<br><br><br>
            ({{ $summon->wali_kelas }})<br>
            @if($summon->wali_kelas_nip)NIP. {{ $summon->wali_kelas_nip }}@endif
        </td>
    </tr>
</table>

<div class="footer">Dokumen ini dihasilkan otomatis oleh Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa SMA Negeri 2 Pangkalan Kuras.</div>
</body>
</html>
