<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentSummon;
use App\Models\Student;
use App\Models\Violation;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function student(Student $student)
    {
        $violations = $student->violations()
            ->with('violationType')
            ->orderByDesc('date')
            ->get();

        $pdf = Pdf::loadView('pdf.student', compact('student', 'violations'))->setPaper('a4');

        return $pdf->stream("laporan-{$student->nis}.pdf");
    }

    public function kelas(Request $request)
    {
        $data = $request->validate(['kelas' => ['required', 'string']]);

        $students = Student::where('kelas', $data['kelas'])
            ->withCount('violations')
            ->orderBy('name')
            ->get();

        $pdf = Pdf::loadView('pdf.kelas', ['kelas' => $data['kelas'], 'students' => $students])->setPaper('a4', 'landscape');

        return $pdf->stream("laporan-kelas-{$data['kelas']}.pdf");
    }

    public function periode(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $violations = Violation::whereBetween('date', [$data['from'], $data['to']])
            ->with(['student', 'violationType'])
            ->orderByDesc('date')
            ->get();

        $pdf = Pdf::loadView('pdf.periode', [
            'from' => $data['from'], 'to' => $data['to'], 'violations' => $violations,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream('laporan-periode.pdf');
    }

    public function kategori()
    {
        $violations = Violation::where('verify_status', 'diverifikasi')
            ->with(['student', 'violationType'])
            ->get()
            ->groupBy(fn ($v) => $v->violationType->category);

        $pdf = Pdf::loadView('pdf.kategori', ['grouped' => $violations])->setPaper('a4');

        return $pdf->stream('laporan-kategori.pdf');
    }

    public function peringatan(Request $request, Student $student)
    {
        $ke = $request->integer('ke', 1);
        $violations = $student->violations()->with('violationType')->orderByDesc('date')->get();
        $nomorSurat = now()->format('dmY').'/SP-'.$ke.'/SMAN2-PK/'.now()->format('Y');

        $pdf = Pdf::loadView('pdf.peringatan', compact('student', 'violations', 'ke', 'nomorSurat'))->setPaper('a4');

        return $pdf->stream("surat-peringatan-{$student->nis}.pdf");
    }

    public function panggilan(ParentSummon $summon)
    {
        $summon->load('student');
        $nomorSurat = now()->format('dmY').'/SPO/SMAN2-PK/'.now()->format('Y');

        $pdf = Pdf::loadView('pdf.panggilan', compact('summon', 'nomorSurat'))->setPaper('a4');

        return $pdf->stream("surat-panggilan-{$summon->student->nis}.pdf");
    }
}
