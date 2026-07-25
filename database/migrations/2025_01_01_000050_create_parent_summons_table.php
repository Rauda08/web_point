<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_summons', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('reason');
            $table->date('scheduled_date');
            $table->time('jam');
            $table->string('location');
            $table->string('wali_kelas');
            $table->string('wali_kelas_jabatan')->nullable();
            $table->string('wali_kelas_nip')->nullable();
            $table->enum('status', ['draft', 'dikirim', 'hadir', 'tidak_hadir', 'selesai'])
                ->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_summons');
    }
};
