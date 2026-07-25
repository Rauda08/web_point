<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violations', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('violation_type_id')->constrained();
            $table->date('date');
            $table->time('time');
            $table->string('location');
            $table->text('chronology');
            $table->string('officer'); // nama tampilan petugas pelapor
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('witness')->nullable();
            $table->enum('status', ['belum', 'proses', 'selesai'])->default('belum');
            $table->enum('verify_status', ['draft', 'menunggu', 'diverifikasi', 'ditolak'])
                ->default('draft');
            $table->text('sanksi_langsung')->nullable();
            $table->string('evidence_path')->nullable();
            $table->unsignedInteger('point_reduction')->nullable();
            $table->text('point_reduction_note')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['date']);
            $table->index(['verify_status']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violations');
    }
};
