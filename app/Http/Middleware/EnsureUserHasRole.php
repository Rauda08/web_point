<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Contoh penggunaan: ->middleware('role:admin') atau ->middleware('role:admin,guru_piket')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active) {
            return response()->json(['message' => 'Akun tidak aktif atau belum login.'], 403);
        }

        if (! empty($roles) && ! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Anda tidak memiliki akses untuk aksi ini.'], 403);
        }

        return $next($request);
    }
}
