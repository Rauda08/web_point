<?php

namespace Database\Seeders;

use App\Models\ViolationType;
use Illuminate\Database\Seeder;

class ViolationTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Terlambat Masuk Sekolah', 'description' => 'Siswa tiba setelah bel masuk', 'category' => 'ringan', 'points' => 5, 'sanction' => 'Peringatan lisan dari guru piket'],
            ['name' => 'Tidak Memakai Atribut Lengkap', 'description' => 'Seragam tidak lengkap atau tidak sesuai', 'category' => 'ringan', 'points' => 5, 'sanction' => 'Peringatan lisan dan pinjam atribut'],
            ['name' => 'Membolos', 'description' => 'Tidak hadir tanpa keterangan sah', 'category' => 'sedang', 'points' => 15, 'sanction' => 'Surat panggilan orang tua'],
            ['name' => 'Tidak Mengerjakan Tugas', 'description' => 'Tidak mengumpulkan tugas yang diberikan', 'category' => 'ringan', 'points' => 5, 'sanction' => 'Tugas digandakan, peringatan lisan'],
            ['name' => 'Merokok di Lingkungan Sekolah', 'description' => 'Kedapatan merokok di area sekolah', 'category' => 'berat', 'points' => 50, 'sanction' => 'Skorsing dan panggilan orang tua'],
            ['name' => 'Berkelahi', 'description' => 'Terlibat perkelahian fisik', 'category' => 'berat', 'points' => 50, 'sanction' => 'Skorsing, panggilan orang tua, pembinaan khusus'],
            ['name' => 'Membawa HP Saat Pelajaran', 'description' => 'Menggunakan HP saat KBM berlangsung', 'category' => 'sedang', 'points' => 15, 'sanction' => 'HP disita, peringatan tertulis'],
        ];

        foreach ($types as $t) {
            ViolationType::updateOrCreate(['name' => $t['name']], $t);
        }
    }
}
