export interface AppUser {
  id: string; email: string; password: string;
  role: "admin" | "guru_piket"; displayName: string; nip?: string;
}
export interface Student {
  id: string; nis: string; name: string; kelas: string;
  gender: "L" | "P"; parentName: string; parentPhone: string; totalPoints: number;
  archived?: boolean;
  status?: "aktif" | "lulus" | "pindah" | "keluar";
  lulusYear?: number;
}
export interface ViolationType {
  id: string; name: string; description: string;
  category: "ringan" | "sedang" | "berat"; points: number; sanction: string;
}
export interface Violation {
  id: string; studentId: string; violationTypeId: string;
  date: string; time: string; location: string; chronology: string;
  officer: string; officerId: string; witness: string;
  status: "belum" | "proses" | "selesai";
  verifyStatus: "draft" | "menunggu" | "diverifikasi" | "ditolak";
  sanksiLangsung: string; evidence?: string;
  pointReduction?: number; pointReductionNote?: string;
}
export interface GuidanceEntry {
  id: string; studentId: string; date: string; topic: string;
  notes: string; officer: string; followUp: string;
  status: "dijadwalkan" | "berlangsung" | "selesai";
  assignedTo?: string;   // userId guru piket yg ditugaskan (jika ada)
  requestedBy?: string;  // userId admin yg menugaskan
}
export interface ParentSummon {
  id: string; studentId: string; date: string; reason: string;
  scheduledDate: string; jam: string; location: string;
  waliKelas: string;
  waliKelasJabatan?: string;
  waliKelasNip?: string;
  status: "aktif" | "selesai";
}
export type AdminView = "dashboard" | "students" | "violations" | "guidance" | "summons" | "reports" | "settings";
export type PiketView = "piket_dashboard" | "piket_catat" | "piket_kasus" | "piket_bimbingan";
export type AppView = "login" | "public" | AdminView | PiketView;
