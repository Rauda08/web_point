import {
  LayoutDashboard, Users, ClipboardList, BookMarked, PhoneCall, FileText, Settings,
  Plus, LogOut, Shield, UserCheck, X, ChevronRight,
} from "lucide-react";
import type { AppUser } from "@/app/types";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import schoolLogo from "@/imports/image-1.png";

export const ADMIN_NAV = [
  { label:"Utama",        items:[{id:"dashboard",   label:"Dashboard",           icon:LayoutDashboard}] },
  { label:"Akademik",     items:[{id:"students",    label:"Data Siswa",           icon:Users}] },
  { label:"Pelanggaran",  items:[{id:"violations",  label:"Pencatatan & Verifikasi", icon:ClipboardList}] },
  { label:"Pembinaan",    items:[{id:"guidance",    label:"Jurnal Bimbingan",     icon:BookMarked},{id:"summons",label:"Panggilan Orang Tua",icon:PhoneCall}] },
  { label:"Administrasi", items:[{id:"reports",label:"Laporan & Cetak",icon:FileText},{id:"settings",label:"Pengaturan",icon:Settings}] },
];
export const PIKET_NAV = [
  { label:"Saya",        items:[{id:"piket_dashboard",  label:"Dashboard Saya",    icon:LayoutDashboard},{id:"piket_kasus",     label:"Kasus Saya",        icon:ClipboardList}] },
  { label:"Tindakan",    items:[{id:"piket_catat",      label:"Catat Pelanggaran", icon:Plus},{id:"piket_bimbingan",label:"Tugas Bimbingan",  icon:BookMarked}] },
];

export function Sidebar({ view, onNav, onLogout, currentUser, badge, isMobile, onClose }: {
  view: string; onNav:(v:string)=>void; onLogout:()=>void; currentUser: AppUser;
  badge?: Record<string,number>; isMobile?:boolean; onClose?:()=>void;
}) {
  const navGroups = currentUser.role === "admin" ? ADMIN_NAV : PIKET_NAV;
  let sequence = 0;

  return (
    <div
      className={`app-sidebar-panel relative isolate flex flex-col h-full flex-shrink-0 overflow-hidden ${
        isMobile ? "w-full" : "w-[220px]"
      }`}
      style={{background:"linear-gradient(180deg,#173729 0%,#1a3528 55%,#10291e 100%)"}}
    >
      <div className="sidebar-ambient pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="sidebar-orb sidebar-orb-one"/>
        <div className="sidebar-orb sidebar-orb-two"/>
        <div className="sidebar-grid-pattern"/>
      </div>

      <div
        className={`sidebar-brand px-4 border-b flex items-center justify-between ${
          isMobile ? "min-h-[72px] py-3.5" : "min-h-[66px] py-3"
        }`}
        style={{borderColor:"rgba(255,255,255,0.08)"}}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="sidebar-logo w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 border border-white/10 p-0.5 shadow-lg">
            <ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight truncate">SMAN 2 PKK</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{color:"rgba(200,222,206,0.55)"}}>Pangkalan Kuras</p>
          </div>
        </div>

        {isMobile&&onClose&&(
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="sidebar-close-button w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.06] hover:bg-white/12 active:scale-90 transition-all"
            style={{color:"rgba(235,248,239,0.78)"}}
          >
            <X size={17}/>
          </button>
        )}
      </div>

      <div className="sidebar-role px-3.5 py-3 border-b" style={{borderColor:"rgba(255,255,255,0.06)"}}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          currentUser.role==="admin"
            ? "bg-emerald-300/10 border-emerald-200/10"
            : "bg-amber-400/10 border-amber-300/10"
        }`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            currentUser.role==="admin" ? "bg-emerald-300/10" : "bg-amber-300/10"
          }`}>
            {currentUser.role==="admin"
              ? <Shield size={12} className="text-emerald-300"/>
              : <UserCheck size={12} className="text-amber-300"/>
            }
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold ${
              currentUser.role==="admin" ? "text-emerald-200" : "text-amber-200"
            }`}>
              {currentUser.role==="admin"?"Admin Sekolah":"Guru Piket"}
            </p>
            <p className="text-[9px] truncate" style={{color:"rgba(200,222,206,0.36)"}}>
              {currentUser.role==="admin"?"Pengelola utama sistem":"Tim pencatatan disiplin"}
            </p>
          </div>
        </div>
      </div>

      <nav className={`sidebar-nav flex-1 overflow-y-auto overscroll-contain px-2.5 space-y-4 ${
        isMobile ? "py-4" : "py-3"
      }`}>
        {navGroups.map((group,groupIndex)=>(
          <div
            key={group.label}
            className="sidebar-nav-group"
            style={{animationDelay:`${80+(groupIndex*85)}ms`,transitionDelay:`${80+(groupIndex*70)}ms`}}
          >
            <p
              className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.17em]"
              style={{color:"rgba(200,222,206,0.34)"}}
            >
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map(item=>{
                const active=view===item.id;
                const itemSequence=sequence++;
                const itemBadge=badge?.[item.id]||0;

                return(
                  <button
                    key={item.id}
                    type="button"
                    onClick={()=>{onNav(item.id);onClose?.();}}
                    aria-current={active?"page":undefined}
                    className={`sidebar-nav-item group relative w-full ${
                      isMobile ? "min-h-[46px] px-3.5" : "min-h-[42px] px-3"
                    } py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium text-left overflow-hidden ${
                      active ? "sidebar-nav-item-active text-white" : "text-emerald-50/55 hover:text-white"
                    }`}
                    style={{animationDelay:`${130+(itemSequence*36)}ms`}}
                  >
                    <span className="sidebar-active-line" aria-hidden="true"/>

                    <span className={`sidebar-nav-icon w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      active ? "bg-emerald-300/15 text-emerald-300" : "bg-white/[0.035]"
                    }`}>
                      <item.icon size={14}/>
                    </span>

                    <span className="flex-1 truncate">{item.label}</span>

                    {itemBadge>0&&(
                      <span className="sidebar-badge bg-amber-400 text-amber-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[19px] text-center leading-tight shadow-sm">
                        {itemBadge}
                      </span>
                    )}

                    <ChevronRight
                      size={12}
                      className={`sidebar-nav-chevron flex-shrink-0 ${
                        active ? "opacity-70 translate-x-0" : "opacity-0 -translate-x-1"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-user p-3 border-t" style={{borderColor:"rgba(255,255,255,0.08)"}}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.025] border border-white/[0.04]">
          <div className="sidebar-user-avatar w-8 h-8 rounded-full bg-emerald-300/15 border border-emerald-200/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {currentUser.displayName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{currentUser.displayName}</p>
            <p className="text-[10px] truncate" style={{color:"rgba(200,222,206,0.4)"}}>
              {currentUser.role==="admin"?"Superadmin":"Tim Disiplin"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`sidebar-logout mt-1.5 w-full flex items-center gap-2.5 px-3 rounded-xl text-xs hover:bg-red-400/10 hover:text-red-200 active:scale-[0.98] transition-all ${
            isMobile ? "min-h-[46px]" : "min-h-[40px]"
          }`}
          style={{color:"rgba(200,222,206,0.45)"}}
        >
          <LogOut size={13}/> Keluar
        </button>
      </div>
    </div>
  );
}
