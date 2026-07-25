<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::query();
        if ($q = $request->query('q')) {
            $query->where(fn ($sub) => $sub->where('name', 'like', "%{$q}%")
                ->orWhere('nis', 'like', "%{$q}%")
                ->orWhere('nisn', 'like', "%{$q}%"));
        }
        if ($kelas = $request->query('kelas')) $query->where('kelas', $kelas);
        if ($status = $request->query('status')) $query->where('status', $status);
        elseif (! $request->boolean('all')) $query->where('status', 'aktif');
        return response()->json($query->orderBy('name')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $data['status'] = 'aktif';
        $data['lulus_year'] = null;
        $student = Student::create($data)->refresh();
        ActivityLogger::log('created', $student, "Menambahkan siswa {$student->name} ({$student->nis})");
        return response()->json($student, 201);
    }

    public function show(Student $student)
    {
        return response()->json($student->load(['violations.violationType', 'guidanceEntries', 'parentSummons']));
    }

    public function update(Request $request, Student $student)
    {
        $data = $this->validateData($request, $student->id);
        if (($data['status'] ?? $student->status) === 'aktif') $data['lulus_year'] = null;
        $student->update($data);
        ActivityLogger::log('updated', $student, "Mengubah data siswa {$student->name}");
        return response()->json($student->refresh());
    }

    public function destroy(Student $student)
    {
        $name = $student->name;
        ActivityLogger::log('deleted', $student, "Menghapus siswa {$student->name} ({$student->nis})");
        $student->delete();
        return response()->json(['message' => "Data siswa {$name} berhasil dihapus.", 'deleted_id' => $student->id]);
    }

    public function bulkPromote(Request $request)
    {
        $data = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer', 'exists:students,id'],
            'kelas' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['aktif', 'lulus', 'pindah', 'keluar'])],
            'lulus_year' => ['nullable', 'integer', 'min:2000', 'max:2100', 'required_if:status,lulus'],
        ]);
        $update = [];
        if (isset($data['kelas'])) $update['kelas'] = $data['kelas'];
        if (isset($data['status'])) {
            $update['status'] = $data['status'];
            $update['lulus_year'] = $data['status'] === 'lulus' ? $data['lulus_year'] : null;
        }
        if (! $update) return response()->json(['message' => 'Tidak ada data yang diperbarui.'], 422);
        Student::whereIn('id', $data['student_ids'])->update($update);
        ActivityLogger::log('bulk_promote', null, 'Kenaikan/pemindahan kelas massal', $data);
        return response()->json(['message' => 'Berhasil memperbarui '.count($data['student_ids']).' siswa.']);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt']]);
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = array_map(fn ($h) => strtolower(trim($h)), fgetcsv($handle));
        $created = 0; $errors = []; $row = 1;
        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (count($header) !== count($line)) { $errors[] = "Baris {$row}: jumlah kolom tidak sesuai."; continue; }
            $r = array_combine($header, $line);
            if (empty($r['nis']) || empty($r['name'])) { $errors[] = "Baris {$row}: NIS dan nama wajib diisi."; continue; }
            if (Student::where('nis', $r['nis'])->exists()) { $errors[] = "Baris {$row}: NIS {$r['nis']} sudah terdaftar."; continue; }
            Student::create([
                'nis'=>$r['nis'], 'nisn'=>$r['nisn']??null, 'name'=>$r['name'], 'kelas'=>$r['kelas']??'-',
                'gender'=>strtoupper($r['gender']??'L')==='P'?'P':'L', 'parent_name'=>$r['parent_name']??'-',
                'parent_phone'=>$r['parent_phone']??'-', 'status'=>'aktif', 'lulus_year'=>null,
            ]);
            $created++;
        }
        fclose($handle);
        ActivityLogger::log('import', null, "Impor {$created} siswa dari CSV");
        return response()->json(['created'=>$created, 'errors'=>$errors]);
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'nis'=>['required','string','max:255',Rule::unique('students','nis')->ignore($ignoreId)],
            'nisn'=>['nullable','string','max:255'], 'name'=>['required','string','max:255'],
            'kelas'=>['required','string','max:255'], 'gender'=>['required',Rule::in(['L','P'])],
            'parent_name'=>['required','string','max:255'], 'parent_phone'=>['required','string','max:255'],
            'status'=>['nullable',Rule::in(['aktif','lulus','pindah','keluar'])],
            'lulus_year'=>['nullable','integer','min:2000','max:2100','required_if:status,lulus'],
        ]);
    }
}
