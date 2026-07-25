<?php

namespace Database\Seeders;

use App\Models\Student;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $students = [
            ['nis' => '2024001', 'name' => 'Ahmad Fadhilah', 'kelas' => 'XI.1', 'gender' => 'L', 'parent_name' => 'Bpk. Sutrisno', 'parent_phone' => '081234567890'],
            ['nis' => '2024002', 'name' => 'Siti Rahmawati', 'kelas' => 'X.2', 'gender' => 'P', 'parent_name' => 'Ibu Murni', 'parent_phone' => '085678901234'],
            ['nis' => '2024003', 'name' => 'Budi Santoso', 'kelas' => 'XII.2', 'gender' => 'L', 'parent_name' => 'Bpk. Hendra', 'parent_phone' => '087812345678'],
            ['nis' => '2024004', 'name' => 'Dewi Anggraini', 'kelas' => 'XI.3', 'gender' => 'P', 'parent_name' => 'Ibu Sari', 'parent_phone' => '082345678901'],
            ['nis' => '2024005', 'name' => 'Rizky Pratama', 'kelas' => 'X.1', 'gender' => 'L', 'parent_name' => 'Bpk. Agus', 'parent_phone' => '089012345678'],
            ['nis' => '2024006', 'name' => 'Nurul Hidayah', 'kelas' => 'XII.4', 'gender' => 'P', 'parent_name' => 'Ibu Fatimah', 'parent_phone' => '081567890123'],
            ['nis' => '2024007', 'name' => 'Dani Kurniawan', 'kelas' => 'X.3', 'gender' => 'L', 'parent_name' => 'Bpk. Rudi', 'parent_phone' => '083456789012'],
            ['nis' => '2024008', 'name' => 'Rina Susanti', 'kelas' => 'XI.2', 'gender' => 'P', 'parent_name' => 'Ibu Yanti', 'parent_phone' => '084567890123'],
        ];

        foreach ($students as $s) {
            Student::updateOrCreate(['nis' => $s['nis']], $s);
        }
    }
}
