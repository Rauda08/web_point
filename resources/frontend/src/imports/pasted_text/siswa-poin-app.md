Saya ingin membuat sebuah website **Sistem Pengelolaan Poin Pelanggaran Siswa** untuk membantu sekolah mencatat, menghitung, dan memantau pelanggaran yang dilakukan oleh siswa.

Website ini memiliki dua aktor utama, yaitu:

1. **Admin/Petugas Sekolah**
2. **Siswa atau Orang Tua Siswa**

Admin harus melakukan login untuk mengakses halaman pengelolaan sistem. Sementara itu, siswa atau orang tua tidak perlu login dan hanya perlu memasukkan NIS siswa untuk melihat informasi poin pelanggaran.

## Tujuan Sistem

Sistem ini bertujuan untuk:

* Mempermudah sekolah dalam mencatat pelanggaran siswa.
* Menghitung total poin pelanggaran secara otomatis.
* Menentukan sanksi berdasarkan jumlah poin yang telah dikumpulkan.
* Menyimpan bukti pelanggaran berupa foto atau dokumen.
* Memberikan akses informasi kepada siswa dan orang tua.
* Menghasilkan laporan pelanggaran siswa dalam bentuk PDF.

## Fitur Admin

### 1. Login Admin

Admin harus memasukkan email atau username dan password untuk masuk ke dalam sistem.

### 2. Dashboard

Dashboard menampilkan ringkasan informasi seperti:

* Jumlah seluruh siswa.
* Jumlah siswa yang memiliki poin pelanggaran.
* Jumlah pelanggaran yang terjadi.
* Jumlah siswa yang telah mencapai batas sanksi.
* Daftar pelanggaran terbaru.
* Grafik pelanggaran berdasarkan kategori atau kelas.

### 3. Manajemen Data Siswa

Admin dapat:

* Menambahkan data siswa.
* Melihat daftar siswa.
* Mengubah data siswa.
* Menghapus data siswa.
* Mencari siswa berdasarkan nama atau NIS.
* Menyaring siswa berdasarkan kelas.

Data siswa minimal terdiri dari:

* Nama lengkap.
* NIS atau Nomor Induk Siswa.
* Kelas.
* Jenis kelamin.
* Nama orang tua atau wali.
* Nomor telepon orang tua atau wali.

### 4. Manajemen Kategori Pelanggaran

Admin dapat membuat dan mengubah kategori pelanggaran.

Contoh kategori:

* Pelanggaran ringan: 5 poin.
* Pelanggaran sedang: 15 poin.
* Pelanggaran berat: 50 poin.

Setiap jenis pelanggaran memiliki data:

* Nama pelanggaran.
* Deskripsi pelanggaran.
* Kategori pelanggaran.
* Jumlah poin.
* Sanksi atau tindak lanjut.

Contoh jenis pelanggaran:

* Terlambat masuk sekolah.
* Tidak memakai atribut lengkap.
* Membolos.
* Merokok di lingkungan sekolah.
* Berkelahi.
* Membawa barang terlarang.

### 5. Pencatatan Pelanggaran Siswa

Admin dapat mencatat pelanggaran dengan memilih:

* Nama atau NIS siswa.
* Jenis pelanggaran.
* Tanggal kejadian.
* Waktu kejadian.
* Lokasi kejadian.
* Kronologi kejadian.
* Nama petugas yang mencatat.
* Saksi kejadian.
* Bukti pelanggaran.

Setelah pelanggaran disimpan, sistem secara otomatis menambahkan poin ke total poin siswa.

### 6. Unggah Bukti Pelanggaran

Admin dapat mengunggah bukti berupa:

* Foto kejadian.
* Surat pernyataan.
* Dokumen kesaksian.
* Dokumen pendukung lainnya.

File yang diperbolehkan adalah JPG, JPEG, PNG, dan PDF dengan batas ukuran tertentu.

### 7. Perhitungan Poin Otomatis

Sistem menghitung total poin berdasarkan seluruh pelanggaran yang dilakukan oleh siswa.

Contoh:

* Terlambat: 5 poin.
* Tidak memakai atribut lengkap: 5 poin.
* Membolos: 15 poin.

Jika siswa melakukan ketiga pelanggaran tersebut, total poin siswa menjadi 25 poin.

### 8. Sanksi Otomatis

Sistem memberikan status atau rekomendasi sanksi berdasarkan total poin siswa.

Contoh ketentuan:

* 1–19 poin: Peringatan lisan.
* 20–49 poin: Surat peringatan pertama.
* 50–74 poin: Surat peringatan kedua dan pemanggilan orang tua.
* 75–99 poin: Pembinaan khusus dan pemanggilan orang tua.
* 100 poin atau lebih: Tindakan sesuai peraturan sekolah.

Ketentuan batas poin dan jenis sanksi harus dapat diatur oleh admin.

Ketika siswa mencapai batas poin tertentu, sistem memberikan notifikasi kepada admin dan menampilkan status sanksi pada data siswa.

### 9. Riwayat Pelanggaran

Admin dapat melihat seluruh riwayat pelanggaran siswa yang berisi:

* Tanggal pelanggaran.
* Jenis pelanggaran.
* Kategori.
* Poin.
* Kronologi.
* Bukti pelanggaran.
* Sanksi.
* Status tindak lanjut.

Admin juga dapat memperbarui status tindak lanjut menjadi:

* Belum ditindaklanjuti.
* Sedang diproses.
* Sudah selesai.

### 10. Laporan PDF

Admin dapat membuat dan mengunduh laporan dalam format PDF.

Jenis laporan meliputi:

* Laporan pelanggaran per siswa.
* Laporan pelanggaran per kelas.
* Laporan berdasarkan periode tanggal.
* Laporan berdasarkan kategori pelanggaran.
* Surat peringatan.
* Surat panggilan orang tua.

Laporan siswa memuat:

* Identitas siswa.
* Total poin.
* Riwayat pelanggaran.
* Bukti pelanggaran.
* Sanksi yang diberikan.
* Status tindak lanjut.
* Kolom tanda tangan pihak sekolah dan orang tua.

## Fitur Siswa dan Orang Tua

Siswa atau orang tua tidak perlu membuat akun dan tidak perlu login.

Pada halaman utama tersedia kolom pencarian berdasarkan NIS.

Setelah memasukkan NIS, sistem menampilkan:

* Nama siswa.
* Kelas.
* Total poin pelanggaran.
* Status siswa.
* Riwayat pelanggaran.
* Tanggal pelanggaran.
* Jenis pelanggaran.
* Jumlah poin.
* Sanksi atau tindak lanjut.

Untuk menjaga keamanan data, sebaiknya pencarian tidak hanya menggunakan NIS. Sistem dapat menambahkan verifikasi berupa tanggal lahir, PIN orang tua, atau kode akses khusus.
Alur Sistem
Admin login ke dalam sistem.
Admin memasukkan atau memperbarui data siswa.
Admin mengelola kategori dan jenis pelanggaran.
Ketika terjadi pelanggaran, admin memilih siswa dan jenis pelanggaran.
Admin memasukkan kronologi serta mengunggah bukti.
Sistem menambahkan poin pelanggaran secara otomatis.
Sistem menghitung total poin siswa.
Jika total poin mencapai batas tertentu, sistem memberikan rekomendasi sanksi.
Admin dapat mencetak surat peringatan atau surat panggilan orang tua.
Siswa atau orang tua dapat melihat informasi poin melalui halaman pencarian NIS.