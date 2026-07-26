-- ==========================================================
-- SCHEMA DATABASE - WARUNG MAKAN ONLINE
-- Cloudflare D1 (SQLite)
-- ==========================================================

PRAGMA foreign_keys = ON;

-- ==========================================================
-- TABEL ADMIN
-- ==========================================================
DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- admin, super_admin
    aktif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL PENGATURAN WEBSITE (single row settings)
-- ==========================================================
DROP TABLE IF EXISTS pengaturan;
CREATE TABLE pengaturan (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nama_warung TEXT NOT NULL DEFAULT 'Warung Makan',
    logo_url TEXT,
    favicon_url TEXT,
    alamat TEXT,
    whatsapp TEXT,
    instagram TEXT,
    facebook TEXT,
    latitude REAL NOT NULL DEFAULT 0,
    longitude REAL NOT NULL DEFAULT 0,
    minimal_order INTEGER NOT NULL DEFAULT 0,
    radius_maksimal_km REAL NOT NULL DEFAULT 10,
    status_buka INTEGER NOT NULL DEFAULT 1,
    deskripsi_singkat TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL JAM OPERASIONAL
-- ==========================================================
DROP TABLE IF EXISTS jam_operasional;
CREATE TABLE jam_operasional (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hari INTEGER NOT NULL, -- 0=Minggu ... 6=Sabtu
    jam_buka TEXT NOT NULL DEFAULT '08:00',
    jam_tutup TEXT NOT NULL DEFAULT '21:00',
    libur INTEGER NOT NULL DEFAULT 0,
    UNIQUE(hari)
);

-- ==========================================================
-- TABEL KATEGORI
-- ==========================================================
DROP TABLE IF EXISTS kategori;
CREATE TABLE kategori (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    urutan INTEGER NOT NULL DEFAULT 0,
    aktif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL PRODUK
-- ==========================================================
DROP TABLE IF EXISTS produk;
CREATE TABLE produk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategori_id INTEGER NOT NULL,
    nama TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    foto_url TEXT,
    harga INTEGER NOT NULL DEFAULT 0,
    harga_coret INTEGER NOT NULL DEFAULT 0,
    diskon_persen INTEGER NOT NULL DEFAULT 0,
    deskripsi TEXT,
    stok INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'aktif', -- aktif, nonaktif, habis
    best_seller INTEGER NOT NULL DEFAULT 0,
    produk_baru INTEGER NOT NULL DEFAULT 0,
    estimasi_masak_menit INTEGER NOT NULL DEFAULT 15,
    terjual INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE RESTRICT
);

-- ==========================================================
-- TABEL BANNER
-- ==========================================================
DROP TABLE IF EXISTS banner;
CREATE TABLE banner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT,
    gambar_url TEXT NOT NULL,
    link_url TEXT,
    urutan INTEGER NOT NULL DEFAULT 0,
    aktif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL PROMO
-- ==========================================================
DROP TABLE IF EXISTS promo;
CREATE TABLE promo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    deskripsi TEXT,
    gambar_url TEXT,
    tanggal_mulai TEXT NOT NULL,
    tanggal_selesai TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aktif', -- aktif, nonaktif
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL VOUCHER
-- ==========================================================
DROP TABLE IF EXISTS voucher;
CREATE TABLE voucher (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT NOT NULL UNIQUE,
    tipe TEXT NOT NULL, -- persentase, nominal
    nilai INTEGER NOT NULL,
    minimal_belanja INTEGER NOT NULL DEFAULT 0,
    maksimal_potongan INTEGER NOT NULL DEFAULT 0,
    kuota INTEGER NOT NULL DEFAULT 0,
    terpakai INTEGER NOT NULL DEFAULT 0,
    tanggal_kadaluarsa TEXT NOT NULL,
    aktif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL TARIF ONGKIR (berdasarkan jarak)
-- ==========================================================
DROP TABLE IF EXISTS tarif_ongkir;
CREATE TABLE tarif_ongkir (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jarak_dari_km REAL NOT NULL,
    jarak_sampai_km REAL NOT NULL,
    tarif INTEGER NOT NULL,
    urutan INTEGER NOT NULL DEFAULT 0
);

-- ==========================================================
-- TABEL PELANGGAN (tanpa login, tercatat dari checkout)
-- ==========================================================
DROP TABLE IF EXISTS pelanggan;
CREATE TABLE pelanggan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    whatsapp TEXT NOT NULL UNIQUE,
    alamat_terakhir TEXT,
    total_pesanan INTEGER NOT NULL DEFAULT 0,
    total_belanja INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================================
-- TABEL PESANAN
-- ==========================================================
DROP TABLE IF EXISTS pesanan;
CREATE TABLE pesanan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_pesanan TEXT NOT NULL UNIQUE, -- WM-2026-000001
    pelanggan_id INTEGER,
    nama TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    alamat TEXT NOT NULL,
    patokan TEXT,
    catatan TEXT,
    latitude REAL,
    longitude REAL,
    akurasi_meter REAL,
    jarak_km REAL NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL DEFAULT 0,
    ongkir INTEGER NOT NULL DEFAULT 0,
    diskon_voucher INTEGER NOT NULL DEFAULT 0,
    voucher_kode TEXT,
    total INTEGER NOT NULL DEFAULT 0,
    metode_bayar TEXT NOT NULL DEFAULT 'COD',
    status TEXT NOT NULL DEFAULT 'menunggu',
    -- status: menunggu, diproses, dimasak, siap_diantar, diantar, selesai, dibatalkan
    alasan_batal TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id) ON DELETE SET NULL
);

-- ==========================================================
-- TABEL DETAIL PESANAN (item per pesanan)
-- ==========================================================
DROP TABLE IF EXISTS pesanan_item;
CREATE TABLE pesanan_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pesanan_id INTEGER NOT NULL,
    produk_id INTEGER,
    nama_produk TEXT NOT NULL,
    harga_satuan INTEGER NOT NULL,
    jumlah INTEGER NOT NULL,
    catatan TEXT,
    subtotal INTEGER NOT NULL,
    FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE CASCADE,
    FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE SET NULL
);

-- ==========================================================
-- TABEL RIWAYAT STATUS PESANAN
-- ==========================================================
DROP TABLE IF EXISTS pesanan_status_log;
CREATE TABLE pesanan_status_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pesanan_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    keterangan TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE CASCADE
);

-- ==========================================================
-- TABEL SESSION LOGIN ADMIN (untuk pelacakan/invalidasi token)
-- ==========================================================
DROP TABLE IF EXISTS admin_sessions;
CREATE TABLE admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- ==========================================================
-- INDEXES
-- ==========================================================
CREATE INDEX idx_produk_kategori ON produk(kategori_id);
CREATE INDEX idx_produk_status ON produk(status);
CREATE INDEX idx_pesanan_status ON pesanan(status);
CREATE INDEX idx_pesanan_created ON pesanan(created_at);
CREATE INDEX idx_pesanan_item_pesanan ON pesanan_item(pesanan_id);
CREATE INDEX idx_pelanggan_whatsapp ON pelanggan(whatsapp);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token_hash);

-- ==========================================================
-- SEED DATA AWAL
-- ==========================================================

-- Admin default (username: admin, password: admin123)
-- Format hash: {saltHex}:{pbkdf2Hex}  (PBKDF2-HMAC-SHA256, 100000 iterasi, 32 byte)
-- PENTING: setelah login pertama, segera ganti password melalui menu Pengaturan > Admin.
INSERT INTO admins (username, password_hash, nama_lengkap, role, aktif)
VALUES ('admin', '63d9d77c519428cd4786f6726f24b0d0:49397ac7b9147dc3f368325caccc902bd4442c5af3096ad9cb8b37f22381fd7b', 'Administrator', 'super_admin', 1);

INSERT INTO pengaturan (id, nama_warung, alamat, whatsapp, latitude, longitude, minimal_order, radius_maksimal_km, status_buka, deskripsi_singkat)
VALUES (1, 'Warung Makan Nusantara', 'Jl. Merdeka No. 10, Jakarta', '628123456789', -6.200000, 106.816666, 15000, 10, 1, 'Masakan rumahan lezat, diantar hangat ke rumah Anda.');

INSERT INTO jam_operasional (hari, jam_buka, jam_tutup, libur) VALUES
(0, '09:00', '21:00', 0),
(1, '08:00', '21:00', 0),
(2, '08:00', '21:00', 0),
(3, '08:00', '21:00', 0),
(4, '08:00', '21:00', 0),
(5, '08:00', '22:00', 0),
(6, '08:00', '22:00', 0);

INSERT INTO kategori (nama, slug, icon, urutan, aktif) VALUES
('Makanan Utama', 'makanan-utama', 'utensils', 1, 1),
('Minuman', 'minuman', 'cup-soda', 2, 1),
('Cemilan', 'cemilan', 'cookie', 3, 1),
('Paket Hemat', 'paket-hemat', 'package', 4, 1);

INSERT INTO produk (kategori_id, nama, slug, harga, harga_coret, diskon_persen, deskripsi, stok, status, best_seller, produk_baru, estimasi_masak_menit) VALUES
(1, 'Ayam Geprek Sambal Bawang', 'ayam-geprek-sambal-bawang', 18000, 20000, 10, 'Ayam goreng crispy digeprek dengan sambal bawang pedas khas, disajikan dengan nasi hangat.', 25, 'aktif', 1, 0, 15),
(1, 'Nasi Goreng Spesial', 'nasi-goreng-spesial', 20000, 0, 0, 'Nasi goreng dengan telur, ayam suwir, dan acar segar.', 30, 'aktif', 1, 0, 12),
(1, 'Soto Ayam Kampung', 'soto-ayam-kampung', 17000, 0, 0, 'Soto ayam kampung dengan kuah bening gurih dan soun.', 20, 'aktif', 0, 1, 15),
(2, 'Es Teh Manis', 'es-teh-manis', 5000, 0, 0, 'Es teh manis segar.', 50, 'aktif', 0, 0, 3),
(2, 'Es Jeruk Peras', 'es-jeruk-peras', 8000, 0, 0, 'Jeruk peras asli tanpa pengawet.', 40, 'aktif', 0, 0, 3),
(3, 'Tahu Crispy', 'tahu-crispy', 10000, 0, 0, 'Tahu goreng crispy dengan bumbu spesial.', 25, 'aktif', 0, 0, 8),
(4, 'Paket Hemat Geprek + Es Teh', 'paket-hemat-geprek-es-teh', 21000, 25000, 16, 'Ayam Geprek + Es Teh Manis dengan harga hemat.', 15, 'aktif', 1, 1, 15);

INSERT INTO tarif_ongkir (jarak_dari_km, jarak_sampai_km, tarif, urutan) VALUES
(0, 1, 5000, 1),
(1, 3, 8000, 2),
(3, 5, 12000, 3),
(5, 7, 15000, 4),
(7, 10, 20000, 5);
