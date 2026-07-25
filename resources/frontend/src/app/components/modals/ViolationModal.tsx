import { useState } from "react";
import type { AppUser, Student, ViolationType, Violation } from "@/app/types";
import { genId, todayStr } from "@/app/lib/helpers";
import { Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect, FTextarea } from "@/app/components/shared/FormFields";
import { StudentSearch } from "@/app/components/shared/StudentSearch";
import { EvidenceUpload } from "@/app/components/shared/Evidence";

export function ViolationModal({ init, students, vts, currentUser, onSave, onClose }: {
  init?: Violation; students: Student[]; vts: ViolationType[];
  currentUser: AppUser; onSave:(v:Violation)=>void; onClose:()=>void;
}) {
  type F = Omit<Violation,"id">;
  const blank: F = {
    studentId:"", violationTypeId:"", date:todayStr(), time:"", location:"", chronology:"",
    officer: currentUser.displayName, officerId: currentUser.id,
    witness:"", status:"belum",
    // Catatan yang dibuat admin langsung berstatus diverifikasi.
    // Guru piket tetap menyimpan sebagai draft sampai menekan "Kirim Verifikasi".
    verifyStatus: currentUser.role === "admin" ? "diverifikasi" : "draft",
    sanksiLangsung:"", evidence:undefined,
  };
  const [f, setF] = useState<F>(init ? {
    studentId:init.studentId, violationTypeId:init.violationTypeId, date:init.date, time:init.time,
    location:init.location, chronology:init.chronology, officer:init.officer, officerId:init.officerId,
    witness:init.witness, status:init.status, verifyStatus:init.verifyStatus,
    sanksiLangsung:init.sanksiLangsung, evidence:init.evidence,
  } : blank);
  const set = (k: keyof F, v: string|undefined) => setF(p=>({...p,[k]:v}));
  const save = (e: React.FormEvent, vs?: Violation["verifyStatus"]) => {
    e.preventDefault();
    onSave({id:init?.id??genId(), ...f, verifyStatus: vs ?? f.verifyStatus});
  };
  const isPiket = currentUser.role === "guru_piket";

  return (
    <Modal title={init?"Edit Catatan Pelanggaran":"Catat Pelanggaran Baru"}
      sub={isPiket?`Dicatat oleh: ${currentUser.displayName}`:undefined} onClose={onClose} wide>
      <form onSubmit={e=>save(e)} className="p-5 space-y-4">
        <StudentSearch
          label="Siswa"
          students={students}
          value={f.studentId}
          onChange={id=>set("studentId",id)}
          placeholder="Cari nama atau NIS..."
          // Form catatan baru hanya menampilkan siswa berstatus aktif.
          // Fallback !archived dipakai untuk kompatibilitas data lama.
          // Saat mengedit catatan lama, siswa terkait tetap dapat terlihat.
          filter={s=>
            s.id===f.studentId ||
            (
              !s.archived &&
              s.status!=="lulus" &&
              !s.lulusYear
            )
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FSelect label="Jenis Pelanggaran" value={f.violationTypeId} onChange={e=>set("violationTypeId",e.target.value)} required>
            <option value="">Pilih pelanggaran...</option>
            {[...vts].sort(compareNewest).map(vt=><option key={vt.id} value={vt.id}>{vt.name} ({vt.points} poin)</option>)}
          </FSelect>
          {!isPiket && (
            <FSelect label="Status Tindak Lanjut" value={f.status} onChange={e=>set("status",e.target.value)}>
              <option value="belum">Belum Ditindaklanjuti</option>
              <option value="proses">Sedang Diproses</option>
              <option value="selesai">Sudah Selesai</option>
            </FSelect>
          )}
          <FInput label="Tanggal" type="date" value={f.date} onChange={e=>set("date",e.target.value)} required/>
          <FInput label="Waktu" type="time" value={f.time} onChange={e=>set("time",e.target.value)} required/>
          <FInput label="Lokasi Kejadian" value={f.location} onChange={e=>set("location",e.target.value)} placeholder="Contoh: Gerbang sekolah" required/>
          <FInput label="Nama Petugas" value={f.officer} onChange={e=>set("officer",e.target.value)} readOnly={isPiket} required/>
          <FInput label="Saksi" value={f.witness} onChange={e=>set("witness",e.target.value)}/>
        </div>
        <FTextarea label="Kronologi Kejadian" value={f.chronology} onChange={e=>set("chronology",e.target.value)} rows={3} required/>
        <FInput label="Sanksi Langsung yang Diberikan" value={f.sanksiLangsung} onChange={e=>set("sanksiLangsung",e.target.value)} placeholder="Contoh: Peringatan lisan, HP disita, dll."/>
        <EvidenceUpload value={f.evidence} onChange={b64=>set("evidence",b64)}/>

        <div className={`flex gap-3 pt-2 border-t border-border ${isPiket?"flex-col sm:flex-row":""}`}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
          {isPiket ? (
            <>
              <button type="button" onClick={e=>save(e as unknown as React.FormEvent,"draft")}
                className="flex-1 py-2.5 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80">
                Simpan Draft
              </button>
              <button type="button" onClick={e=>save(e as unknown as React.FormEvent,"menunggu")}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 flex items-center justify-center gap-2">
                <Send size={13}/> Kirim Verifikasi
              </button>
            </>
          ) : (
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">{init?"Simpan":"Catat Pelanggaran"}</button>
          )}
        </div>
      </form>
    </Modal>
  );
}
