import axios from "axios";

// ─── Axios instance ─────────────────────────────────────────────────────────
// Base URL "/api" bekerja untuk dua mode:
// 1. Development: proxy di vite.config.ts meneruskan /api ke Laravel (port 8000)
// 2. Produksi: React di-build & disajikan Laravel dari domain yang sama
export const http = axios.create({ baseURL: "/api" });

const TOKEN_KEY = "poinsman2_token";

// Token disimpan per-tab. Login admin di tab lain tidak lagi menimpa sesi guru piket.
// Hapus token lama yang sebelumnya tersimpan bersama melalui localStorage.
try {
  localStorage.removeItem(TOKEN_KEY);
} catch {
  // Abaikan ketika storage tidak tersedia.
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Abaikan ketika storage tidak tersedia.
  }

  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors)[0]?.[0];
      if (first) return first;
    }
    if (data?.message) return data.message;
  }
  return fallback;
}

// ─── Mappers: backend (snake_case) <-> frontend (camelCase) ────────────────
const s = (v: unknown) => (v === null || v === undefined ? undefined : String(v));
const timeShort = (t?: string) => (t ? t.slice(0, 5) : "");

export function mapStudent(r: any) {
  const status = r.status ?? "aktif";

  return {
    id: String(r.id),
    nis: r.nis,
    nisn: r.nisn ?? "",
    name: r.name,
    kelas: r.kelas,
    gender: r.gender as "L" | "P",
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
    totalPoints: Number(r.total_points ?? 0),

    // Hanya siswa berstatus "lulus" yang ditampilkan sebagai alumni.
    // Status "pindah" dan "keluar" tidak dianggap alumni.
    archived: status === "lulus",
    status,
    lulusYear: r.lulus_year ?? undefined,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}

function studentPayload(f: any) {
  const status = f.status ?? (f.archived ? "lulus" : "aktif");

  return {
    nis: f.nis,
    nisn: f.nisn || null,
    name: f.name,
    kelas: f.kelas,
    gender: f.gender,
    parent_name: f.parentName,
    parent_phone: f.parentPhone,
    status,
    lulus_year: status === "lulus" ? (f.lulusYear ?? null) : null,
  };
}

export function mapViolationType(r: any) {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? "",
    category: r.category as "ringan" | "sedang" | "berat",
    points: r.points,
    sanction: r.sanction ?? "",
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}
function violationTypePayload(f: any) {
  return {
    name: f.name,
    description: f.description,
    category: f.category,
    points: f.points,
    sanction: f.sanction,
  };
}

export function mapViolation(r: any) {
  return {
    id: String(r.id),
    studentId: String(r.student_id),
    violationTypeId: String(r.violation_type_id),
    date: r.date,
    time: timeShort(r.time),
    location: r.location,
    chronology: r.chronology,
    officer: r.officer,
    officerId: s(r.officer_id) ?? "",
    witness: r.witness ?? "",
    status: r.status as "belum" | "proses" | "selesai",
    verifyStatus: r.verify_status as "draft" | "menunggu" | "diverifikasi" | "ditolak",
    sanksiLangsung: r.sanksi_langsung ?? "",
    evidence: r.evidence_path ? `__server__:${r.id}` : undefined,
    pointReduction: r.point_reduction ?? undefined,
    pointReductionNote: r.point_reduction_note ?? undefined,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}

export function mapGuidance(r: any) {
  return {
    id: String(r.id),
    studentId: String(r.student_id),
    date: r.date,
    topic: r.topic,
    notes: r.notes ?? "",
    officer: r.officer,
    followUp: r.follow_up ?? "",
    status: r.status as "dijadwalkan" | "berlangsung" | "selesai",
    assignedTo: s(r.assigned_to),
    requestedBy: s(r.requested_by),
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}
function guidancePayload(f: any) {
  return {
    student_id: Number(f.studentId),
    date: f.date,
    topic: f.topic,
    notes: f.notes,
    officer: f.officer,
    follow_up: f.followUp,
    status: f.status,
    assigned_to: f.assignedTo ? Number(f.assignedTo) : null,
  };
}

export function mapSummon(r: any) {
  return {
    id: String(r.id),
    studentId: String(r.student_id),
    date: r.date,
    reason: r.reason,
    scheduledDate: r.scheduled_date,
    jam: timeShort(r.jam),
    location: r.location,
    waliKelas: r.wali_kelas,
    waliKelasJabatan: r.wali_kelas_jabatan ?? undefined,
    waliKelasNip: r.wali_kelas_nip ?? undefined,
    // Backend punya status granular (draft/dikirim/hadir/tidak_hadir/selesai),
    // frontend hanya kenal aktif/selesai -> disederhanakan di sini.
    status: (r.status === "selesai" ? "selesai" : "aktif") as "aktif" | "selesai",
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}
function summonPayload(f: any) {
  return {
    student_id: Number(f.studentId),
    date: f.date,
    reason: f.reason,
    scheduled_date: f.scheduledDate,
    jam: f.jam,
    location: f.location,
    wali_kelas: f.waliKelas,
    wali_kelas_jabatan: f.waliKelasJabatan,
    wali_kelas_nip: f.waliKelasNip,
    status: f.status === "selesai" ? "selesai" : "dikirim",
  };
}

export function mapUser(r: any) {
  return {
    id: String(r.id),
    email: r.email,
    password: "", // password hash tidak pernah dikirim balik oleh backend
    role: r.role as "admin" | "guru_piket",
    displayName: r.name,
    nip: r.nip ?? undefined,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}
function userPayload(f: any) {
  const payload: any = {
    name: f.displayName,
    email: f.email,
    role: f.role,
    nip: f.nip,
  };
  if (f.password) payload.password = f.password;
  return payload;
}

// Helper: apakah id ini masih id sementara buatan frontend (genId()) yang
// berarti record BELUM pernah dibuat di backend?
export function isLocalId(id: string) {
  return id.startsWith("id_");
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const { data } = await http.post("/login", { email, password });
  return { user: mapUser(data.user), token: data.token as string };
}
export async function logout() {
  try { await http.post("/logout"); } catch { /* abaikan jika token sudah invalid */ }
  setToken(null);
}
export async function fetchMe() {
  const { data } = await http.get("/me");
  return mapUser(data);
}

// ─── Fetcher per-resource (dipakai bootstrap & refresh setelah mutasi) ─────
export async function fetchStudents() {
  const { data } = await http.get("/students", { params: { all: 1, per_page: 1000 } });
  return (data.data ?? data).map(mapStudent);
}
export async function fetchViolationTypes() {
  const { data } = await http.get("/violation-types", { params: { all: 1 } });
  return (data.data ?? data).map(mapViolationType);
}
export async function fetchViolations() {
  const { data } = await http.get("/violations", { params: { per_page: 1000 } });
  return (data.data ?? data).map(mapViolation);
}
export async function fetchGuidanceList() {
  const { data } = await http.get("/guidance", { params: { per_page: 1000 } });
  return (data.data ?? data).map(mapGuidance);
}
export async function fetchSummons() {
  const { data } = await http.get("/parent-summons", { params: { per_page: 1000 } });
  return (data.data ?? data).map(mapSummon);
}
export async function fetchUsers() {
  const { data } = await http.get("/users").catch(() => ({ data: [] }));
  return (data.data ?? data).map(mapUser);
}

// ─── Bootstrap: ambil semua data awal setelah login ────────────────────────
export async function fetchBootstrap(includeUsers = false) {
  const [students, violationTypes, violations, guidance, summons] = await Promise.all([
    fetchStudents(),
    fetchViolationTypes(),
    fetchViolations(),
    fetchGuidanceList(),
    fetchSummons(),
  ]);

  // Endpoint /users hanya boleh diakses admin.
  // Guru piket tidak lagi mengirim request yang pasti menghasilkan 403.
  const users = includeUsers ? await fetchUsers() : [];

  return { students, violationTypes, violations, guidance, summons, users };
}

// ─── Students ────────────────────────────────────────────────────────────────
export async function createStudent(f: any) {
  const { data } = await http.post("/students", studentPayload(f));
  return mapStudent(data);
}
export async function updateStudent(id: string, f: any) {
  const { data } = await http.put(`/students/${id}`, studentPayload(f));
  return mapStudent(data);
}
export async function deleteStudent(id: string) {
  await http.delete(`/students/${id}`);
}
export async function bulkPromoteStudents(payload: {
  student_ids: number[]; kelas?: string; status?: string; lulus_year?: number;
}) {
  await http.post("/students/bulk-promote", payload);
}

// ─── Violation Types ─────────────────────────────────────────────────────────
export async function createViolationType(f: any) {
  const { data } = await http.post("/violation-types", violationTypePayload(f));
  return mapViolationType(data);
}
export async function updateViolationType(id: string, f: any) {
  const { data } = await http.put(`/violation-types/${id}`, violationTypePayload(f));
  return mapViolationType(data);
}
export async function deleteViolationType(id: string) {
  await http.delete(`/violation-types/${id}`);
}

// ─── Violations ──────────────────────────────────────────────────────────────
async function dataUrlToFile(dataUrl: string, filename = "bukti.jpg"): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

function buildViolationForm(f: any) {
  const form = new FormData();
  form.append("student_id", String(Number(f.studentId)));
  form.append("violation_type_id", String(Number(f.violationTypeId)));
  form.append("date", f.date);
  form.append("time", f.time);
  form.append("location", f.location);
  form.append("chronology", f.chronology);
  form.append("officer", f.officer);
  if (f.witness) form.append("witness", f.witness);
  if (f.status) form.append("status", f.status);
  if (f.sanksiLangsung) form.append("sanksi_langsung", f.sanksiLangsung);
  if (f.verifyStatus) form.append("verify_status", f.verifyStatus);
  return form;
}

export async function createViolation(f: any) {
  const form = buildViolationForm(f);
  if (f.evidence && f.evidence.startsWith("data:")) {
    form.append("evidence", await dataUrlToFile(f.evidence));
  }
  const { data } = await http.post("/violations", form, { headers: { "Content-Type": "multipart/form-data" } });
  return mapViolation(data);
}
export async function updateViolation(id: string, f: any) {
  const form = buildViolationForm(f);
  form.append("_method", "PUT"); // Laravel method spoofing untuk multipart
  if (f.evidence && f.evidence.startsWith("data:")) {
    form.append("evidence", await dataUrlToFile(f.evidence));
  }
  const { data } = await http.post(`/violations/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
  return mapViolation(data);
}
export async function deleteViolation(id: string) {
  await http.delete(`/violations/${id}`);
}
export async function updateViolationStatus(id: string, status: string) {
  const { data } = await http.put(`/violations/${id}`, { status });
  return mapViolation(data);
}
export async function submitViolation(id: string) {
  const { data } = await http.post(`/violations/${id}/submit`);
  return mapViolation(data);
}
export async function verifyViolation(id: string, action: "verify" | "reject", extra: {
  point_reduction?: number; point_reduction_note?: string; rejection_reason?: string;
} = {}) {
  const { data } = await http.post(`/violations/${id}/verify`, { action, ...extra });
  return mapViolation(data);
}
export async function reduceViolationPoints(id: string, amount: number, note: string) {
  // Poin dikurangi hanya berlaku pada kasus yang sudah diverifikasi -> panggil ulang verify
  // dengan point_reduction baru (tetap berstatus diverifikasi).
  const { data } = await http.post(`/violations/${id}/verify`, {
    action: "verify",
    point_reduction: amount,
    point_reduction_note: note,
  });
  return mapViolation(data);
}
export function evidenceUrl(violationId: string) {
  return `/api/violations/${violationId}/evidence`;
}
export async function fetchEvidenceBlobUrl(violationId: string): Promise<string> {
  const res = await http.get(`/violations/${violationId}/evidence`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}

// ─── Guidance (Pembinaan) ────────────────────────────────────────────────────
export async function createGuidance(f: any) {
  const { data } = await http.post("/guidance", guidancePayload(f));
  return mapGuidance(data);
}
export async function updateGuidance(id: string, f: any) {
  const { data } = await http.put(`/guidance/${id}`, guidancePayload(f));
  return mapGuidance(data);
}
export async function deleteGuidance(id: string) {
  await http.delete(`/guidance/${id}`);
}

// ─── Parent Summons (Pemanggilan Orang Tua) ─────────────────────────────────
export async function createSummon(f: any) {
  const { data } = await http.post("/parent-summons", summonPayload(f));
  return mapSummon(data);
}
export async function updateSummon(id: string, f: any) {
  const { data } = await http.put(`/parent-summons/${id}`, summonPayload(f));
  return mapSummon(data);
}
export async function deleteSummon(id: string) {
  await http.delete(`/parent-summons/${id}`);
}

// ─── Users (akun admin / guru piket) ────────────────────────────────────────
export async function createUser(f: any) {
  const { data } = await http.post("/users", userPayload(f));
  return mapUser(data);
}
export async function updateUser(id: string, f: any) {
  const { data } = await http.put(`/users/${id}`, userPayload(f));
  return mapUser(data);
}
export async function deleteUser(id: string) {
  await http.delete(`/users/${id}`);
}

// ─── Portal Publik (cek poin tanpa login) ───────────────────────────────────
export async function publicLookup(nis: string) {
  const { data } = await http.post("/public/cek-poin", { nis });
  return data as {
    nama: string; nis: string; kelas: string; total_poin: number;
    status_kedisiplinan: string;
    riwayat_pelanggaran: Array<{
      tanggal: string; jenis_pelanggaran: string; kategori: string;
      poin: number; sanksi: string; status: string;
    }>;
  };
}

// ─── Laporan PDF (buka di tab baru, backend yang men-generate) ─────────────
export function reportUrl(path: string) {
  // Endpoint laporan butuh token -> dibuka lewat blob supaya header Authorization terkirim.
  return `/api${path}`;
}
export async function openReportPdf(path: string) {
  const res = await http.get(`${path}`, { responseType: "blob" });
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  window.open(url, "_blank");
}
