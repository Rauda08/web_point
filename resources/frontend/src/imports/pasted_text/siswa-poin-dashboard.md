Bertindaklah sebagai system analyst, UI/UX designer, database designer, dan full-stack web developer profesional.

Saya ingin membangun sebuah website bernama:

“SISTEM INFORMASI PENGELOLAAN POIN DAN PEMBINAAN SISWA”

Website ini digunakan di SMA Negeri 2 Pangkalan Kuras untuk membantu sekolah mengelola pelanggaran, kredit poin, debit poin penghargaan, pembinaan siswa, sanksi, pemanggilan orang tua, serta laporan kedisiplinan siswa.

Gunakan bahasa Indonesia pada seluruh antarmuka sistem.

==================================================
A. TUJUAN WEBSITE
==================================================

Website bertujuan untuk:

1. Mempermudah petugas mencatat pelanggaran siswa.
2. Menghitung kredit poin pelanggaran secara otomatis.
3. Mengelola debit poin dari prestasi atau perilaku positif.
4. Menghitung poin bersih siswa.
5. Mengenali pelanggaran yang dilakukan berulang kali.
6. Memberikan peringatan ketika siswa mencapai batas tindak lanjut.
7. Mengelola proses pembinaan siswa.
8. Membuat surat peringatan dan surat panggilan orang tua.
9. Menyimpan bukti pelanggaran secara aman.
10. Menghasilkan laporan dalam format PDF.
11. Memungkinkan siswa atau orang tua mengecek total poin secara terbatas tanpa login.
12. Menyimpan riwayat seluruh aktivitas dan perubahan data.

Website harus memiliki dua portal utama:

1. Portal internal sekolah.
2. Portal publik untuk siswa dan orang tua.

==================================================
B. TEKNOLOGI YANG DIGUNAKAN
==================================================

Gunakan teknologi berikut:

Backend:
- Laravel 11.
- PHP 8.2 atau versi yang kompatibel.
- REST API.
- Laravel Sanctum untuk autentikasi.

Frontend:
- React.
- Vite.
- Tailwind CSS.
- Axios.
- React Router.

Database:
- MySQL.

Dokumen:
- Gunakan library PDF yang sesuai untuk menghasilkan laporan dan surat.

Penyimpanan file:
- Gunakan Laravel Storage.
- Bukti pelanggaran tidak boleh dapat diakses melalui URL publik tanpa pemeriksaan hak akses.

Buat kode yang:
- Terstruktur.
- Mudah dipelihara.
- Responsif.
- Memiliki validasi.
- Memiliki error handling.
- Menggunakan relasi database yang benar.
- Mengikuti prinsip keamanan aplikasi web.

==================================================
C. AKTOR DAN HAK AKSES
==================================================

Secara umum terdapat dua aktor utama:

1. Admin atau Pengguna Internal.
2. Siswa atau Orang Tua.

Namun, akun pengguna internal memiliki role dan hak akses yang berbeda.

Role pengguna internal:

1. Super Admin
   - Mengelola akun pengguna.
   - Mengelola role dan hak akses.
   - Mengelola profil sekolah.
   - Mengelola tahun pelajaran.
   - Mengaktifkan versi tata tertib.
   - Melihat audit log.
   - Mengelola backup.

2. Staf Kesiswaan
   - Mengelola seluruh data siswa.
   - Mengelola kelas.
   - Mengelola pelanggaran.
   - Mengelola debit poin.
   - Mengelola pembinaan.
   - Membuat laporan.
   - Membuat surat.

3. Guru Piket atau Tim Disiplin
   - Mencatat pelanggaran.
   - Mengunggah bukti.
   - Memberikan sanksi langsung.
   - Mengirim data untuk diverifikasi.
   - Melihat kasus yang dicatatnya.

4. Wali Kelas
   - Melihat siswa pada kelas yang dibinanya.
   - Melihat riwayat poin siswa.
   - Memberikan catatan pembinaan.
   - Melakukan tindak lanjut.
   - Memantau pemanggilan orang tua.

5. Guru BK
   - Memverifikasi pelanggaran.
   - Mengelola jurnal pembinaan.
   - Mengelola konseling.
   - Mengelola debit poin.
   - Membuat surat peringatan.
   - Membuat surat panggilan orang tua.
   - Memberikan rekomendasi sanksi.

6. Waka Kesiswaan
   - Melihat seluruh data.
   - Menyetujui sanksi tertentu.
   - Menyetujui skorsing.
   - Mengelola aturan poin.
   - Melihat laporan kedisiplinan.
   - Mengelola konferensi kasus.

7. Kepala Sekolah
   - Melihat laporan.
   - Menyetujui sanksi berat.
   - Melihat konferensi kasus.
   - Menyetujui keputusan akhir.
   - Menandatangani dokumen tertentu.

8. Siswa atau Orang Tua
   - Tidak perlu login.
   - Memasukkan NIS siswa.
   - Melihat identitas singkat siswa.
   - Melihat total poin bersih.
   - Melihat status kedisiplinan.
   - Tidak dapat melihat kronologi, bukti, saksi, pelapor, dan catatan konseling.

Gunakan Role-Based Access Control atau RBAC.

==================================================
D. AUTENTIKASI PENGGUNA INTERNAL
==================================================

Sediakan fitur:

1. Login.
2. Logout.
3. Lupa password.
4. Ubah password.
5. Profil pengguna.
6. Pembatasan halaman berdasarkan role.
7. Session timeout.
8. Pencatatan waktu login terakhir.
9. Pembatasan percobaan login.
10. Status akun aktif atau nonaktif.

==================================================
E. DASHBOARD
==================================================

Dashboard admin menampilkan:

1. Jumlah siswa aktif.
2. Jumlah kelas.
3. Jumlah pelanggaran hari ini.
4. Jumlah pelanggaran bulan ini.
5. Jumlah siswa tanpa poin.
6. Jumlah siswa yang memiliki kredit poin.
7. Jumlah siswa yang mendekati batas tindak lanjut.
8. Jumlah siswa yang telah mencapai batas sanksi.
9. Kasus yang menunggu verifikasi.
10. Kasus dalam proses pembinaan.
11. Pemanggilan orang tua yang belum selesai.
12. Siswa yang sedang menjalani skorsing.
13. Grafik pelanggaran per bulan.
14. Grafik pelanggaran berdasarkan kelas.
15. Grafik berdasarkan kategori pelanggaran.
16. Jenis pelanggaran yang paling sering terjadi.
17. Daftar pelanggaran terbaru.
18. Daftar siswa yang perlu segera ditindaklanjuti.
19. Notifikasi sistem.

Gunakan kartu statistik, grafik, tabel ringkas, dan indikator status.

==================================================
F. MANAJEMEN DATA SISWA
==================================================

Data siswa meliputi:

- ID siswa.
- NIS.
- NISN.
- Nama lengkap.
- Tempat lahir.
- Tanggal lahir.
- Jenis kelamin.
- Agama.
- Alamat.
- Nomor telepon siswa.
- Nama orang tua atau wali.
- Nomor telepon orang tua atau wali.
- Kelas.
- Tahun pelajaran.
- Nama wali kelas.
- Foto siswa.
- PIN orang tua jika digunakan.
- Status siswa:
  - Aktif.
  - Lulus.
  - Pindah.
  - Mengundurkan diri.
  - Dikembalikan kepada orang tua.

Fitur data siswa:

1. Tambah siswa.
2. Ubah siswa.
3. Lihat detail siswa.
4. Arsipkan siswa.
5. Pencarian berdasarkan nama, NIS, atau NISN.
6. Filter berdasarkan kelas.
7. Filter berdasarkan status.
8. Impor siswa dari Excel.
9. Ekspor data siswa.
10. Kenaikan kelas secara massal.
11. Pemindahan kelas secara massal.
12. Arsip siswa yang telah lulus.
13. Riwayat kelas siswa.

Hindari penghapusan permanen data siswa yang telah mempunyai riwayat kasus.

==================================================
G. DATA KELAS DAN TAHUN PELAJARAN
==================================================

Data kelas terdiri dari:

- Tingkat kelas.
- Nama kelas.
- Jurusan jika ada.
- Wali kelas.
- Tahun pelajaran.
- Status aktif.

Tahun pelajaran terdiri dari:

- Nama tahun pelajaran.
- Semester.
- Tanggal mulai.
- Tanggal selesai.
- Status aktif.
- Status ditutup.

Poin pelanggaran harus dipisahkan berdasarkan tahun pelajaran.

Ketika tahun pelajaran ditutup:

- Data lama tetap dapat dilihat.
- Data lama tidak dapat diubah sembarangan.
- Sistem memulai perhitungan periode baru.
- Riwayat siswa tidak hilang.

==================================================
H. VERSI TATA TERTIB
==================================================

Buat modul versi tata tertib karena bobot dan ketentuan dapat berubah.

Data versi tata tertib:

- Nama versi.
- Nomor versi.
- Tahun pelajaran.
- Tanggal mulai berlaku.
- Tanggal berakhir.
- Dasar keputusan.
- Dokumen pendukung.
- Status:
  - Draft.
  - Menunggu persetujuan.
  - Aktif.
  - Tidak aktif.
  - Diarsipkan.
- Pengguna yang membuat.
- Pengguna yang menyetujui.
- Tanggal persetujuan.

Ketentuan:

1. Hanya satu versi tata tertib yang aktif pada satu periode.
2. Poin pelanggaran yang telah tercatat tetap menggunakan bobot dari versi yang berlaku saat kejadian.
3. Perubahan bobot baru tidak boleh mengubah transaksi lama.
4. Simpan histori perubahan.
5. Jangan menulis bobot pelanggaran secara permanen di source code.
6. Semua bobot harus dapat diatur dari database.
7. Jika terdapat perbedaan aturan, tampilkan kepada admin dan minta penetapan versi aktif.

==================================================
I. MASTER KATEGORI DAN JENIS PELANGGARAN
==================================================

Kelompok pelanggaran mencakup:

1. Kehadiran siswa.
2. Kegiatan belajar mengajar.
3. Seragam sekolah.
4. Tata rias.
5. Tindakan perusakan.
6. Merokok.
7. Miras, narkoba, dan perjudian.
8. Bullying dan perkelahian.
9. Penyalahgunaan uang sekolah.
10. Orang tua atau wali gadungan.
11. Mengambil barang orang lain.
12. Tindakan terhadap nama baik sekolah.
13. Membawa barang terlarang.
14. Tindakan amoral atau asusila.
15. Senjata tajam atau senjata api.
16. Peralatan makan.
17. Parkir dan penggunaan fasilitas sekolah.

Setiap jenis pelanggaran memiliki:

- Kode pelanggaran.
- Kategori.
- Nama pelanggaran.
- Deskripsi.
- Bobot kredit poin.
- Tingkat pelanggaran.
- Urutan pelanggaran.
- Pelanggaran pertama atau pengulangan.
- Pelanggaran sebelumnya yang berkaitan.
- Sanksi langsung.
- Pihak yang wajib menangani.
- Apakah wajib unggah bukti.
- Jenis bukti yang diperlukan.
- Apakah langsung memerlukan pembinaan.
- Apakah langsung memerlukan konferensi kasus.
- Status aktif.
- Versi tata tertib.

Admin dapat:

- Menambah jenis pelanggaran.
- Mengubah jenis pelanggaran.
- Menonaktifkan jenis pelanggaran.
- Mengubah bobot pada versi baru.
- Melihat histori perubahan.

==================================================
J. PENCATATAN PELANGGARAN
==================================================

Form pencatatan pelanggaran memuat:

1. NIS atau nama siswa.
2. Kelas.
3. Tanggal kejadian.
4. Waktu kejadian.
5. Lokasi kejadian.
6. Kategori pelanggaran.
7. Jenis pelanggaran.
8. Bobot poin otomatis.
9. Kronologi kejadian.
10. Nama pelapor.
11. Guru atau petugas yang menangani.
12. Nama saksi.
13. Sanksi langsung.
14. Catatan tambahan.
15. Bukti foto.
16. Bukti dokumen.
17. Status kasus.
18. Versi tata tertib yang digunakan.

Alur status kasus:

- Draft.
- Menunggu verifikasi.
- Perlu perbaikan.
- Terverifikasi.
- Dalam pembinaan.
- Menunggu orang tua.
- Menunggu persetujuan.
- Selesai.
- Dibatalkan.

Sediakan tombol:

- Simpan draft.
- Kirim untuk verifikasi.
- Verifikasi.
- Minta perbaikan.
- Tolak.
- Batalkan.
- Teruskan ke wali kelas.
- Teruskan ke BK.
- Teruskan ke Waka Kesiswaan.
- Cetak berita kejadian.

Ketika data diverifikasi:

- Kredit poin ditambahkan ke siswa.
- Riwayat poin dibuat.
- Sistem memeriksa pelanggaran berulang.
- Sistem memeriksa ambang tindak lanjut.
- Sistem membuat notifikasi jika diperlukan.

Poin tidak boleh ditambahkan saat data masih berstatus draft.

==================================================
K. UNGGAH BUKTI
==================================================

Bukti dapat berupa:

- JPG.
- JPEG.
- PNG.
- PDF.

Ketentuan:

1. Validasi format.
2. Validasi ukuran file.
3. Gunakan nama file acak.
4. Simpan metadata file.
5. Simpan pengguna yang mengunggah.
6. Simpan tanggal unggah.
7. Bukti hanya dapat dibuka oleh pengguna berwenang.
8. Bukti tidak ditampilkan pada halaman publik.
9. Sediakan preview.
10. Sediakan fitur hapus atau ganti sebelum kasus diverifikasi.
11. Setelah kasus terverifikasi, perubahan bukti harus tercatat di audit log.

==================================================
L. PERHITUNGAN KREDIT POIN
==================================================

Gunakan rumus:

Total Kredit Pelanggaran
− Total Debit Penghargaan
= Total Poin Bersih

Tampilkan:

- Kredit poin tahun pelajaran berjalan.
- Debit poin tahun pelajaran berjalan.
- Poin bersih.
- Jumlah kasus.
- Pelanggaran terakhir.
- Status pembinaan.
- Batas tindak lanjut berikutnya.
- Riwayat perubahan poin.

Ketentuan:

1. Kredit poin diakumulasikan dalam satu tahun pelajaran.
2. Data periode lama tidak dicampurkan dengan tahun pelajaran baru.
3. Setiap transaksi poin harus memiliki sumber.
4. Perubahan manual poin hanya dapat dilakukan pengguna tertentu.
5. Perubahan manual wajib menyertakan alasan.
6. Seluruh perubahan dicatat pada audit log.
7. Pembatalan kasus harus mengembalikan poin secara otomatis.
8. Poin tidak boleh diedit langsung tanpa membuat transaksi koreksi.

==================================================
M. DETEKSI PELANGGARAN BERULANG
==================================================

Beberapa pelanggaran memiliki bobot berbeda ketika diulangi.

Sistem harus:

1. Memeriksa riwayat pelanggaran siswa.
2. Menghitung berapa kali jenis pelanggaran yang sama dilakukan.
3. Menyarankan jenis pelanggaran pengulangan.
4. Menampilkan riwayat kasus sejenis.
5. Memberikan peringatan kepada petugas.
6. Memilih bobot sesuai ketentuan versi tata tertib.
7. Tetap menyediakan proses verifikasi manusia.
8. Tidak menentukan pengulangan hanya berdasarkan total poin.
9. Menentukan pengulangan berdasarkan hubungan antarjenis pelanggaran.

Contoh:

Pelanggaran pertama:
- Alpa tanpa keterangan.

Pelanggaran berikutnya:
- Mengulangi alpa tanpa keterangan.

Sistem harus dapat menghubungkan kedua jenis pelanggaran tersebut.

==================================================
N. DEBIT POIN ATAU PENGHARGAAN
==================================================

Debit poin digunakan untuk mengurangi kredit poin melalui prestasi atau perilaku positif.

Jenis penghargaan antara lain:

1. Tidak pernah terlambat selama satu bulan.
2. Tidak pernah absen selama satu bulan.
3. Menjadi perangkat kelas.
4. Menjadi pelaksana upacara.
5. Menjadi pengurus organisasi.
6. Menjadi panitia kegiatan.
7. Mengikuti perlombaan.
8. Menjadi juara.
9. Hafal Al-Qur’an.
10. Memberikan informasi pelanggaran yang valid.

Setiap jenis penghargaan memiliki:

- Kode.
- Nama penghargaan.
- Kategori.
- Tingkat prestasi.
- Bobot debit.
- Bukti yang diperlukan.
- Status aktif.
- Versi aturan.

Form pemberian debit poin:

- Siswa.
- Jenis penghargaan.
- Tanggal.
- Tingkat prestasi.
- Bobot.
- Keterangan.
- Sertifikat atau dokumen bukti.
- Pengusul.
- Verifikator.
- Status persetujuan.

Status:

- Draft.
- Menunggu verifikasi.
- Disetujui.
- Ditolak.
- Dibatalkan.

Ketentuan:

1. Debit poin baru mengurangi kredit setelah disetujui.
2. Sistem tidak boleh menghasilkan poin bersih negatif kecuali sekolah mengaktifkan aturan tersebut.
3. Debit poin harus memiliki bukti.
4. Debit poin hanya dapat digunakan sesuai ketentuan sekolah.
5. Pembatalan debit poin harus mengembalikan perhitungan sebelumnya.
6. Seluruh aktivitas dicatat.

==================================================
O. ATURAN SANKSI DAN TINDAK LANJUT
==================================================

Buat master aturan tindak lanjut yang dapat diubah oleh admin.

Contoh tingkatan:

1. Poin 75
   Penanganan:
   - Guru piket.
   - Wali kelas.

   Sanksi:
   - Peringatan lisan.

2. Poin 150
   Penanganan:
   - Guru piket.
   - Wali kelas.
   - Guru BK.
   - Orang tua.

   Sanksi:
   - Surat peringatan tertulis.
   - Pemanggilan orang tua.

3. Poin 300
   Penanganan:
   - Wali kelas.
   - Guru BK.
   - Waka Kesiswaan.

   Sanksi:
   - Pemanggilan orang tua.
   - Surat pernyataan bermaterai.
   - Skorsing enam hari efektif belajar.

4. Poin 400
   Penanganan:
   - Guru BK.
   - Kepala Sekolah.

   Sanksi:
   - Pemanggilan orang tua.
   - Surat pernyataan bermaterai.

5. Poin 501
   Penanganan:
   - Konferensi kasus.

   Sanksi:
   - Dikembalikan kepada orang tua.

Karena dapat terdapat perbedaan antara batas maksimal poin dan tabel tindak lanjut, semua ambang harus:

- Disimpan dalam database.
- Dapat diubah berdasarkan versi.
- Tidak ditulis permanen dalam kode.
- Memerlukan persetujuan pengguna berwenang.
- Memiliki histori perubahan.

Ketika siswa mencapai ambang tertentu:

1. Sistem membuat notifikasi.
2. Sistem menentukan pihak yang harus menangani.
3. Sistem membuat daftar tugas tindak lanjut.
4. Sistem menampilkan rekomendasi sanksi.
5. Sistem tidak langsung menjatuhkan sanksi berat tanpa persetujuan.
6. Sistem menyediakan tombol membuat surat.
7. Sistem mencatat status penyelesaian.

==================================================
P. ATURAN BERDASARKAN FREKUENSI KEJADIAN
==================================================

Tidak semua tindak lanjut hanya berdasarkan total poin.

Buat rule engine untuk aturan berdasarkan frekuensi.

Contoh:

1. Terlambat tiga kali:
   - Buat peringatan.
   - Beri notifikasi kepada wali kelas.
   - Buat proses pemanggilan orang tua.

2. Keterlambatan berulang berikutnya:
   - Beri notifikasi kepada BK.
   - Buat rekomendasi skorsing sesuai peraturan.

3. Membawa HP pertama kali:
   - Ditangani wali kelas.

4. Membawa HP kedua kali:
   - Ditangani guru BK.

5. Membawa HP ketiga kali:
   - Ditangani kesiswaan.

6. Tidak hadir tanpa keterangan lebih dari batas tertentu:
   - Buat panggilan orang tua.

7. Tidak hadir berturut-turut tanpa pemberitahuan:
   - Buat peringatan status siswa.

Data rule:

- Nama aturan.
- Jenis pelanggaran.
- Jumlah kejadian.
- Periode perhitungan.
- Tindakan otomatis.
- Penerima notifikasi.
- Rekomendasi sanksi.
- Status aktif.
- Versi aturan.

Sistem harus mencegah notifikasi yang sama dibuat berulang kali tanpa alasan.

==================================================
Q. JURNAL PEMBINAAN SISWA
==================================================

Buat halaman jurnal pembinaan dengan data:

- Siswa.
- Kelas.
- Wali kelas.
- Kasus terkait.
- Hari dan tanggal.
- Uraian kasus.
- Bentuk pembinaan.
- Penyelesaian.
- Guru pembina.
- Catatan siswa.
- Komitmen siswa.
- Rencana tindak lanjut.
- Status.
- Tanda tangan atau persetujuan siswa.
- Lampiran jika ada.

Status pembinaan:

- Dijadwalkan.
- Sedang berlangsung.
- Perlu tindak lanjut.
- Selesai.
- Dibatalkan.

Sediakan:

- Riwayat pembinaan per siswa.
- Filter tanggal.
- Filter kelas.
- Cetak jurnal PDF.
- Cetak jurnal per siswa.
- Kolom tanda tangan.

==================================================
R. PEMANGGILAN ORANG TUA
==================================================

Data pemanggilan:

- Nomor surat.
- Siswa.
- Orang tua atau wali.
- Nomor telepon.
- Dasar pemanggilan.
- Kasus terkait.
- Total poin.
- Tanggal surat.
- Jadwal pertemuan.
- Tempat.
- Petugas yang membuat.
- Pihak sekolah yang hadir.
- Status penyampaian surat.
- Status kehadiran orang tua.
- Hasil pertemuan.
- Kesepakatan.
- Rencana tindak lanjut.
- Dokumen tanda tangan.

Status:

- Draft.
- Diterbitkan.
- Disampaikan.
- Diterima.
- Orang tua hadir.
- Orang tua tidak hadir.
- Dijadwalkan ulang.
- Selesai.

Sediakan PDF surat panggilan resmi menggunakan kop sekolah.

==================================================
S. SURAT PERINGATAN DAN SURAT PERNYATAAN
==================================================

Buat template:

1. Surat peringatan pertama.
2. Surat peringatan kedua.
3. Surat panggilan orang tua.
4. Surat pernyataan siswa.
5. Surat pernyataan orang tua.
6. Surat skorsing.
7. Berita acara kasus.
8. Berita acara konferensi kasus.

Dokumen memuat:

- Kop sekolah.
- Nomor surat.
- Identitas siswa.
- Kelas.
- NIS atau NISN.
- Riwayat singkat.
- Total poin.
- Dasar aturan.
- Tindak lanjut.
- Tanggal.
- Kolom tanda tangan.
- Nama pejabat sekolah.
- NIP jika tersedia.

Nomor surat dapat dibuat otomatis tetapi tetap dapat disesuaikan.

==================================================
T. SKORSING
==================================================

Data skorsing:

- Siswa.
- Kasus.
- Total poin.
- Dasar keputusan.
- Tanggal mulai.
- Tanggal selesai.
- Jumlah hari efektif.
- Tugas selama skorsing.
- Guru penanggung jawab.
- Status tugas.
- Persetujuan Waka Kesiswaan.
- Persetujuan Kepala Sekolah.
- Surat skorsing.
- Catatan evaluasi.

Status:

- Draft.
- Menunggu persetujuan.
- Disetujui.
- Sedang berjalan.
- Selesai.
- Dibatalkan.

==================================================
U. KONFERENSI KASUS
==================================================

Data konferensi kasus:

- Siswa.
- Kasus utama.
- Riwayat pelanggaran.
- Total kredit.
- Total debit.
- Poin bersih.
- Jadwal.
- Lokasi.
- Peserta.
- Waka Kesiswaan.
- Guru BK.
- Tim Disiplin.
- Wali kelas.
- Kepala Sekolah.
- Orang tua.
- Bukti kasus.
- Riwayat pembinaan.
- Pendapat peserta.
- Keputusan.
- Tindak lanjut.
- Berita acara.
- Tanda tangan.

Status:

- Direncanakan.
- Dijadwalkan.
- Selesai.
- Ditunda.
- Dibatalkan.

Keputusan tidak boleh dibuat otomatis oleh sistem. Sistem hanya memberikan data dan rekomendasi.

==================================================
V. BARANG SITAAN DAN GANTI RUGI
==================================================

Buat modul barang sitaan.

Data:

- Siswa.
- Kasus.
- Jenis barang.
- Nama barang.
- Foto barang.
- Tanggal disita.
- Petugas penyita.
- Alasan penyitaan.
- Tempat penyimpanan.
- Kondisi barang.
- Status.
- Tanggal pengembalian.
- Penerima barang.
- Bukti serah terima.

Status:

- Disita.
- Disimpan.
- Dikembalikan.
- Tidak dikembalikan.
- Diserahkan kepada pihak berwenang.

Buat modul ganti rugi:

- Siswa.
- Kasus.
- Barang atau fasilitas yang rusak.
- Deskripsi kerusakan.
- Nilai kerugian.
- Bentuk tanggung jawab.
- Status pembayaran atau perbaikan.
- Tanggal penyelesaian.
- Bukti penyelesaian.

==================================================
W. HALAMAN CEK POIN PUBLIK
==================================================

Siswa dan orang tua tidak perlu login.

Halaman terdiri dari:

1. Logo sekolah.
2. Nama sistem.
3. Kolom NIS.
4. Tombol “Cek Poin”.
5. Kartu hasil pencarian.

Setelah NIS ditemukan, tampilkan hanya:

- Inisial atau foto siswa.
- Nama lengkap.
- Kelas.
- NIS.
- Total poin bersih.
- Status siswa.
- Keterangan bahwa data terverifikasi.

Jangan tampilkan:

- Jenis pelanggaran.
- Kronologi.
- Nama pelapor.
- Nama saksi.
- Bukti foto.
- Dokumen.
- Catatan konseling.
- Surat peringatan.
- Informasi sensitif lainnya.

Keamanan halaman publik:

1. Gunakan rate limiting.
2. Gunakan CAPTCHA setelah beberapa percobaan.
3. Jangan tampilkan data jika NIS tidak tepat.
4. Sebaiknya gunakan verifikasi tambahan berupa:
   - Tanggal lahir, atau
   - PIN orang tua.
5. Catat aktivitas pencarian secara terbatas.
6. Jangan menampilkan data pribadi lengkap.

Pesan jika data tidak ditemukan:

“Data siswa dengan NIS tersebut tidak ditemukan. Silakan periksa kembali NIS yang dimasukkan.”

Tampilan harus mengikuti desain modern:

- Latar belakang gelap.
- Kartu dengan sudut membulat.
- Warna status yang mudah dibaca.
- Responsif untuk komputer dan smartphone.
- Form berada di tengah halaman.
- Tombol utama terlihat jelas.

==================================================
X. STATUS SISWA BERDASARKAN POIN
==================================================

Buat master status yang dapat diubah oleh admin.

Contoh status tampilan publik:

- 0 poin: Sangat Baik.
- Poin rendah: Baik.
- Mendekati tindak lanjut: Perlu Perhatian.
- Telah mencapai ambang: Perlu Pembinaan.
- Kasus berat: Dalam Penanganan Sekolah.

Jangan hardcode rentang status.

Data status:

- Nama status.
- Poin minimum.
- Poin maksimum.
- Warna.
- Ikon.
- Keterangan internal.
- Keterangan publik.
- Status aktif.
- Versi aturan.

==================================================
Y. LAPORAN DAN PDF
==================================================

Sediakan laporan:

1. Laporan pelanggaran per siswa.
2. Laporan per kelas.
3. Laporan berdasarkan tanggal.
4. Laporan bulanan.
5. Laporan semester.
6. Laporan tahun pelajaran.
7. Laporan berdasarkan kategori.
8. Laporan jenis pelanggaran terbanyak.
9. Daftar siswa berdasarkan total poin.
10. Laporan kredit poin.
11. Laporan debit poin.
12. Laporan poin bersih.
13. Laporan pembinaan.
14. Laporan pemanggilan orang tua.
15. Laporan skorsing.
16. Laporan konferensi kasus.
17. Laporan barang sitaan.
18. Laporan ganti rugi.
19. Jurnal pembinaan siswa.
20. Rekap aktivitas petugas.

Filter:

- Tahun pelajaran.
- Semester.
- Rentang tanggal.
- Kelas.
- Siswa.
- Kategori.
- Jenis pelanggaran.
- Status kasus.
- Petugas.
- Status tindak lanjut.

Laporan dapat:

- Dilihat.
- Diunduh PDF.
- Dicetak.
- Diekspor ke Excel jika diperlukan.

==================================================
Z. NOTIFIKASI
==================================================

Buat notifikasi untuk:

- Pelanggaran baru.
- Kasus menunggu verifikasi.
- Bukti belum lengkap.
- Kasus dikembalikan untuk diperbaiki.
- Siswa mencapai ambang poin.
- Pelanggaran yang sama dilakukan berulang.
- Pembinaan belum selesai.
- Orang tua belum hadir.
- Jadwal pemanggilan orang tua.
- Skorsing akan dimulai.
- Skorsing akan selesai.
- Konferensi kasus dijadwalkan.
- Perubahan aturan poin.
- Tahun pelajaran akan ditutup.

Notifikasi ditampilkan pada topbar dashboard.

Siapkan struktur agar nantinya dapat dikembangkan menjadi notifikasi WhatsApp atau email, tetapi fitur tersebut tidak wajib pada tahap pertama.

==================================================
AA. AUDIT LOG
==================================================

Catat aktivitas berikut:

- Login.
- Logout.
- Tambah data.
- Ubah data.
- Hapus atau arsip data.
- Verifikasi kasus.
- Pembatalan kasus.
- Perubahan poin.
- Pemberian debit poin.
- Persetujuan sanksi.
- Unduh laporan.
- Melihat bukti sensitif.
- Mengubah versi tata tertib.
- Mengubah bobot pelanggaran.

Audit log memuat:

- Pengguna.
- Role.
- Aktivitas.
- Modul.
- Data yang berubah.
- Nilai sebelum.
- Nilai sesudah.
- Waktu.
- Alamat IP.
- Perangkat jika tersedia.

Audit log hanya dapat dilihat pengguna berwenang.

==================================================
AB. KEAMANAN
==================================================

Terapkan:

1. Password hashing.
2. Validasi server-side.
3. Sanitasi input.
4. Proteksi CSRF.
5. Proteksi XSS.
6. Proteksi SQL injection.
7. Rate limiting.
8. Role-based access.
9. Penyimpanan file privat.
10. Pemeriksaan MIME type.
11. Batas ukuran unggahan.
12. Session timeout.
13. Audit log.
14. Soft delete.
15. Backup database.
16. Konfirmasi untuk tindakan sensitif.
17. Alasan wajib untuk pembatalan.
18. Persetujuan berjenjang untuk sanksi berat.
19. Jangan mengekspos data sensitif melalui API publik.
20. Gunakan pagination pada daftar data.

==================================================
AC. STRUKTUR NAVIGASI
==================================================

Portal publik:

- Beranda.
- Cek Poin.
- Informasi Tata Tertib.
- Login Admin.

Portal internal:

DASHBOARD

PENCATATAN
- Catat Pelanggaran.
- Pelanggaran Hari Ini.
- Riwayat Pelanggaran.
- Verifikasi Kasus.

DATA MASTER
- Data Siswa.
- Data Kelas.
- Tahun Pelajaran.
- Versi Tata Tertib.
- Kategori Pelanggaran.
- Jenis Pelanggaran.
- Jenis Penghargaan.
- Aturan Tindak Lanjut.
- Status Poin.

POIN SISWA
- Kredit Poin.
- Debit Poin.
- Rekap Poin.
- Riwayat Perubahan Poin.

PEMBINAAN
- Jurnal Pembinaan.
- Pemanggilan Orang Tua.
- Surat Peringatan.
- Skorsing.
- Konferensi Kasus.

LAINNYA
- Barang Sitaan.
- Ganti Rugi.
- Laporan.
- Notifikasi.
- Pengguna.
- Audit Log.
- Profil Sekolah.
- Pengaturan.

Gunakan sidebar pada desktop dan drawer pada smartphone.

Topbar memuat:

- Tombol menu.
- Judul halaman.
- Notifikasi.
- Nama pengguna.
- Role.
- Profil.
- Logout.

==================================================
AD. STRUKTUR DATABASE
==================================================

Buat rancangan tabel minimal:

1. users
2. roles
3. permissions
4. role_user
5. permission_role
6. school_profiles
7. academic_years
8. classes
9. students
10. student_class_histories
11. parents
12. regulation_versions
13. violation_categories
14. violations
15. violation_rule_versions
16. student_violations
17. violation_evidences
18. violation_witnesses
19. point_transactions
20. reward_categories
21. rewards
22. student_rewards
23. sanction_rules
24. frequency_rules
25. follow_ups
26. counseling_journals
27. parent_summons
28. warning_letters
29. student_statements
30. suspensions
31. case_conferences
32. conference_participants
33. confiscated_items
34. compensations
35. notifications
36. generated_documents
37. audit_logs
38. public_lookup_logs
39. system_settings

Untuk setiap tabel, tentukan:

- Primary key.
- Foreign key.
- Tipe data.
- Nullable atau wajib.
- Unique constraint.
- Index.
- Timestamp.
- Soft delete jika diperlukan.
- Relasi antar tabel.

Pastikan transaksi poin menggunakan sistem ledger.

Jangan hanya menyimpan satu kolom total poin tanpa riwayat transaksi.

==================================================
AE. API YANG DIBUTUHKAN
==================================================

Buat endpoint REST API untuk:

- Authentication.
- Dashboard.
- Pengguna.
- Role dan permission.
- Siswa.
- Kelas.
- Tahun pelajaran.
- Versi aturan.
- Kategori pelanggaran.
- Jenis pelanggaran.
- Pencatatan kasus.
- Verifikasi kasus.
- Bukti pelanggaran.
- Kredit poin.
- Debit poin.
- Pembinaan.
- Pemanggilan orang tua.
- Surat peringatan.
- Skorsing.
- Konferensi kasus.
- Barang sitaan.
- Ganti rugi.
- Laporan.
- Notifikasi.
- Audit log.
- Cek poin publik.

Gunakan:

- Request validation.
- API resource.
- Policy.
- Middleware.
- Pagination.
- Filter.
- Search.
- Sorting.
- Error response yang konsisten.

==================================================
AF. DESAIN ANTARMUKA
==================================================

Gunakan desain:

- Modern.
- Profesional.
- Bersih.
- Mudah digunakan petugas sekolah.
- Responsif.
- Konsisten.
- Memiliki kontras yang baik.
- Tidak terlalu ramai.

Gunakan komponen:

- Sidebar.
- Topbar.
- Breadcrumb.
- Card statistik.
- Tabel.
- Search.
- Filter.
- Pagination.
- Modal konfirmasi.
- Form validation.
- Toast notification.
- Badge status.
- Timeline kasus.
- Step progress tindak lanjut.
- Preview dokumen.
- Empty state.
- Loading state.
- Error state.

Warna status:

- Hijau untuk aman atau selesai.
- Kuning untuk perhatian.
- Oranye untuk tindak lanjut.
- Merah untuk sanksi atau kasus berat.
- Abu-abu untuk draft.
- Biru untuk informasi.

Jangan hanya mengandalkan warna. Sertakan teks atau ikon status.

==================================================
AG. VALIDASI PENTING
==================================================

1. NIS harus unik.
2. NISN harus unik jika tersedia.
3. Siswa harus berada pada tahun pelajaran aktif.
4. Jenis pelanggaran harus berasal dari versi aturan aktif.
5. Poin tidak dapat diedit langsung.
6. Bukti wajib untuk pelanggaran tertentu.
7. Kasus harus diverifikasi sebelum poin bertambah.
8. Debit harus disetujui sebelum mengurangi poin.
9. Sanksi berat memerlukan persetujuan.
10. Tanggal selesai tidak boleh sebelum tanggal mulai.
11. Pengguna hanya dapat melihat data sesuai kewenangan.
12. Wali kelas hanya dapat mengakses kelasnya, kecuali diberi izin tambahan.
13. Kasus yang sudah selesai tidak boleh diubah tanpa proses pembukaan kembali.
14. Pembatalan transaksi wajib memiliki alasan.
15. Surat tidak dapat diterbitkan jika data penting belum lengkap.

==================================================
AH. DATA AWAL ATAU SEEDER
==================================================

Buat seeder untuk:

- Role pengguna.
- Permission.
- Akun admin awal.
- Profil sekolah.
- Tahun pelajaran.
- Kelas.
- Status kasus.
- Status tindak lanjut.
- Status poin.
- Kategori pelanggaran.
- Jenis pelanggaran sesuai tata tertib.
- Jenis penghargaan.
- Aturan sanksi.
- Aturan frekuensi.

Jangan membuat data siswa nyata.

Gunakan data dummy untuk pengujian.

==================================================
AI. PENGUJIAN
==================================================

Buat skenario Black Box Testing untuk:

1. Login.
2. Hak akses.
3. Data siswa.
4. Impor siswa.
5. Data kelas.
6. Jenis pelanggaran.
7. Pencatatan pelanggaran.
8. Unggah bukti.
9. Verifikasi.
10. Perhitungan kredit.
11. Deteksi pengulangan.
12. Debit poin.
13. Perhitungan poin bersih.
14. Pemicu tindak lanjut.
15. Jurnal pembinaan.
16. Surat panggilan.
17. Skorsing.
18. Konferensi kasus.
19. Laporan PDF.
20. Cek poin publik.
21. Keamanan file.
22. Audit log.

Setiap skenario memuat:

- ID pengujian.
- Fitur.
- Kondisi awal.
- Langkah pengujian.
- Data masukan.
- Hasil yang diharapkan.
- Hasil aktual.
- Status valid atau tidak valid.

Buat juga skenario User Acceptance Testing untuk:

- Staf kesiswaan.
- Guru piket.
- Wali kelas.
- Guru BK.
- Waka Kesiswaan.
- Siswa atau orang tua.

==================================================
AJ. HASIL YANG HARUS DIBERIKAN
==================================================

Sebelum membuat kode, tampilkan:

1. Ringkasan kebutuhan sistem.
2. Identifikasi aktor.
3. Matriks hak akses.
4. Kebutuhan fungsional.
5. Kebutuhan nonfungsional.
6. Use case diagram.
7. Deskripsi use case.
8. Activity diagram.
9. Flowchart.
10. ERD.
11. Struktur database.
12. Alur navigasi.
13. Wireframe setiap halaman.
14. Daftar API.
15. Aturan bisnis.
16. Risiko keamanan.
17. Tahapan implementasi.

Setelah rancangan disetujui, buat kode secara bertahap:

Tahap 1:
- Authentication.
- Role dan permission.
- Profil sekolah.
- Tahun pelajaran.

Tahap 2:
- Data siswa.
- Kelas.
- Impor Excel.

Tahap 3:
- Versi tata tertib.
- Kategori.
- Jenis pelanggaran.
- Aturan sanksi.

Tahap 4:
- Pencatatan pelanggaran.
- Bukti.
- Verifikasi.
- Kredit poin.

Tahap 5:
- Debit poin.
- Deteksi pengulangan.
- Pemicu frekuensi.

Tahap 6:
- Pembinaan.
- Surat.
- Pemanggilan orang tua.
- Skorsing.

Tahap 7:
- Laporan.
- PDF.
- Dashboard.
- Cek poin publik.

Tahap 8:
- Audit log.
- Pengujian.
- Perbaikan keamanan.

Untuk setiap tahap:

- Tampilkan struktur folder.
- Tampilkan migration.
- Model.
- Controller.
- Service.
- Policy.
- Request validation.
- Route.
- React component.
- API integration.
- Error handling.
- Cara menjalankan.
- Cara menguji.

Jangan memberikan potongan kode yang tidak lengkap.

Jangan menghilangkan fitur penting tanpa menjelaskan alasannya.

Pastikan sistem dapat dikembangkan dan aturan poin dapat diubah tanpa perlu mengubah source code.