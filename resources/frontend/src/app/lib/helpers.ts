import type { Student } from "@/app/types";

export function genId() { return `id_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

export type OrderedRecord = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  time?: string;
};

export function compareNewest(a: OrderedRecord, b: OrderedRecord) {
  // Record yang baru dibuat atau baru diperbarui selalu berada di paling atas.
  const aStamp = a.updatedAt || a.createdAt || "";
  const bStamp = b.updatedAt || b.createdAt || "";

  if (aStamp !== bStamp) {
    return bStamp.localeCompare(aStamp);
  }

  // ID sementara dari frontend menyimpan timestamp: id_1720000000000_abcd
  const aLocal = String(a.id).match(/^id_(\d+)/)?.[1];
  const bLocal = String(b.id).match(/^id_(\d+)/)?.[1];

  if (aLocal && bLocal && aLocal !== bLocal) {
    return Number(bLocal) - Number(aLocal);
  }

  // ID database umumnya angka berurutan; ID lebih besar berarti lebih baru.
  const aNumber = Number(a.id);
  const bNumber = Number(b.id);

  if (
    Number.isFinite(aNumber) &&
    Number.isFinite(bNumber) &&
    aNumber !== bNumber
  ) {
    return bNumber - aNumber;
  }

  // Fallback untuk data lama yang belum mempunyai created_at/updated_at.
  const aDateTime = `${a.date || ""}T${a.time || ""}`;
  const bDateTime = `${b.date || ""}T${b.time || ""}`;

  if (aDateTime !== bDateTime) {
    return bDateTime.localeCompare(aDateTime);
  }

  return String(b.id).localeCompare(String(a.id), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function todayStr() { return new Date().toISOString().slice(0,10); }
export function fmtDate(value: string) {
  if (!value) return "—";

  // Ambil tanggal saja agar ISO UTC tidak menggeser hari di zona WIB.
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return raw;

  const [, year, month, day] = match;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  return localDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fmtTime(value?: string) {
  if (!value) return "";

  const raw = String(value);
  const isoMatch = raw.match(/T(\d{2}):(\d{2})/);
  const plainMatch = raw.match(/^(\d{2}):(\d{2})/);
  const match = isoMatch ?? plainMatch;

  return match ? `${match[1]}.${match[2]}` : raw;
}

/**
 * Digunakan oleh dashboard, rekap, dan seluruh cetak laporan.
 * Status lama yang belum mengirim field `status` tetap dianggap aktif
 * selama tidak archived dan tidak mempunyai tahun lulus.
 */
export function isActiveStudent(student: Student) {
  const inactiveStatus =
    student.status === "lulus" ||
    student.status === "pindah" ||
    student.status === "keluar";

  return !student.archived && !inactiveStatus && !student.lulusYear;
}

export function getSanction(pts: number) {
  if (pts === 0)   return { label:"Baik",                        bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-200", bar:"#10b981" };
  if (pts <= 75)   return { label:"Peringatan Lisan",            bg:"bg-sky-50",     text:"text-sky-700",     border:"border-sky-200",     bar:"#0ea5e9" };
  if (pts < 150)   return { label:"Hukuman Khusus",             bg:"bg-amber-50",   text:"text-amber-700",   border:"border-amber-200",   bar:"#f59e0b" };
  if (pts < 300)   return { label:"SP Tertulis + Panggil Ortu",  bg:"bg-orange-50",  text:"text-orange-700",  border:"border-orange-200",  bar:"#f97316" };
  if (pts < 400)   return { label:"Panggil Ortu + Skorsing",     bg:"bg-red-50",     text:"text-red-600",     border:"border-red-200",     bar:"#ef4444" };
  if (pts < 501)   return { label:"Panggil Ortu + Pernyataan",   bg:"bg-red-100",    text:"text-red-800",     border:"border-red-300",     bar:"#dc2626" };
  return                  { label:"Dikembalikan ke Orang Tua",   bg:"bg-red-200",    text:"text-red-900",     border:"border-red-500",     bar:"#991b1b" };
}
export function getCatCls(cat: string) {
  if (cat==="ringan") return "bg-sky-50 text-sky-700 border-sky-200";
  if (cat==="sedang") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}
export function getStatusInfo(status: string) {
  if (status==="selesai") return { cls:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Selesai",  dot:"bg-emerald-500" };
  if (status==="proses")  return { cls:"bg-amber-50 text-amber-700 border-amber-200",       label:"Diproses", dot:"bg-amber-500"   };
  return                         { cls:"bg-gray-50 text-gray-600 border-gray-200",           label:"Belum",    dot:"bg-gray-400"    };
}
export function getVerifyInfo(vs: string) {
  if (vs==="diverifikasi") return { cls:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Diverifikasi", icon:BadgeCheck   };
  if (vs==="menunggu")     return { cls:"bg-amber-50 text-amber-700 border-amber-200",       label:"Menunggu",     icon:Clock        };
  if (vs==="ditolak")      return { cls:"bg-red-50 text-red-700 border-red-200",             label:"Ditolak",      icon:XCircle      };
  return                          { cls:"bg-gray-50 text-gray-500 border-gray-200",           label:"Draft",        icon:ClipboardList };
}
export function getSummonStatus(s: string) {
  if (s==="hadir")       return { cls:"bg-emerald-50 text-emerald-700 border-emerald-200", label:"Orang Tua Hadir" };
  if (s==="tidak_hadir") return { cls:"bg-red-50 text-red-700 border-red-200",             label:"Tidak Hadir"     };
  if (s==="dikirim")     return { cls:"bg-amber-50 text-amber-700 border-amber-200",       label:"Sudah Dikirim"   };
  return                        { cls:"bg-gray-50 text-gray-500 border-gray-200",           label:"Draft"           };
}

export const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
