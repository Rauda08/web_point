<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nis', 'nisn', 'name', 'kelas', 'gender',
        'parent_name', 'parent_phone', 'total_points',
        'status', 'lulus_year',
    ];

    protected function casts(): array
    {
        return [
            'total_points' => 'integer',
            'lulus_year' => 'integer',
        ];
    }

    public function violations()
    {
        return $this->hasMany(Violation::class);
    }

    public function guidanceEntries()
    {
        return $this->hasMany(GuidanceEntry::class);
    }

    public function parentSummons()
    {
        return $this->hasMany(ParentSummon::class);
    }

    /**
     * Hitung ulang total poin siswa berdasarkan pelanggaran yang
     * berstatus "diverifikasi" saja, dikurangi debit poin (point_reduction) bila ada.
     */
    public function recalculatePoints(): int
    {
        $total = $this->violations()
            ->where('verify_status', 'diverifikasi')
            ->with('violationType:id,points')
            ->get()
            ->sum(function (Violation $v) {
                $poin = $v->violationType->points ?? 0;
                return max(0, $poin - (int) ($v->point_reduction ?? 0));
            });

        $this->total_points = max(0, $total);
        $this->save();

        return $this->total_points;
    }

    public function sanctionLabel(): string
    {
        $p = $this->total_points;
        return match (true) {
            $p === 0 => 'Baik',
            $p <= 75 => 'Peringatan Lisan',
            $p < 150 => 'Hukuman Khusus',
            $p < 300 => 'SP Tertulis + Panggil Orang Tua',
            $p < 400 => 'Panggil Orang Tua + Skorsing',
            $p < 501 => 'Panggil Orang Tua + Pernyataan',
            default => 'Dikembalikan ke Orang Tua',
        };
    }
}
