<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentSummon extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id', 'date', 'reason', 'scheduled_date', 'jam',
        'location', 'wali_kelas', 'wali_kelas_jabatan', 'wali_kelas_nip',
        'status', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'scheduled_date' => 'date',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
