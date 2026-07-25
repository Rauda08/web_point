<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Violation;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ViolationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Violation::with(['student:id,nis,name,kelas,total_points', 'violationType']);

        // Guru piket hanya melihat kasus miliknya sendiri, kecuali sudah diverifikasi (riwayat umum)
        if ($user->role === 'guru_piket') {
            $query->where(function ($q) use ($user) {
                $q->where('officer_id', $user->id)
                    ->orWhere('verify_status', 'diverifikasi');
            });
        }

        if ($studentId = $request->query('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($vs = $request->query('verify_status')) {
            $query->where('verify_status', $vs);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($from = $request->query('from')) {
            $query->where('date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('date', '<=', $to);
        }

        $violations = $query->orderByDesc('date')->paginate($request->integer('per_page', 20));

        return response()->json($violations);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $user = $request->user();

        /*
         * Catatan pelanggaran baru hanya boleh dibuat untuk siswa aktif.
         * Perlindungan backend ini tetap berlaku walaupun browser masih
         * memakai cache frontend lama atau request dikirim manual.
         */
        $student = Student::findOrFail($data['student_id']);

        if ($student->status !== 'aktif' || $student->lulus_year !== null) {
            return response()->json([
                'message' => 'Siswa alumni atau tidak aktif tidak dapat diberi catatan pelanggaran baru.',
                'errors' => [
                    'student_id' => [
                        'Pilih siswa yang masih berstatus aktif.',
                    ],
                ],
            ], 422);
        }

        $data['officer_id'] = $user->id;
        $data['officer'] = $data['officer'] ?? $user->name;
        // Status verifikasi ditentukan berdasarkan akun yang dikenali backend.
        // Admin langsung diverifikasi. Guru piket hanya boleh membuat draft
        // atau mengirim sebagai "menunggu"; nilai "diverifikasi" dari browser
        // tidak pernah dipercaya.
        if ($user->isAdmin()) {
            $data['verify_status'] = 'diverifikasi';
            $data['verified_by'] = $user->id;
            $data['verified_at'] = now();
        } else {
            $requestedVerifyStatus = $request->input('verify_status');
            $data['verify_status'] = $requestedVerifyStatus === 'menunggu'
                ? 'menunggu'
                : 'draft';
            $data['status'] = 'belum';
            $data['verified_by'] = null;
            $data['verified_at'] = null;
        }

        if ($request->hasFile('evidence')) {
            $data['evidence_path'] = $request->file('evidence')->store('evidence', 'local');
        }

        $violation = Violation::create($data);
        $violation->load(['student', 'violationType']);

        /*
         * Pelanggaran kategori ringan tidak membutuhkan tindak lanjut.
         * Jika dicatat oleh admin, catatan sudah diverifikasi sehingga
         * langsung ditandai selesai dan masuk ke Riwayat.
         */
        if (
            $violation->verify_status === 'diverifikasi'
            && $violation->violationType?->category === 'ringan'
        ) {
            $violation->update(['status' => 'selesai']);
        }

        if ($violation->verify_status === 'diverifikasi') {
            $violation->student->recalculatePoints();
        }

        ActivityLogger::log('created', $violation, "Mencatat pelanggaran {$violation->violationType->name} untuk {$violation->student->name}");

        return response()->json($violation, 201);
    }

    public function show(Request $request, Violation $violation)
    {
        $this->authorizeOwnershipOrAdmin($request, $violation);
        $violation->load(['student', 'violationType', 'officerUser:id,name', 'verifier:id,name']);

        return response()->json($violation);
    }

    public function update(Request $request, Violation $violation)
    {
        $this->authorizeOwnershipOrAdmin($request, $violation);

        if (! $request->user()->isAdmin() && ! in_array($violation->verify_status, ['draft', 'ditolak'])) {
            return response()->json(['message' => 'Kasus yang sudah dikirim/diverifikasi tidak dapat diubah oleh guru piket.'], 403);
        }

        $data = $this->validateData($request, true);

        if ($request->hasFile('evidence')) {
            if ($violation->evidence_path) {
                Storage::disk('local')->delete($violation->evidence_path);
            }
            $data['evidence_path'] = $request->file('evidence')->store('evidence', 'local');
        }

        $wasVerified = $violation->verify_status === 'diverifikasi';
        $violation->update($data);
        $violation->load('student');

        if ($wasVerified || $violation->verify_status === 'diverifikasi') {
            $violation->student->recalculatePoints();
        }

        ActivityLogger::log('updated', $violation, 'Mengubah data pelanggaran');

        return response()->json($violation);
    }

    public function destroy(Request $request, Violation $violation)
    {
        $this->authorizeOwnershipOrAdmin($request, $violation);
        $student = $violation->student;
        $wasVerified = $violation->verify_status === 'diverifikasi';

        if ($violation->evidence_path) {
            Storage::disk('local')->delete($violation->evidence_path);
        }
        $violation->delete();

        if ($wasVerified) {
            $student->recalculatePoints();
        }

        ActivityLogger::log('deleted', null, "Menghapus catatan pelanggaran #{$violation->id}");

        return response()->json(['message' => 'Data pelanggaran dihapus.']);
    }

    /**
     * Guru piket mengirim kasus draft untuk diverifikasi admin/BK.
     */
    public function submit(Request $request, Violation $violation)
    {
        $this->authorizeOwnershipOrAdmin($request, $violation);
        $violation->update(['verify_status' => 'menunggu']);
        ActivityLogger::log('submitted', $violation, 'Mengirim kasus untuk diverifikasi');

        return response()->json($violation);
    }

    /**
     * Admin/BK memverifikasi atau menolak kasus. Hanya admin.
     * payload verifikasi: { action: "verify" | "reject", point_reduction?, point_reduction_note?, rejection_reason? }
     */
    public function verify(Request $request, Violation $violation)
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['verify', 'reject'])],
            'point_reduction' => ['nullable', 'integer', 'min:0'],
            'point_reduction_note' => ['nullable', 'string'],
            'rejection_reason' => ['nullable', 'string', 'required_if:action,reject'],
        ]);

        if ($data['action'] === 'verify') {
            $violation->loadMissing('violationType');

            /*
             * Kategori ringan tidak membutuhkan tindak lanjut.
             * Setelah diperiksa dan diverifikasi admin, langsung selesai
             * sehingga otomatis masuk ke halaman Riwayat.
             *
             * Kategori sedang/berat tetap memakai status sebelumnya,
             * lalu admin mengubah tindak lanjut secara manual.
             */
            $statusSetelahVerifikasi =
                $violation->violationType?->category === 'ringan'
                    ? 'selesai'
                    : $violation->status;

            $violation->update([
                'verify_status' => 'diverifikasi',
                'status' => $statusSetelahVerifikasi,
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
                'point_reduction' => $data['point_reduction'] ?? null,
                'point_reduction_note' => $data['point_reduction_note'] ?? null,
                'rejection_reason' => null,
            ]);
            ActivityLogger::log('verified', $violation, 'Memverifikasi kasus pelanggaran');
        } else {
            $violation->update([
                'verify_status' => 'ditolak',
                'rejection_reason' => $data['rejection_reason'],
            ]);
            ActivityLogger::log('rejected', $violation, 'Menolak kasus pelanggaran: '.$data['rejection_reason']);
        }

        $violation->load('student');
        $violation->student->recalculatePoints();

        return response()->json($violation);
    }

    /**
     * Unduh bukti pelanggaran - hanya untuk pengguna terautentikasi (admin atau petugas terkait).
     */
    public function evidence(Request $request, Violation $violation)
    {
        $this->authorizeOwnershipOrAdmin($request, $violation);

        if (! $violation->evidence_path || ! Storage::disk('local')->exists($violation->evidence_path)) {
            return response()->json(['message' => 'Bukti tidak ditemukan.'], 404);
        }

        return Storage::disk('local')->response($violation->evidence_path);
    }

    private function authorizeOwnershipOrAdmin(Request $request, Violation $violation): void
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            return;
        }
        if ($violation->officer_id !== $user->id && $violation->verify_status !== 'diverifikasi') {
            abort(403, 'Anda tidak memiliki akses ke kasus ini.');
        }
    }

    private function validateData(Request $request, bool $isUpdate = false): array
    {
        /*
         * Saat membuat data, kolom utama wajib dikirim.
         * Saat memperbarui data, hanya kolom yang diubah yang wajib divalidasi.
         *
         * Ini diperlukan karena perubahan Status Tindak Lanjut dari frontend
         * hanya mengirim payload seperti: { "status": "belum" }.
         */
        $required = $isUpdate
            ? ['sometimes', 'required']
            : ['required'];

        $rules = [
            'student_id' => [...$required, 'integer', 'exists:students,id'],
            'violation_type_id' => [...$required, 'integer', 'exists:violation_types,id'],
            'date' => [...$required, 'date'],
            'time' => [...$required],
            'location' => [...$required, 'string'],
            'chronology' => [...$required, 'string'],
            'officer' => ['sometimes', 'nullable', 'string'],
            'witness' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'required', Rule::in(['belum', 'proses', 'selesai'])],
            'sanksi_langsung' => ['sometimes', 'nullable', 'string'],
            'evidence' => ['sometimes', 'nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ];

        if ($isUpdate) {
            $rules['verify_status'] = [
                'sometimes',
                'nullable',
                Rule::in(['draft', 'menunggu', 'diverifikasi', 'ditolak']),
            ];
        }

        return $request->validate($rules);
    }
}
