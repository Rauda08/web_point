<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GuidanceController;
use App\Http\Controllers\Api\ParentSummonController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ViolationController;
use App\Http\Controllers\Api\ViolationTypeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa
| SMA Negeri 2 Pangkalan Kuras
|--------------------------------------------------------------------------
*/

// ─── Publik (tanpa login) - portal siswa / orang tua ────────────────────────
Route::post('/public/cek-poin', [PublicController::class, 'lookup']);

// ─── Autentikasi pengguna internal ──────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Siswa
    Route::get('/students', [StudentController::class, 'index']);
    Route::get('/students/{student}', [StudentController::class, 'show']);
    Route::post('/students/import', [StudentController::class, 'import']);
    Route::post('/students/bulk-promote', [StudentController::class, 'bulkPromote']);

    // Jenis pelanggaran (baca boleh semua role login)
    Route::get('/violation-types', [ViolationTypeController::class, 'index']);
    Route::get('/violation-types/{violationType}', [ViolationTypeController::class, 'show']);

    // Pelanggaran (admin & guru piket, RBAC ditangani di controller)
    Route::get('/violations', [ViolationController::class, 'index']);
    Route::post('/violations', [ViolationController::class, 'store']);
    Route::get('/violations/{violation}', [ViolationController::class, 'show']);
    Route::put('/violations/{violation}', [ViolationController::class, 'update']);
    Route::delete('/violations/{violation}', [ViolationController::class, 'destroy']);
    Route::post('/violations/{violation}/submit', [ViolationController::class, 'submit']);
    Route::get('/violations/{violation}/evidence', [ViolationController::class, 'evidence']);

    // Pembinaan
    Route::get('/guidance', [GuidanceController::class, 'index']);
    Route::post('/guidance', [GuidanceController::class, 'store']);
    Route::get('/guidance/{guidance}', [GuidanceController::class, 'show']);
    Route::put('/guidance/{guidance}', [GuidanceController::class, 'update']);
    Route::delete('/guidance/{guidance}', [GuidanceController::class, 'destroy']);

    // Pemanggilan orang tua
    Route::get('/parent-summons', [ParentSummonController::class, 'index']);
    Route::post('/parent-summons', [ParentSummonController::class, 'store']);
    Route::get('/parent-summons/{summon}', [ParentSummonController::class, 'show']);
    Route::put('/parent-summons/{summon}', [ParentSummonController::class, 'update']);
    Route::delete('/parent-summons/{summon}', [ParentSummonController::class, 'destroy']);

    // Laporan PDF
    Route::get('/reports/student/{student}', [ReportController::class, 'student']);
    Route::get('/reports/kelas', [ReportController::class, 'kelas']);
    Route::get('/reports/periode', [ReportController::class, 'periode']);
    Route::get('/reports/kategori', [ReportController::class, 'kategori']);
    Route::get('/reports/peringatan/{student}', [ReportController::class, 'peringatan']);
    Route::get('/reports/panggilan/{summon}', [ReportController::class, 'panggilan']);

    // ─── Khusus admin ────────────────────────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        Route::post('/violation-types', [ViolationTypeController::class, 'store']);
        Route::put('/violation-types/{violationType}', [ViolationTypeController::class, 'update']);
        Route::delete('/violation-types/{violationType}', [ViolationTypeController::class, 'destroy']);

        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{student}', [StudentController::class, 'update']);
        Route::delete('/students/{student}', [StudentController::class, 'destroy']);

        Route::post('/violations/{violation}/verify', [ViolationController::class, 'verify']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });
});
