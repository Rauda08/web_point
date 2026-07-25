<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Setelah frontend React di-build (npm run build di folder frontend/),
| hasilnya otomatis masuk ke public/app. Route di bawah menyajikan
| index.html React tersebut untuk semua path selain /api dan /storage,
| supaya React Router bisa menangani routing di sisi client (SPA fallback).
|
*/

$serveSpa = function () {
    $indexPath = public_path('app/index.html');

    if (! file_exists($indexPath)) {
        return response(
            'Frontend belum di-build. Jalankan "npm run build" di folder frontend/ terlebih dahulu.',
            404
        );
    }

    return response()->file($indexPath);
};

Route::get('/', $serveSpa);
Route::get('/{any}', $serveSpa)->where('any', '^(?!api|storage).*$');
