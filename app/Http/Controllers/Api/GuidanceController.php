<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuidanceEntry;
use App\Models\Student;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GuidanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = GuidanceEntry::with(['student:id,nis,name,kelas']);

        if ($user->role === 'guru_piket') {
            $query->where('assigned_to', $user->id);
        }

        if ($studentId = $request->query('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json(
            $query->orderByDesc('date')->paginate($request->integer('per_page', 20))
        );
    }

    public function store(Request $request)
    {
        /*
         * Perlindungan tambahan:
         * frontend terbaru mengirim tanggal, tetapi apabila browser masih
         * memakai bundle/cache lama dan date kosong, gunakan tanggal hari ini.
         */
        if (! $request->filled('date')) {
            $request->merge([
                'date' => now()->toDateString(),
            ]);
        }

        $data = $this->validateData($request);

        $student = Student::findOrFail($data['student_id']);

        if ($student->status !== 'aktif' || $student->lulus_year !== null) {
            return response()->json([
                'message' => 'Siswa alumni atau tidak aktif tidak dapat dipilih untuk tugas bimbingan baru.',
                'errors' => [
                    'student_id' => [
                        'Pilih siswa yang masih berstatus aktif.',
                    ],
                ],
            ], 422);
        }

        $data['requested_by'] = $request->user()->id;

        $entry = GuidanceEntry::create($data);

        ActivityLogger::log(
            'created',
            $entry,
            "Menjadwalkan pembinaan untuk siswa #{$entry->student_id}"
        );

        return response()->json(
            $entry->load('student:id,nis,name,kelas'),
            201
        );
    }

    public function show(GuidanceEntry $guidance)
    {
        return response()->json(
            $guidance->load('student:id,nis,name,kelas')
        );
    }

    public function update(Request $request, GuidanceEntry $guidance)
    {
        $data = $this->validateData($request, true);

        $guidance->update($data);

        ActivityLogger::log(
            'updated',
            $guidance,
            'Memperbarui catatan pembinaan'
        );

        return response()->json(
            $guidance->fresh()->load('student:id,nis,name,kelas')
        );
    }

    public function destroy(GuidanceEntry $guidance)
    {
        $guidanceId = $guidance->id;
        $guidance->delete();

        ActivityLogger::log(
            'deleted',
            null,
            "Menghapus catatan pembinaan #{$guidanceId}"
        );

        return response()->json([
            'message' => 'Catatan pembinaan dihapus.',
        ]);
    }

    private function validateData(Request $request, bool $isUpdate = false): array
    {
        $required = $isUpdate
            ? ['sometimes', 'required']
            : ['required'];

        return $request->validate([
            'student_id' => [...$required, 'integer', 'exists:students,id'],
            'date' => [...$required, 'date'],
            'topic' => [...$required, 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'officer' => [...$required, 'string', 'max:255'],
            'follow_up' => ['sometimes', 'nullable', 'string'],
            'status' => [
                'sometimes',
                'nullable',
                Rule::in(['dijadwalkan', 'berlangsung', 'selesai']),
            ],
            'assigned_to' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
            ],
        ]);
    }
}
