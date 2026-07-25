<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentSummon;
use App\Models\Student;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ParentSummonController extends Controller
{
    public function index(Request $request)
    {
        $query = ParentSummon::with(['student:id,nis,name,kelas,parent_name,parent_phone']);

        if ($studentId = $request->query('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->orderByDesc('scheduled_date')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        $student = Student::findOrFail($data['student_id']);

        if ($student->status !== 'aktif' || $student->lulus_year !== null) {
            return response()->json([
                'message' => 'Siswa alumni atau tidak aktif tidak dapat dipilih untuk panggilan orang tua baru.',
                'errors' => [
                    'student_id' => [
                        'Pilih siswa yang masih berstatus aktif.',
                    ],
                ],
            ], 422);
        }

        $data['created_by'] = $request->user()->id;

        $summon = ParentSummon::create($data);
        ActivityLogger::log('created', $summon, "Membuat surat pemanggilan orang tua untuk siswa #{$summon->student_id}");

        return response()->json($summon->load('student'), 201);
    }

    public function show(ParentSummon $summon)
    {
        return response()->json($summon->load('student'));
    }

    public function update(Request $request, ParentSummon $summon)
    {
        $data = $this->validateData($request);
        $summon->update($data);
        ActivityLogger::log('updated', $summon, 'Memperbarui data pemanggilan orang tua');

        return response()->json($summon);
    }

    public function destroy(ParentSummon $summon)
    {
        $summon->delete();
        ActivityLogger::log('deleted', null, "Menghapus pemanggilan orang tua #{$summon->id}");

        return response()->json(['message' => 'Data pemanggilan dihapus.']);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'date' => ['required', 'date'],
            'reason' => ['required', 'string'],
            'scheduled_date' => ['required', 'date'],
            'jam' => ['required'],
            'location' => ['required', 'string'],
            'wali_kelas' => ['required', 'string'],
            'wali_kelas_jabatan' => ['nullable', 'string'],
            'wali_kelas_nip' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['draft', 'dikirim', 'hadir', 'tidak_hadir', 'selesai'])],
        ]);
    }
}
