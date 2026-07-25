<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['name' => 'Admin Sekolah', 'email' => 'admin@sman2.sch.id', 'password' => 'admin123', 'role' => 'admin', 'nip' => '197001012000121001'],
            ['name' => 'Bpk. Hadi', 'email' => 'hadi@sman2.sch.id', 'password' => 'piket123', 'role' => 'guru_piket', 'nip' => '198501012010011002'],
            ['name' => 'Ibu Dewi', 'email' => 'dewi@sman2.sch.id', 'password' => 'piket123', 'role' => 'guru_piket', 'nip' => '199001012015012003'],
            ['name' => 'Ibu Rina', 'email' => 'rina@sman2.sch.id', 'password' => 'piket123', 'role' => 'guru_piket', 'nip' => '199203052018012004'],
            ['name' => 'Bpk. Gunawan', 'email' => 'gunawan@sman2.sch.id', 'password' => 'piket123', 'role' => 'guru_piket', 'nip' => '198702012012011005'],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make($u['password']),
                    'role' => $u['role'],
                    'nip' => $u['nip'],
                    'is_active' => true,
                ]
            );
        }
    }
}
