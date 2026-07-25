<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ViolationType;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ViolationTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = ViolationType::query();

        if (! $request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($cat = $request->query('category')) {
            $query->where('category', $cat);
        }

        return response()->json($query->orderBy('category')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $vt = ViolationType::create($data);
        ActivityLogger::log('created', $vt, "Menambahkan jenis pelanggaran {$vt->name}");

        return response()->json($vt, 201);
    }

    public function show(ViolationType $violationType)
    {
        return response()->json($violationType);
    }

    public function update(Request $request, ViolationType $violationType)
    {
        $data = $this->validateData($request, $violationType->id);
        $violationType->update($data);
        ActivityLogger::log('updated', $violationType, "Mengubah jenis pelanggaran {$violationType->name}");

        return response()->json($violationType);
    }

    /**
     * Nonaktifkan (bukan hapus) agar riwayat pelanggaran lama tetap valid.
     */
    public function destroy(ViolationType $violationType)
    {
        $violationType->update(['is_active' => false]);
        ActivityLogger::log('deactivated', $violationType, "Menonaktifkan jenis pelanggaran {$violationType->name}");

        return response()->json(['message' => 'Jenis pelanggaran dinonaktifkan.']);
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', Rule::unique('violation_types', 'code')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['required', Rule::in(['ringan', 'sedang', 'berat'])],
            'points' => ['required', 'integer', 'min:1'],
            'sanction' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
