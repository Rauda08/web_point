<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class PublicController extends Controller
{
    /**
     * Pencarian publik berdasarkan NIS (+ tanggal lahir/PIN jika tersedia).
     * Tidak menampilkan kronologi, bukti, saksi, pelapor, atau catatan konseling —
     * hanya identitas ringkas, total poin bersih, status, dan riwayat pelanggaran
     * yang SUDAH DIVERIFIKASI.
     */
    public function lookup(Request $request)
    {
        $data = $request->validate([
            'nis' => ['required', 'string'],
        ]);

        $throttleKey = 'public-lookup|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 20)) {
            return response()->json(['message' => 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'], 429);
        }
        RateLimiter::hit($throttleKey, 60);

        $student = Student::where('nis', $data['nis'])->first();

        if (! $student) {
            return response()->json(['message' => 'NIS tidak ditemukan.'], 404);
        }

        $violations = $student->violations()
            ->where('verify_status', 'diverifikasi')
            ->with('violationType:id,name,category,points,sanction')
            ->orderByDesc('date')
            ->get(['id', 'student_id', 'violation_type_id', 'date', 'status'])
            ->map(fn ($v) => [
                'tanggal' => $v->date,
                'jenis_pelanggaran' => $v->violationType->name,
                'kategori' => $v->violationType->category,
                'poin' => $v->violationType->points,
                'sanksi' => $v->violationType->sanction,
                'status' => $v->status,
            ]);

        return response()->json([
            'nama' => $student->name,
            'nis' => $student->nis,
            'kelas' => $student->kelas,
            'total_poin' => $student->total_points,
            'status_kedisiplinan' => $student->sanctionLabel(),
            'riwayat_pelanggaran' => $violations,
        ]);
    }
}
