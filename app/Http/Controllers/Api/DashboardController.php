<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuidanceEntry;
use App\Models\ParentSummon;
use App\Models\Student;
use App\Models\Violation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = now()->toDateString();
        $startOfMonth = now()->startOfMonth()->toDateString();

        $violationsQuery = Violation::query();
        if ($request->user()->role === 'guru_piket') {
            $violationsQuery->where('officer_id', $request->user()->id);
        }

        $violationsPerCategory = Violation::join('violation_types', 'violations.violation_type_id', '=', 'violation_types.id')
            ->select('violation_types.category', DB::raw('count(*) as total'))
            ->groupBy('violation_types.category')
            ->pluck('total', 'category');

        $driver = DB::connection()->getDriverName();
        $monthExpr = $driver === 'sqlite'
            ? "strftime('%Y-%m', date)"
            : "DATE_FORMAT(date, '%Y-%m')";

        $violationsPerMonth = Violation::select(
            DB::raw("{$monthExpr} as bulan"),
            DB::raw('count(*) as total')
        )
            ->where('date', '>=', now()->subMonths(6)->toDateString())
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->get();

        $violationsPerClass = Violation::join('students', 'violations.student_id', '=', 'students.id')
            ->select('students.kelas', DB::raw('count(*) as total'))
            ->groupBy('students.kelas')
            ->orderByDesc('total')
            ->get();

        $topViolationTypes = Violation::join('violation_types', 'violations.violation_type_id', '=', 'violation_types.id')
            ->select('violation_types.name', DB::raw('count(*) as total'))
            ->groupBy('violation_types.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return response()->json([
            'total_siswa_aktif' => Student::where('status', 'aktif')->count(),
            'total_kelas' => Student::where('status', 'aktif')->distinct('kelas')->count('kelas'),
            'pelanggaran_hari_ini' => (clone $violationsQuery)->whereDate('date', $today)->count(),
            'pelanggaran_bulan_ini' => (clone $violationsQuery)->where('date', '>=', $startOfMonth)->count(),
            'siswa_tanpa_poin' => Student::where('status', 'aktif')->where('total_points', 0)->count(),
            'siswa_dengan_poin' => Student::where('status', 'aktif')->where('total_points', '>', 0)->count(),
            'siswa_mendekati_batas' => Student::where('status', 'aktif')->whereBetween('total_points', [100, 149])->count(),
            'siswa_mencapai_batas' => Student::where('status', 'aktif')->where('total_points', '>=', 150)->count(),
            'menunggu_verifikasi' => (clone $violationsQuery)->where('verify_status', 'menunggu')->count(),
            'dalam_pembinaan' => GuidanceEntry::where('status', 'berlangsung')->count(),
            'pemanggilan_belum_selesai' => ParentSummon::whereNotIn('status', ['selesai'])->count(),
            'pelanggaran_per_kategori' => $violationsPerCategory,
            'pelanggaran_per_bulan' => $violationsPerMonth,
            'pelanggaran_per_kelas' => $violationsPerClass,
            'jenis_pelanggaran_terbanyak' => $topViolationTypes,
            'pelanggaran_terbaru' => (clone $violationsQuery)->with(['student:id,name,kelas', 'violationType:id,name,category'])
                ->orderByDesc('date')->limit(5)->get(),
            'siswa_perlu_tindak_lanjut' => Student::where('status', 'aktif')
                ->where('total_points', '>=', 150)
                ->orderByDesc('total_points')
                ->limit(5)
                ->get(['id', 'nis', 'name', 'kelas', 'total_points']),
        ]);
    }
}
