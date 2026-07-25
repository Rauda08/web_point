<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Violation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'student_id', 'violation_type_id', 'date', 'time', 'location',
        'chronology', 'officer', 'officer_id', 'witness',
        'status', 'verify_status', 'sanksi_langsung', 'evidence_path',
        'point_reduction', 'point_reduction_note',
        'verified_by', 'verified_at', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'point_reduction' => 'integer',
            'verified_at' => 'datetime',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function violationType()
    {
        return $this->belongsTo(ViolationType::class);
    }

    public function officerUser()
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
