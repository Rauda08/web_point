import { useState } from "react";
import { Edit2, Eye, Plus, Trash2 } from "lucide-react";
import type { AppUser, ViolationType } from "@/app/types";
import { compareNewest, genId } from "@/app/lib/helpers";
import { Chip } from "@/app/components/shared/Chip";
import { Confirm, Modal } from "@/app/components/shared/Modal";
import { FInput, FSelect } from "@/app/components/shared/FormFields";
import { CategoriesView } from "@/app/pages/CategoriesView";

export function SettingsView({ vts, onAdd, onEdit, onDel, users, onAddUser, onEditUser, onDelUser, currentUserId, onSuccess }: {
  vts: ViolationType[]; onAdd:(v:ViolationType)=>void; onEdit:(v:ViolationType)=>void; onDel:(id:string)=>void;
  users: AppUser[]; onAddUser:(u:AppUser)=>void; onEditUser:(u:AppUser)=>void; onDelUser:(id:string)=>void;
  currentUserId: string; onSuccess:(m:string)=>void;
}) {
  const [userModal,setUserModal]=useState<null|"add"|{u:AppUser}>(null);
  const [userConfirm,setUserConfirm]=useState<null|AppUser>(null);
  const sortedUsers = [...users].sort(compareNewest);

  function UserModal({ init, onSave, onClose }: { init?:AppUser; onSave:(u:AppUser)=>void; onClose:()=>void }) {
    type F={displayName:string;email:string;password:string;nip:string;role:"admin"|"guru_piket"};
    const [f,setF]=useState<F>(init
      ?{displayName:init.displayName,email:init.email,password:init.password,nip:init.nip||"",role:init.role}
      :{displayName:"",email:"",password:"",nip:"",role:"guru_piket"});
    const [showPwd,setShowPwd]=useState(false);
    const [emailErr,setEmailErr]=useState("");
    const set=(k:keyof F,v:string)=>setF(p=>({...p,[k]:v}));
    const save=(e:React.FormEvent)=>{
      e.preventDefault();
      const dup=users.find(u=>u.email===f.email&&u.id!==init?.id);
      if(dup){setEmailErr("Email sudah terdaftar.");return;}
      onSave({id:init?.id??genId(),...f});
    };
    return(
      <Modal title={init?"Edit Akun":"Tambah Akun Pengguna"} onClose={onClose}>
        <form onSubmit={save} className="p-5 space-y-4">
          <FInput label="Nama Lengkap" value={f.displayName} onChange={e=>set("displayName",e.target.value)} required placeholder="cth: Bpk. Ahmad"/>
          <div>
            <FInput label="Email" type="email" value={f.email} onChange={e=>{set("email",e.target.value);setEmailErr("");}} required placeholder="cth: ahmad@sman2.sch.id"/>
            {emailErr&&<p className="text-xs text-destructive mt-1">{emailErr}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Password{init&&" (kosongkan jika tidak diubah)"}</label>
            <div className="relative">
              <input type={showPwd?"text":"password"} value={f.password} onChange={e=>set("password",e.target.value)}
                required={!init} placeholder={init?"Biarkan kosong untuk tidak mengubah":"Min. 6 karakter"}
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring"/>
              <button type="button" onClick={()=>setShowPwd(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <Eye size={14}/>
              </button>
            </div>
          </div>
          <FInput label="NIP (opsional)" value={f.nip} onChange={e=>set("nip",e.target.value)} placeholder="cth: 198001012005011001"/>
          <FSelect label="Peran" value={f.role} onChange={e=>set("role",e.target.value)}>
            <option value="guru_piket">Guru Piket</option>
            <option value="admin">Admin</option>
          </FSelect>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40">Batal</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90">{init?"Simpan":"Tambah Akun"}</button>
          </div>
        </form>
      </Modal>
    );
  }
  const levels=[
    {range:"1–75",   sanction:"Peringatan Lisan",                    pihak:"Ditangani guru piket, dikonfirmasi ke wali kelas",                          c:"sky"},
    {range:"76–149", sanction:"Hukuman Khusus",                       pihak:"Ditangani guru piket, wali kelas & guru BK",                                c:"amber"},
    {range:"150–299",sanction:"SP Tertulis + Panggilan Orang Tua",    pihak:"Ditangani guru piket, wali kelas, guru BK — dikonfirmasi ke orang tua",     c:"orange"},
    {range:"300–399",sanction:"Panggilan Ortu + Skorsing 6 Hari",     pihak:"Ditangani wali kelas, guru BK dan wakil kesiswaan",                         c:"red"},
    {range:"400–500",sanction:"Panggilan Ortu + Surat Pernyataan",    pihak:"Ditangani guru BK dan Kepala Sekolah",                                      c:"rose"},
    {range:"≥ 501",  sanction:"Dikembalikan kepada Orang Tua",        pihak:"Konferensi kasus",                                                          c:"dark"},
  ];
  const bgs:{[k:string]:string}={sky:"bg-sky-50 border-sky-200",amber:"bg-amber-50 border-amber-200",orange:"bg-orange-50 border-orange-200",red:"bg-red-50 border-red-200",rose:"bg-rose-50 border-rose-300",dark:"bg-red-100 border-red-400"};
  const txts:{[k:string]:string}={sky:"text-sky-700",amber:"text-amber-700",orange:"text-orange-700",red:"text-red-700",rose:"text-rose-700",dark:"text-red-900"};
  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Jenis Pelanggaran — embedded CategoriesView */}
      <CategoriesView vts={vts} onAdd={onAdd} onEdit={onEdit} onDel={onDel} onSuccess={onSuccess}/>

      {/* Tingkatan Sanksi + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold mb-4">Tingkatan Sanksi Aktif</p>
          <div className="space-y-3">
            {levels.map(l=>(
              <div key={l.range} className={`border rounded-xl p-4 ${bgs[l.c]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className={`font-semibold text-sm ${txts[l.c]}`}>{l.sanction}</p><p className="text-xs text-muted-foreground mt-0.5">{l.pihak}</p></div>
                  <Chip cls={`${bgs[l.c]} ${txts[l.c]} text-[10px] flex-shrink-0`}>{l.range} poin</Chip>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          {userModal==="add"&&<UserModal onSave={u=>{onAddUser(u);setUserModal(null);onSuccess("Akun pengguna berhasil ditambahkan.");}} onClose={()=>setUserModal(null)}/>}
          {userModal&&typeof userModal==="object"&&<UserModal init={userModal.u} onSave={u=>{
            const upd={...u,password:u.password||userModal.u.password};
            onEditUser(upd);setUserModal(null);onSuccess("Akun pengguna berhasil diperbarui.");
          }} onClose={()=>setUserModal(null)}/>}
          {userConfirm&&<Confirm title="Hapus Akun" message={`Yakin hapus akun "${userConfirm.displayName}"?`} onOk={()=>{onDelUser(userConfirm.id);setUserConfirm(null);onSuccess("Akun berhasil dihapus.");}} onCancel={()=>setUserConfirm(null)}/>}

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div><p className="text-sm font-semibold">Akun Pengguna Sistem</p><p className="text-xs text-muted-foreground">{users.length} akun terdaftar</p></div>
              <button onClick={()=>setUserModal("add")} className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Plus size={13}/> Tambah Akun
              </button>
            </div>
            <div className="divide-y divide-border">
              {sortedUsers.map(u=>{
                const isMe = u.id===currentUserId;
                return(
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/15">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.role==="admin"?"bg-primary/10 text-primary":"bg-amber-50 text-amber-700"}`}>{u.displayName[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{u.displayName}</p>
                        {isMe&&<Chip cls="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Anda</Chip>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}{u.nip&&` · NIP ${u.nip}`}</p>
                    </div>
                    <Chip cls={`text-[10px] flex-shrink-0 ${u.role==="admin"?"bg-primary/8 text-primary border-primary/15":"bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {u.role==="admin"?"Admin":"Guru Piket"}
                    </Chip>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={()=>setUserModal({u})} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground" title="Edit"><Edit2 size={13}/></button>
                      <button onClick={()=>!isMe&&setUserConfirm(u)} disabled={isMe} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed" title={isMe?"Tidak bisa hapus akun sendiri":"Hapus"}><Trash2 size={13}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
