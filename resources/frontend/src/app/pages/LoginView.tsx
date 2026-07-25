import { useState } from "react";
import { AlertCircle, Plus, Search, Shield, UserCheck } from "lucide-react";
import * as api from "@/lib/api";
import type { AppUser } from "@/app/types";
import { FInput } from "@/app/components/shared/FormFields";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import schoolLogo from "@/imports/image-1.png";

export function LoginView({ onLoginSuccess, onPublic }: { onLoginSuccess:(u:AppUser)=>void; onPublic:()=>void }) {
  const [email,setEmail]=useState(""); const [pwd,setPwd]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { user, token } = await api.login(email, pwd);
      api.setToken(token);
      onLoginSuccess(user);
    } catch (e) {
      setErr(api.apiErrorMessage(e, "Email atau password tidak valid."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden flex"
      style={{
        fontFamily:"'Inter',sans-serif",
        background:"linear-gradient(135deg,#eaf3ed 0%,#f7f5ef 48%,#e9f1ec 100%)",
      }}
    >
      {/* Background dekoratif khusus tablet/HP */}
      <div className="lg:hidden absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:"linear-gradient(155deg,#173829 0%,#285f47 48%,#3d8261 100%)",
          }}
        />
        <div className="absolute -top-28 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl"/>
        <div className="absolute top-[42%] -left-24 w-64 h-64 rounded-full bg-emerald-200/10 blur-3xl"/>
        <div className="absolute -bottom-28 right-[-30px] w-80 h-80 rounded-full bg-amber-200/10 blur-3xl"/>
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
          <defs>
            <pattern id="loginDotsMobile" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginDotsMobile)"/>
        </svg>
      </div>

      {/* Panel informasi desktop */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{background:"linear-gradient(160deg,#1a3528 0%,#2d6a4f 55%,#3a8a65 100%)"}}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white/5 translate-x-1/3 -translate-y-1/3"/>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-white/5 -translate-x-1/3 translate-y-1/3"/>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div className="relative flex flex-col h-full p-12 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 p-0.5">
              <ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">SMAN 2 Pangkalan Kuras</p>
              <p className="text-white/50 text-xs">Kab. Pelalawan, Riau</p>
            </div>
          </div>

          <div className="text-white">
            <h1
              className="text-4xl font-bold leading-tight mb-3"
              style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}
            >
              Sistem Poin<br/>Pelanggaran Siswa
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs mb-10">
              Platform pengelolaan tata tertib siswa — pencatatan, verifikasi,
              pembinaan, dan laporan resmi dalam satu sistem terintegrasi.
            </p>

            <div className="space-y-3">
              {[
                {role:"Admin Sekolah",desc:"Akses penuh: verifikasi, laporan, manajemen data",icon:Shield},
                {role:"Guru Piket / Tim Disiplin",desc:"Catat pelanggaran, unggah bukti, kirim verifikasi",icon:UserCheck},
              ].map(r=>(
                <div key={r.role} className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <r.icon size={14} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{r.role}</p>
                    <p className="text-[10px] text-white/45 leading-snug">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/25 text-xs">© 2026 SMAN 2 Pangkalan Kuras</p>
        </div>
      </div>

      {/* Area formulir */}
      <div className="flex-1 relative z-10 flex items-center justify-center px-4 py-7 sm:p-8 lg:p-10">
        <div
          className="
            relative w-full max-w-md
            rounded-[28px] border border-white/55
            bg-white/[0.96] backdrop-blur-xl
            shadow-[0_24px_70px_rgba(4,25,15,0.28)]
            px-5 py-6 sm:px-8 sm:py-8
            lg:max-w-sm lg:rounded-none lg:border-0 lg:bg-transparent
            lg:backdrop-blur-none lg:shadow-none lg:p-0
          "
        >
          {/* Aksen atas hanya pada perangkat kecil */}
          <div className="lg:hidden absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r from-emerald-300 via-amber-300 to-emerald-300"/>

          <div className="lg:hidden flex items-center gap-3 mb-7 pt-1">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-100 p-0.5 shadow-sm">
              <ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/>
            </div>
            <div>
              <p className="font-bold text-[15px] leading-tight text-slate-900">SMAN 2 Pangkalan Kuras</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sistem Poin Pelanggaran Siswa</p>
            </div>
          </div>

          <div className="mb-7">
            <div className="lg:hidden inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-4">
              <Shield size={11}/> Portal Petugas
            </div>
            <h2
              className="text-2xl sm:text-[28px] font-bold mb-1.5 text-slate-900"
              style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}
            >
              Masuk ke Sistem
            </h2>
            <p className="text-sm text-muted-foreground">
              Gunakan akun yang diberikan oleh admin sekolah
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <FInput
              label="Email"
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="email@sman2.sch.id"
              autoComplete="username"
              required
            />
            <FInput
              label="Password"
              type="password"
              value={pwd}
              onChange={e=>setPwd(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            {err&&(
              <div className="text-xs text-destructive flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0"/> {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="
                w-full py-3 bg-primary text-primary-foreground rounded-xl
                text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5
                hover:shadow-lg active:translate-y-0 transition-all duration-200
                disabled:opacity-60 disabled:transform-none
              "
            >
              {busy?"Memeriksa...":"Masuk"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border/80 text-center">
            <button
              onClick={onPublic}
              className="flex items-center gap-2 mx-auto text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Search size={13}/> Cek Poin Tanpa Login
            </button>
          </div>

          <div className="mt-5 bg-[#f4f2ec] border border-black/[0.03] rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Akun Demo</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
              <span className="font-mono">admin@sman2.sch.id</span> / <span className="font-mono">admin123</span> — Admin
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
              <span className="font-mono">hadi@sman2.sch.id</span> / <span className="font-mono">piket123</span> — Guru Piket
            </p>
          </div>

          <p className="lg:hidden text-center text-[10px] text-white/45 absolute -bottom-8 left-0 right-0">
            © 2026 SMAN 2 Pangkalan Kuras
          </p>
        </div>
      </div>
    </div>
  );
}
