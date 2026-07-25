<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GuidanceEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id', 'date', 'topic', 'notes', 'officer',
        'follow_up', 'status', 'assigned_to', 'requested_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function requestedByUser()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
