# 🍚 Warung Makan — Website Pemesanan Makanan Online

Website pemesanan makanan untuk warung makan modern. Dibangun 100% dengan
**HTML, CSS, JavaScript murni** (tanpa framework/build tool), **Cloudflare
Workers** sebagai backend, dan **Cloudflare D1** sebagai database. Siap
di-deploy ke **Cloudflare Pages**.

- ✅ Website publik (Home, Menu, Detail Produk, Keranjang, Checkout, Lacak
  Pesanan, Tentang, Kontak)
- ✅ Dashboard Admin terpisah (15 modul: Pesanan, Produk, Kategori, Banner,
  Promo, Voucher, Ongkir, Jam Operasional, Area Pengiriman, Pelanggan,
  Laporan, Pengaturan, Admin)
- ✅ Pembayaran COD (Cash On Delivery) — tanpa login pelanggan
- ✅ Admin login dengan username/password + JWT
- ✅ Lokasi live pelanggan (geolocation) + peta Leaflet/OpenStreetMap (gratis,
  tanpa API key)
- ✅ Ongkos kirim otomatis dari rumus Haversine, diatur per rentang jarak oleh
  admin
- ✅ Upload gambar ke Cloudflare R2 (fallback otomatis ke Base64 jika R2 tidak
  tersedia)

---

## 📁 Struktur Folder

```
/
├── index.html                 Halaman Home
├── menu.html                  Daftar Menu
├── detail-produk.html         Detail Produk
├── keranjang.html             Keranjang Belanja
├── checkout.html              Checkout + lokasi live + peta
├── status-pesanan.html        Lacak Pesanan
├── tentang.html                Tentang Kami
├── kontak.html                 Kontak + peta lokasi warung
├── assets/
│   ├── css/style.css           Style website publik
│   ├── js/api.js               API client (fetch ke Worker)
│   ├── js/cart.js              Manajemen keranjang (localStorage)
│   ├── js/main.js              UI bersama (header/footer dinamis, dsb.)
│   └── images/                 Logo & placeholder
├── admin/
│   ├── index.html               Login admin
│   ├── dashboard.html           Dashboard statistik
│   ├── assets/css/admin.css     Style dashboard admin
│   ├── assets/js/admin-api.js   API client admin (dengan token JWT)
│   ├── assets/js/admin-layout.js Sidebar, topbar, auth guard, toast, modal
│   └── pages/                   15 halaman modul admin (CRUD lengkap)
├── api/
│   ├── worker.js                 Worker utama — semua REST API
│   ├── crypto-utils.js           JWT & hashing password (PBKDF2)
│   └── helpers.js                CORS, validasi, Haversine, dll.
├── schema.sql                    Schema database D1 lengkap + seed data
├── wrangler.toml                 Konfigurasi Worker (D1, R2, secrets)
└── README.md                     Dokumen ini
```

---

## 🧰 Prasyarat

1. Akun [Cloudflare](https://dash.cloudflare.com) (gratis sudah cukup).
2. Node.js terpasang di komputer Anda (untuk menjalankan `wrangler`).
3. Install Wrangler CLI (sekali saja):
   ```bash
   npm install -g wrangler
   ```
4. Login ke akun Cloudflare Anda:
   ```bash
   wrangler login
   ```

---

## 1️⃣ Membuat Database D1

```bash
wrangler d1 create warung_makan_db
```

Perintah ini akan menampilkan output seperti:

```toml
[[d1_databases]]
binding = "DB"
database_name = "warung_makan_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Salin nilai `database_id` tersebut, lalu buka file **`wrangler.toml`** dan
ganti `ISI_DENGAN_DATABASE_ID_ANDA` dengan nilai itu.

### Import schema & data awal

```bash
wrangler d1 execute warung_makan_db --remote --file=./schema.sql
```

Perintah ini membuat seluruh tabel, relasi, index, dan mengisi data awal:
kategori contoh, 7 produk contoh, tarif ongkir contoh, jam operasional, serta
**1 akun admin default**:

| Username | Password  |
|----------|-----------|
| `admin`  | `admin123`|

> ⚠️ **Segera ganti password ini setelah login pertama** melalui menu
> **Pengaturan → Ubah Password Saya** di dashboard admin.

---

## 2️⃣ Membuat R2 Bucket (Opsional, untuk upload gambar)

```bash
wrangler r2 bucket create warung-makan-images
```

Bucket ini otomatis ter-binding lewat `wrangler.toml` (binding `IMAGES`).

> Jika paket akun Cloudflare Anda belum mengaktifkan R2, **lewati langkah
> ini** dan hapus blok `[[r2_buckets]]` di `wrangler.toml`. Sistem upload
> gambar akan otomatis fallback menyimpan gambar sebagai Base64 langsung di
> database — tetap berfungsi penuh tanpa R2.

---

## 3️⃣ Mengatur Secret / Environment Variable

Buka `wrangler.toml`, di bagian `[vars]`, **ganti** nilai `JWT_SECRET` dengan
string acak yang panjang dan rahasia (jangan gunakan nilai contoh saat
produksi). Anda bisa membuat nilai acak dengan:

```bash
openssl rand -hex 32
```

Tempelkan hasilnya ke:

```toml
[vars]
JWT_SECRET = "hasil_random_anda_di_sini"
```

---

## 4️⃣ Deploy Worker (Backend API)

Dari folder root project, jalankan:

```bash
wrangler deploy
```

Setelah sukses, Wrangler akan menampilkan URL Worker Anda, contohnya:

```
https://warung-makan-api.<subdomain-anda>.workers.dev
```

**Salin URL ini** — akan dipakai di langkah berikutnya.

---

## 5️⃣ Menghubungkan Frontend ke Worker

Buka 2 file berikut, dan isi `API_BASE_URL` dengan URL Worker dari langkah
sebelumnya:

**`assets/js/api.js`**
```js
const API_BASE_URL = "https://warung-makan-api.<subdomain-anda>.workers.dev";
```

**`admin/assets/js/admin-api.js`**
```js
const ADMIN_API_BASE = "https://warung-makan-api.<subdomain-anda>.workers.dev";
```

> Jika Anda nanti menghubungkan Worker ke domain kustom yang **sama persis**
> dengan domain Pages Anda (misalnya lewat subdomain `api.namawarung.com`),
> Anda tetap mengisi URL penuh tersebut di atas — bukan path relatif kosong,
> karena Worker dan Pages adalah dua deployment terpisah.

---

## 6️⃣ Deploy Frontend ke Cloudflare Pages

### Opsi A — Lewat Dashboard (termudah)

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Pages** → **Upload assets** (atau **Connect to Git** jika
   proyek ini ada di GitHub/GitLab).
2. Upload seluruh isi folder project ini (root, termasuk `index.html`,
   `admin/`, `assets/`, dll — **kecuali** `api/`, `schema.sql`, dan
   `wrangler.toml` yang khusus untuk Worker).
3. Klik **Deploy**.

### Opsi B — Lewat CLI

```bash
wrangler pages deploy . --project-name=warung-makan
```

Setelah selesai, Anda akan mendapat URL seperti:

```
https://warung-makan.pages.dev
```

Website publik Anda otomatis aktif di URL tersebut, dan dashboard admin bisa
diakses di:

```
https://warung-makan.pages.dev/admin/
```

---

## 7️⃣ Login Admin Pertama Kali

1. Buka `https://<domain-pages-anda>/admin/`
2. Login dengan **username: `admin`**, **password: `admin123`**
3. Segera masuk ke **Pengaturan** untuk:
   - Mengubah nama warung, alamat, WhatsApp, logo
   - Menentukan **titik lokasi warung** di peta (klik peta untuk memindahkan
     marker) — ini menjadi titik acuan perhitungan ongkir & radius
   - Mengaktifkan status **Buka**
4. Masuk ke **Ongkos Kirim** untuk mengatur tarif per rentang jarak.
5. Masuk ke **Area Pengiriman** untuk mengatur radius maksimal pengiriman.
6. Masuk ke **Jam Operasional** untuk mengatur jam buka/tutup tiap hari.
7. Segera ganti password default di **Pengaturan → Ubah Password Saya**.

Setelah itu, tambahkan kategori & produk Anda sendiri lewat menu **Kategori**
dan **Produk** — data contoh bawaan boleh dihapus atau diedit bebas.

---

## 🔐 Keamanan yang Sudah Diterapkan

- **Prepared statements** di semua query D1 (mencegah SQL Injection)
- **Password admin** di-hash dengan **PBKDF2-HMAC-SHA256** (100.000 iterasi) +
  salt unik per akun — bukan plaintext maupun MD5/SHA1
- **JWT** (HS256) untuk sesi admin, dengan verifikasi tambahan lewat tabel
  `admin_sessions` di database (memungkinkan logout paksa / invalidasi token)
- **Sanitasi input** dasar pada semua field teks (strip tag HTML/script) untuk
  mitigasi XSS
- **Rate limiting** dasar per-IP pada Worker (best-effort; untuk proteksi
  lebih kuat, aktifkan **Cloudflare Rate Limiting Rules** gratis di dashboard
  Cloudflare → Security → WAF)
- **CORS** dikonfigurasi di setiap response Worker
- **Validasi ulang harga & stok di server** saat checkout — harga yang
  dikirim dari browser **tidak pernah dipercaya langsung**, selalu dihitung
  ulang dari database
- Upload gambar dibatasi tipe file (`jpg/png/webp/gif`) dan ukuran maksimal
  4MB

---

## 🗺️ Tentang Peta & Lokasi

- Peta menggunakan **Leaflet.js + OpenStreetMap** (gratis, tanpa API key,
  tanpa kuota).
- Reverse geocoding (alamat otomatis dari koordinat) menggunakan
  **Nominatim** (layanan gratis OpenStreetMap). Untuk trafik sangat tinggi,
  pertimbangkan menjalankan instance Nominatim sendiri atau memakai layanan
  geocoding berbayar sesuai kebijakan penggunaan wajar Nominatim.
- Ongkos kirim dihitung dengan **rumus Haversine** (jarak garis lurus antara
  dua koordinat GPS) — dihitung ulang di **server** (Worker), bukan hanya di
  browser, agar tidak bisa dimanipulasi.

---

## 🛠️ Pengembangan Lokal (opsional)

Untuk menjalankan Worker secara lokal saat development:

```bash
wrangler dev
```

Lalu buka file HTML manapun langsung dari file explorer, atau jalankan
server statis sederhana:

```bash
npx serve .
```

Set `API_BASE_URL` sementara ke `http://localhost:8787` saat development
lokal, lalu kembalikan ke URL produksi sebelum deploy.

---

## ❓ Troubleshooting

**"Tidak dapat terhubung ke server"**
→ Pastikan `API_BASE_URL` di `assets/js/api.js` dan `admin/assets/js/admin-api.js`
sudah diisi URL Worker yang benar (bukan string kosong), dan Worker sudah
ter-deploy (`wrangler deploy`).

**Login admin gagal terus / password benar tapi ditolak**
→ Pastikan `schema.sql` sudah di-import ke database **remote** (bukan cuma
lokal): gunakan flag `--remote` seperti pada Langkah 1.

**Upload gambar gagal**
→ Jika R2 belum dikonfigurasi, sistem otomatis fallback ke Base64 — cek
Console browser (F12) untuk pesan error detail. Pastikan ukuran file di bawah
4MB.

**Lokasi pelanggan tidak terdeteksi di checkout**
→ Fitur geolokasi butuh koneksi **HTTPS** (kecuali di `localhost`). Pastikan
domain Cloudflare Pages Anda diakses lewat `https://`.

**Ongkir selalu ditolak "di luar jangkauan"**
→ Cek titik lokasi warung di **Pengaturan** dan radius di **Area Pengiriman**
sudah benar sesuai posisi warung Anda yang sebenarnya.

---

## 📄 Lisensi

Proyek ini dibuat khusus untuk kebutuhan Anda — bebas dimodifikasi dan
digunakan sesuai kebutuhan bisnis warung makan Anda.
