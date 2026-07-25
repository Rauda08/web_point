<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('nis')->unique();
            $table->string('nisn')->nullable();
            $table->string('name');
            $table->string('kelas');
            $table->enum('gender', ['L', 'P']);
            $table->string('parent_name');
            $table->string('parent_phone');
            $table->unsignedInteger('total_points')->default(0);
            $table->enum('status', ['aktif', 'lulus', 'pindah', 'keluar'])
                ->default('aktif');
            $table->unsignedSmallInteger('lulus_year')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['kelas']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
