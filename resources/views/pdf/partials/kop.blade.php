{{-- resources/views/pdf/partials/kop.blade.php --}}
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #111; }
    .kop { width: 100%; border-bottom: 4px solid #111; padding-bottom: 4px; margin-bottom: 2px; }
    .kop table { width: 100%; border: none; }
    .kop td { border: none; padding: 0; vertical-align: middle; }
    .kop-logo { width: 78px; text-align: center; }
    .kop-logo img { width: 68px; height: 68px; object-fit: contain; }
    .kop-center { text-align: center; }
    .kop-prov { font-size: 13px; font-weight: bold; }
    .kop-school { font-size: 21px; font-weight: bold; }
    .kop-addr { font-size: 10.5px; font-weight: bold; font-style: italic; }
    .kop-meta { font-size: 10.5px; font-weight: bold; font-style: italic; display: flex; justify-content: space-between; }
    .kop-akred { font-size: 11px; font-weight: bold; font-style: italic; }
    .kop-line2 { border-top: 2px solid #111; margin-bottom: 14px; }
    .doc-title { text-align: center; font-size: 14px; font-weight: bold; margin-top: 14px; }
    .doc-sub { text-align: center; font-size: 10.5px; color: #444; margin-bottom: 4px; }
    .doc-no { text-align: center; font-size: 12px; margin-bottom: 14px; }
    table.data { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    table.data th { background: #1a3528; color: #fff; padding: 5px 8px; text-align: left; }
    table.data td { padding: 4px 8px; border-bottom: 1px solid #ccc; }
    .section-title { font-size: 12px; font-weight: bold; margin: 12px 0 6px; border-bottom: 2px solid #111; padding-bottom: 3px; }
    .info-row { font-size: 12px; margin-bottom: 4px; }
    .info-label { font-weight: bold; display: inline-block; width: 160px; }
    .sig-wrap { width: 100%; margin-top: 30px; }
    .sig-cell { text-align: center; font-size: 11px; width: 50%; }
    .footer { margin-top: 18px; font-size: 8.5px; color: #888; border-top: 1px solid #ddd; padding-top: 5px; }
</style>

<div class="kop">
    <table>
        <tr>
            <td class="kop-logo"><img src="{{ public_path('images/logo_riau.png') }}"></td>
            <td class="kop-center">
                <div class="kop-prov">PEMERINTAH PROVINSI RIAU</div>
                <div class="kop-school">SMA NEGERI 2 PANGKALAN KURAS</div>
                <div class="kop-addr">Alamat : Jl. Lintas Timur KM. 102 Terantang Manuk Kode Pos 28382</div>
                <div class="kop-addr">e-mail sman2 pklkuras@yahoo.co.id</div>
            </td>
            <td class="kop-logo"><img src="{{ public_path('images/logo_sekolah.png') }}"></td>
        </tr>
    </table>
    <table style="margin-top:3px;">
        <tr>
            <td style="width:50%;font-size:10.5px;font-weight:bold;font-style:italic;">NSS : 301040605018</td>
            <td style="width:50%;font-size:10.5px;font-weight:bold;font-style:italic;text-align:right;">NPSN : 10494082</td>
        </tr>
    </table>
    <div class="kop-akred" style="text-align:center;">AKREDITASI : A</div>
</div>
<div class="kop-line2"></div>
