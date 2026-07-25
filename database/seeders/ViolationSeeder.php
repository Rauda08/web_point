<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationType;
use Illuminate\Database\Seeder;

class ViolationSeeder extends Seeder
{
    public function run(): void
    {
        $studentByNis = fn (string $nis) => Student::where('nis', $nis)->first()?->id;
        $vtByName = fn (string $name) => ViolationType::where('name', $name)->first()?->id;
        $userByEmail = fn (string $email) => User::where('email', $email)->first()?->id;

        $rows = [
            ['nis' => '2024001', 'vt' => 'Terlambat Masuk Sekolah', 'date' => '2025-07-10', 'time' => '07:45', 'location' => 'Gerbang Sekolah', 'chronology' => 'Siswa tiba setelah bel masuk pukul 07:30', 'officer_email' => 'hadi@sman2.sch.id', 'officer' => 'Bpk. Hadi', 'witness' => 'Satpam', 'status' => 'selesai', 'verify_status' => 'diverifikasi', 'sanksi' => 'Peringatan lisan'],
            ['nis' => '2024001', 'vt' => 'Membolos', 'date' => '2025-07-08', 'time' => '08:00', 'location' => 'Kelas XI IPA 1', 'chronology' => 'Tidak hadir tanpa surat keterangan', 'officer_email' => 'rina@sman2.sch.id', 'officer' => 'Ibu Rina', 'witness' => 'Wali Kelas', 'status' => 'selesai', 'verify_status' => 'diverifikasi', 'sanksi' => 'Surat peringatan'],
            ['nis' => '2024003', 'vt' => 'Merokok di Lingkungan Sekolah', 'date' => '2025-07-09', 'time' => '10:15', 'location' => 'Toilet Sekolah', 'chronology' => 'Kedapatan merokok di toilet saat jam istirahat', 'officer_email' => 'gunawan@sman2.sch.id', 'officer' => 'Bpk. Gunawan', 'witness' => 'Bpk. Toha', 'status' => 'proses', 'verify_status' => 'menunggu', 'sanksi' => 'Dibawa ke ruang BK'],
            ['nis' => '2024003', 'vt' => 'Berkelahi', 'date' => '2025-06-28', 'time' => '13:30', 'location' => 'Lapangan Olahraga', 'chronology' => 'Terlibat perkelahian setelah jam olahraga', 'officer_email' => 'hadi@sman2.sch.id', 'officer' => 'Bpk. Hadi', 'witness' => 'Bpk. Agus', 'status' => 'selesai', 'verify_status' => 'diverifikasi', 'sanksi' => 'Skorsing 3 hari'],
            ['nis' => '2024005', 'vt' => 'Merokok di Lingkungan Sekolah', 'date' => '2025-07-11', 'time' => '09:00', 'location' => 'Kantin Sekolah', 'chronology' => 'Kedapatan merokok di area kantin saat istirahat', 'officer_email' => 'dewi@sman2.sch.id', 'officer' => 'Ibu Dewi', 'witness' => 'Ibu Rina', 'status' => 'proses', 'verify_status' => 'menunggu', 'sanksi' => 'Dipanggil ke BK'],
            ['nis' => '2024005', 'vt' => 'Tidak Memakai Atribut Lengkap', 'date' => '2025-07-05', 'time' => '07:30', 'location' => 'Gerbang Sekolah', 'chronology' => 'Tidak memakai dasi dan sabuk seragam', 'officer_email' => 'hadi@sman2.sch.id', 'officer' => 'Bpk. Hadi', 'witness' => 'Satpam', 'status' => 'selesai', 'verify_status' => 'diverifikasi', 'sanksi' => 'Pinjam atribut'],
            ['nis' => '2024007', 'vt' => 'Merokok di Lingkungan Sekolah', 'date' => '2025-06-20', 'time' => '14:00', 'location' => 'Belakang Perpustakaan', 'chronology' => 'Merokok saat jam istirahat terakhir', 'officer_email' => 'gunawan@sman2.sch.id', 'officer' => 'Bpk. Gunawan', 'witness' => 'Pak Satpam', 'status' => 'selesai', 'verify_status' => 'diverifikasi', 'sanksi' => 'Skorsing 3 hari'],
        ];

        foreach ($rows as $r) {
            Violation::create([
                'student_id' => $studentByNis($r['nis']),
                'violation_type_id' => $vtByName($r['vt']),
                'date' => $r['date'],
                'time' => $r['time'],
                'location' => $r['location'],
                'chronology' => $r['chronology'],
                'officer' => $r['officer'],
                'officer_id' => $userByEmail($r['officer_email']),
                'witness' => $r['witness'],
                'status' => $r['status'],
                'verify_status' => $r['verify_status'],
                'sanksi_langsung' => $r['sanksi'],
            ]);
        }

        // Hitung ulang total poin tiap siswa berdasarkan pelanggaran yang sudah diverifikasi.
        Student::all()->each->recalculatePoints();
    }
}
