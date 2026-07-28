// ==========================================================
// WARUNG MAKAN - CLOUDFLARE WORKER API
// REST API lengkap untuk website publik & dashboard admin
// Database: Cloudflare D1 | Storage: Cloudflare R2
// ==========================================================
import { hashPassword, verifyPassword, signJWT } from "./crypto-utils.js";
import {
  corsHeaders,
  json,
  errorResponse,
  successResponse,
  sanitizeString,
  toInt,
  toFloat,
  requireAdmin,
  sha256Hex,
  checkRateLimit,
  haversineDistanceKm,
  generateNomorPesanan,
  slugify,
} from "./helpers.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get("Origin") || "*";
    const headers = corsHeaders(origin);

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // Rate limit dasar berbasis IP (best-effort per isolate)
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!checkRateLimit(`${clientIp}:${path}`, 60, 60000)) {
      return errorResponse("Terlalu banyak permintaan, coba lagi sebentar lagi.", 429, headers);
    }

    try {
      let response;

      // ============ PUBLIC ROUTES ============
      if (path === "/api/settings" && method === "GET") {
        response = await getSettings(env);
      } else if (path === "/api/operating-hours" && method === "GET") {
        response = await getOperatingHours(env);
      } else if (path === "/api/categories" && method === "GET") {
        response = await getCategoriesPublic(env);
      } else if (path === "/api/products" && method === "GET") {
        response = await getProductsPublic(env, url);
      } else if (path.startsWith("/api/products/") && method === "GET") {
        const slug = path.split("/api/products/")[1];
        response = await getProductBySlug(env, slug);
      } else if (path === "/api/banners" && method === "GET") {
        response = await getBannersPublic(env);
      } else if (path === "/api/promos" && method === "GET") {
        response = await getPromosPublic(env);
      } else if (path === "/api/shipping/calculate" && method === "POST") {
        response = await calculateShipping(request, env);
      } else if (path === "/api/voucher/validate" && method === "POST") {
        response = await validateVoucher(request, env);
      } else if (path === "/api/orders" && method === "POST") {
        response = await createOrder(request, env);
      } else if (path.startsWith("/api/orders/track/") && method === "GET") {
        const nomor = decodeURIComponent(path.split("/api/orders/track/")[1]);
        response = await trackOrder(env, nomor);
      }

      // ============ ADMIN AUTH ============
      else if (path === "/api/admin/login" && method === "POST") {
        response = await adminLogin(request, env);
      } else if (path === "/api/admin/logout" && method === "POST") {
        response = await adminLogout(request, env);
      } else if (path === "/api/admin/me" && method === "GET") {
        response = await adminMe(request, env);
      }

      // ============ ADMIN: DASHBOARD ============
      else if (path === "/api/admin/dashboard" && method === "GET") {
        response = await withAuth(request, env, adminDashboard);
      }

      // ============ ADMIN: PESANAN ============
      else if (path === "/api/admin/orders" && method === "GET") {
        response = await withAuth(request, env, (env, req) => adminListOrders(env, url));
      } else if (path.match(/^\/api\/admin\/orders\/\d+$/) && method === "GET") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminGetOrder(env, id));
      } else if (path.match(/^\/api\/admin\/orders\/\d+\/status$/) && method === "PUT") {
        const id = toInt(path.split("/")[4]);
        response = await withAuth(request, env, () => adminUpdateOrderStatus(request, env, id));
      }

      // ============ ADMIN: KATEGORI ============
      else if (path === "/api/admin/categories" && method === "GET") {
        response = await withAuth(request, env, () => adminListCategories(env));
      } else if (path === "/api/admin/categories" && method === "POST") {
        response = await withAuth(request, env, () => adminCreateCategory(request, env));
      } else if (path.match(/^\/api\/admin\/categories\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdateCategory(request, env, id));
      } else if (path.match(/^\/api\/admin\/categories\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminDeleteCategory(env, id));
      }

      // ============ ADMIN: PRODUK ============
      else if (path === "/api/admin/products" && method === "GET") {
        response = await withAuth(request, env, () => adminListProducts(env, url));
      } else if (path === "/api/admin/products" && method === "POST") {
        response = await withAuth(request, env, () => adminCreateProduct(request, env));
      } else if (path.match(/^\/api\/admin\/products\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdateProduct(request, env, id));
      } else if (path.match(/^\/api\/admin\/products\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminDeleteProduct(env, id));
      }

      // ============ ADMIN: BANNER ============
      else if (path === "/api/admin/banners" && method === "GET") {
        response = await withAuth(request, env, () => adminListBanners(env));
      } else if (path === "/api/admin/banners" && method === "POST") {
        response = await withAuth(request, env, () => adminCreateBanner(request, env));
      } else if (path.match(/^\/api\/admin\/banners\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdateBanner(request, env, id));
      } else if (path.match(/^\/api\/admin\/banners\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminDeleteBanner(env, id));
      }

      // ============ ADMIN: PROMO ============
      else if (path === "/api/admin/promos" && method === "GET") {
        response = await withAuth(request, env, () => adminListPromos(env));
      } else if (path === "/api/admin/promos" && method === "POST") {
        response = await withAuth(request, env, () => adminCreatePromo(request, env));
      } else if (path.match(/^\/api\/admin\/promos\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdatePromo(request, env, id));
      } else if (path.match(/^\/api\/admin\/promos\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminDeletePromo(env, id));
      }

      // ============ ADMIN: VOUCHER ============
      else if (path === "/api/admin/vouchers" && method === "GET") {
        response = await withAuth(request, env, () => adminListVouchers(env));
      } else if (path === "/api/admin/vouchers" && method === "POST") {
        response = await withAuth(request, env, () => adminCreateVoucher(request, env));
      } else if (path.match(/^\/api\/admin\/vouchers\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdateVoucher(request, env, id));
      } else if (path.match(/^\/api\/admin\/vouchers\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminDeleteVoucher(env, id));
      }

      // ============ ADMIN: ONGKIR ============
      else if (path === "/api/admin/shipping-rates" && method === "GET") {
        response = await withAuth(request, env, () => adminListShippingRates(env));
      } else if (path === "/api/admin/shipping-rates" && method === "POST") {
        response = await withAuth(request, env, () => adminCreateShippingRate(request, env));
      } else if (path.match(/^\/api\/admin\/shipping-rates\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdateShippingRate(request, env, id));
      } else if (path.match(/^\/api\/admin\/shipping-rates\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminDeleteShippingRate(env, id));
      }

      // ============ ADMIN: JAM OPERASIONAL ============
      else if (path === "/api/admin/operating-hours" && method === "GET") {
        response = await withAuth(request, env, () => adminListOperatingHours(env));
      } else if (path.match(/^\/api\/admin\/operating-hours\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, () => adminUpdateOperatingHour(request, env, id));
      }

      // ============ ADMIN: PELANGGAN ============
      else if (path === "/api/admin/customers" && method === "GET") {
        response = await withAuth(request, env, () => adminListCustomers(env, url));
      }

      // ============ ADMIN: LAPORAN ============
      else if (path === "/api/admin/reports" && method === "GET") {
        response = await withAuth(request, env, () => adminReports(env, url));
      }

      // ============ ADMIN: PENGATURAN ============
      else if (path === "/api/admin/settings" && method === "GET") {
        response = await withAuth(request, env, () => getSettings(env));
      } else if (path === "/api/admin/settings" && method === "PUT") {
        response = await withAuth(request, env, () => adminUpdateSettings(request, env));
      }

      // ============ ADMIN: AREA PENGIRIMAN (radius) ============
      else if (path === "/api/admin/delivery-area" && method === "PUT") {
        response = await withAuth(request, env, () => adminUpdateDeliveryArea(request, env));
      }

      // ============ ADMIN: MANAJEMEN ADMIN ============
      else if (path === "/api/admin/admins" && method === "GET") {
        response = await withAuth(request, env, (env, admin) => adminListAdmins(env, admin));
      } else if (path === "/api/admin/admins" && method === "POST") {
        response = await withAuth(request, env, (env, admin) => adminCreateAdmin(request, env, admin));
      } else if (path.match(/^\/api\/admin\/admins\/\d+$/) && method === "PUT") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, (env, admin) => adminUpdateAdmin(request, env, admin, id));
      } else if (path.match(/^\/api\/admin\/admins\/\d+$/) && method === "DELETE") {
        const id = toInt(path.split("/").pop());
        response = await withAuth(request, env, (env, admin) => adminDeleteAdmin(env, admin, id));
      } else if (path === "/api/admin/change-password" && method === "PUT") {
        response = await withAuth(request, env, (env, admin) => adminChangePassword(request, env, admin));
      }

      // ============ UPLOAD GAMBAR (R2 / Base64 fallback) ============
      else if (path === "/api/admin/upload" && method === "POST") {
        response = await withAuth(request, env, () => adminUploadImage(request, env));
      } else if (path.startsWith("/api/images/") && method === "GET") {
        response = await serveImage(env, path.split("/api/images/")[1]);
      }

      else {
        response = errorResponse("Endpoint tidak ditemukan.", 404);
      }

      // Salin header CORS ke response akhir
      const finalHeaders = new Headers(response.headers);
      Object.entries(headers).forEach(([k, v]) => finalHeaders.set(k, v));
      return new Response(response.body, { status: response.status, headers: finalHeaders });
    } catch (err) {
      const errHeaders = new Headers(headers);
      errHeaders.set("Content-Type", "application/json; charset=utf-8");
      return new Response(
        JSON.stringify({ success: false, error: "Kesalahan server: " + err.message }),
        { status: 500, headers: errHeaders }
      );
    }
  },
};

// ==========================================================
// AUTH WRAPPER
// ==========================================================
async function withAuth(request, env, handler) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  return handler(env, auth.admin, request);
}

// ==========================================================
// ADMIN AUTH HANDLERS
// ==========================================================
async function adminLogin(request, env) {
  const body = await safeJson(request);
  const username = sanitizeString(body.username, 100);
  const password = String(body.password || "");

  if (!username || !password) return errorResponse("Username dan password wajib diisi.", 400);

  const admin = await env.DB.prepare("SELECT * FROM admins WHERE username = ? AND aktif = 1")
    .bind(username)
    .first();

  if (!admin) return errorResponse("Username atau password salah.", 401);

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) return errorResponse("Username atau password salah.", 401);

  const token = await signJWT(
    { sub: admin.id, username: admin.username, role: admin.role, nama: admin.nama_lengkap },
    env.JWT_SECRET,
    86400 // 24 jam
  );

  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

  await env.DB.prepare(
    "INSERT INTO admin_sessions (admin_id, token_hash, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    admin.id,
    tokenHash,
    request.headers.get("User-Agent") || "",
    request.headers.get("CF-Connecting-IP") || "",
    expiresAt
  ).run();

  return successResponse({
    token,
    admin: { id: admin.id, username: admin.username, nama_lengkap: admin.nama_lengkap, role: admin.role },
  });
}

async function adminLogout(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token) return successResponse({ message: "Logout." });

  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
  return successResponse({ message: "Berhasil logout." });
}

async function adminMe(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const admin = await env.DB.prepare("SELECT id, username, nama_lengkap, role FROM admins WHERE id = ?")
    .bind(auth.admin.sub)
    .first();
  return successResponse(admin);
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export { withAuth, safeJson };

// ==========================================================
// PUBLIC: PENGATURAN & JAM OPERASIONAL
// ==========================================================
async function getSettings(env) {
  const settings = await env.DB.prepare("SELECT * FROM pengaturan WHERE id = 1").first();
  if (!settings) return errorResponse("Pengaturan belum tersedia.", 404);
  return successResponse(settings);
}

async function getOperatingHours(env) {
  const { results } = await env.DB.prepare("SELECT * FROM jam_operasional ORDER BY hari ASC").all();
  return successResponse(results);
}

// ==========================================================
// PUBLIC: KATEGORI
// ==========================================================
async function getCategoriesPublic(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, nama, slug, icon, urutan FROM kategori WHERE aktif = 1 ORDER BY urutan ASC, nama ASC"
  ).all();
  return successResponse(results);
}

// ==========================================================
// PUBLIC: PRODUK
// ==========================================================
async function getProductsPublic(env, url) {
  const kategoriSlug = url.searchParams.get("kategori");
  const search = url.searchParams.get("q");
  const bestSeller = url.searchParams.get("best_seller");
  const produkBaru = url.searchParams.get("baru");
  const limit = Math.min(toInt(url.searchParams.get("limit"), 100), 200);

  let query = `
    SELECT p.*, k.nama as kategori_nama, k.slug as kategori_slug
    FROM produk p
    JOIN kategori k ON p.kategori_id = k.id
    WHERE p.status != 'nonaktif'
  `;
  const params = [];

  if (kategoriSlug) {
    query += " AND k.slug = ?";
    params.push(kategoriSlug);
  }
  if (search) {
    query += " AND (p.nama LIKE ? OR p.deskripsi LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (bestSeller === "1") {
    query += " AND p.best_seller = 1";
  }
  if (produkBaru === "1") {
    query += " AND p.produk_baru = 1";
  }

  query += " ORDER BY p.best_seller DESC, p.terjual DESC, p.created_at DESC LIMIT ?";
  params.push(limit);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return successResponse(results);
}

async function getProductBySlug(env, slug) {
  const produk = await env.DB.prepare(
    `SELECT p.*, k.nama as kategori_nama, k.slug as kategori_slug
     FROM produk p JOIN kategori k ON p.kategori_id = k.id
     WHERE p.slug = ? AND p.status != 'nonaktif'`
  ).bind(slug).first();

  if (!produk) return errorResponse("Produk tidak ditemukan.", 404);
  return successResponse(produk);
}

// ==========================================================
// PUBLIC: BANNER & PROMO
// ==========================================================
async function getBannersPublic(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, judul, gambar_url, link_url FROM banner WHERE aktif = 1 ORDER BY urutan ASC"
  ).all();
  return successResponse(results);
}

async function getPromosPublic(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM promo WHERE status = 'aktif'
     AND date('now') BETWEEN date(tanggal_mulai) AND date(tanggal_selesai)
     ORDER BY created_at DESC`
  ).all();
  return successResponse(results);
}

// ==========================================================
// PUBLIC: HITUNG ONGKIR (Haversine)
// ==========================================================
async function calculateShipping(request, env) {
  const body = await safeJson(request);
  const lat = toFloat(body.latitude, null);
  const lng = toFloat(body.longitude, null);

  if (lat === null || lng === null || (lat === 0 && lng === 0)) {
    return errorResponse("Koordinat lokasi tidak valid.", 400);
  }

  const settings = await env.DB.prepare("SELECT * FROM pengaturan WHERE id = 1").first();
  if (!settings) return errorResponse("Pengaturan warung belum tersedia.", 500);

  const distanceKm = haversineDistanceKm(settings.latitude, settings.longitude, lat, lng);

  if (distanceKm > settings.radius_maksimal_km) {
    return errorResponse(
      `Maaf, lokasi Anda (${distanceKm.toFixed(1)} km) berada di luar jangkauan pengiriman kami (maks ${settings.radius_maksimal_km} km).`,
      422
    );
  }

  const { results: tarifList } = await env.DB.prepare(
    "SELECT * FROM tarif_ongkir ORDER BY jarak_dari_km ASC"
  ).all();

  let ongkir = null;
  for (const tarif of tarifList) {
    if (distanceKm >= tarif.jarak_dari_km && distanceKm <= tarif.jarak_sampai_km) {
      ongkir = tarif.tarif;
      break;
    }
  }
  if (ongkir === null && tarifList.length > 0) {
    ongkir = tarifList[tarifList.length - 1].tarif;
  }
  if (ongkir === null) return errorResponse("Tarif ongkir belum diatur oleh admin.", 500);

  return successResponse({
    jarak_km: Math.round(distanceKm * 100) / 100,
    ongkir,
    dalam_jangkauan: true,
  });
}

// ==========================================================
// PUBLIC: VALIDASI VOUCHER
// ==========================================================
async function validateVoucher(request, env) {
  const body = await safeJson(request);
  const kode = sanitizeString(body.kode, 50).toUpperCase();
  const subtotal = toInt(body.subtotal, 0);

  if (!kode) return errorResponse("Kode voucher wajib diisi.", 400);

  const voucher = await env.DB.prepare(
    "SELECT * FROM voucher WHERE UPPER(kode) = ? AND aktif = 1"
  ).bind(kode).first();

  if (!voucher) return errorResponse("Kode voucher tidak ditemukan atau tidak aktif.", 404);

  if (new Date(voucher.tanggal_kadaluarsa) < new Date()) {
    return errorResponse("Voucher sudah kedaluwarsa.", 422);
  }
  if (voucher.kuota > 0 && voucher.terpakai >= voucher.kuota) {
    return errorResponse("Kuota voucher sudah habis.", 422);
  }
  if (subtotal < voucher.minimal_belanja) {
    return errorResponse(`Minimal belanja Rp${voucher.minimal_belanja.toLocaleString("id-ID")} untuk voucher ini.`, 422);
  }

  let potongan = 0;
  if (voucher.tipe === "persentase") {
    potongan = Math.floor((subtotal * voucher.nilai) / 100);
    if (voucher.maksimal_potongan > 0 && potongan > voucher.maksimal_potongan) {
      potongan = voucher.maksimal_potongan;
    }
  } else {
    potongan = voucher.nilai;
  }
  if (potongan > subtotal) potongan = subtotal;

  return successResponse({ kode: voucher.kode, tipe: voucher.tipe, nilai: voucher.nilai, potongan });
}

// ==========================================================
// PUBLIC: BUAT PESANAN (CHECKOUT)
// ==========================================================
async function createOrder(request, env) {
  const body = await safeJson(request);

  const nama = sanitizeString(body.nama, 100);
  const whatsapp = sanitizeString(body.whatsapp, 20).replace(/[^\d+]/g, "");
  const alamat = sanitizeString(body.alamat, 500);
  const patokan = sanitizeString(body.patokan, 300);
  const catatan = sanitizeString(body.catatan, 500);
  const latitude = toFloat(body.latitude, null);
  const longitude = toFloat(body.longitude, null);
  const akurasi = toFloat(body.akurasi_meter, 0);
  const items = Array.isArray(body.items) ? body.items : [];
  const voucherKode = body.voucher_kode ? sanitizeString(body.voucher_kode, 50).toUpperCase() : null;

  if (!nama || !whatsapp || !alamat) {
    return errorResponse("Nama, nomor WhatsApp, dan alamat wajib diisi.", 400);
  }
  if (whatsapp.length < 9 || whatsapp.length > 15) {
    return errorResponse("Nomor WhatsApp tidak valid.", 400);
  }
  if (items.length === 0) {
    return errorResponse("Keranjang kosong.", 400);
  }
  if (latitude === null || longitude === null) {
    return errorResponse("Lokasi pengiriman wajib dilacak terlebih dahulu.", 400);
  }

  const settings = await env.DB.prepare("SELECT * FROM pengaturan WHERE id = 1").first();
  if (!settings) return errorResponse("Pengaturan warung belum tersedia.", 500);
  if (settings.status_buka !== 1) {
    return errorResponse("Maaf, warung sedang tutup. Silakan pesan saat jam operasional.", 422);
  }

  let subtotal = 0;
  const validatedItems = [];
  for (const item of items) {
    const produkId = toInt(item.produk_id, 0);
    const jumlah = toInt(item.jumlah, 0);
    if (produkId <= 0 || jumlah <= 0) continue;

    const produk = await env.DB.prepare("SELECT * FROM produk WHERE id = ? AND status = 'aktif'").bind(produkId).first();
    if (!produk) return errorResponse(`Produk tidak ditemukan atau tidak tersedia.`, 422);
    if (produk.stok < jumlah) return errorResponse(`Stok "${produk.nama}" tidak mencukupi (tersisa ${produk.stok}).`, 422);

    const hargaSatuan = produk.harga;
    const itemSubtotal = hargaSatuan * jumlah;
    subtotal += itemSubtotal;

    validatedItems.push({
      produk_id: produk.id,
      nama_produk: produk.nama,
      harga_satuan: hargaSatuan,
      jumlah,
      catatan: sanitizeString(item.catatan || "", 200),
      subtotal: itemSubtotal,
    });
  }

  if (validatedItems.length === 0) return errorResponse("Tidak ada item valid dalam pesanan.", 400);

  if (settings.minimal_order > 0 && subtotal < settings.minimal_order) {
    return errorResponse(`Minimal order Rp${settings.minimal_order.toLocaleString("id-ID")}.`, 422);
  }

  const distanceKm = haversineDistanceKm(settings.latitude, settings.longitude, latitude, longitude);
  if (distanceKm > settings.radius_maksimal_km) {
    return errorResponse(`Lokasi Anda (${distanceKm.toFixed(1)} km) di luar jangkauan pengiriman.`, 422);
  }

  const { results: tarifList } = await env.DB.prepare("SELECT * FROM tarif_ongkir ORDER BY jarak_dari_km ASC").all();
  let ongkir = tarifList.length > 0 ? tarifList[tarifList.length - 1].tarif : 0;
  for (const tarif of tarifList) {
    if (distanceKm >= tarif.jarak_dari_km && distanceKm <= tarif.jarak_sampai_km) {
      ongkir = tarif.tarif;
      break;
    }
  }

  let diskonVoucher = 0;
  let voucherValid = null;
  if (voucherKode) {
    const voucher = await env.DB.prepare("SELECT * FROM voucher WHERE UPPER(kode) = ? AND aktif = 1").bind(voucherKode).first();
    if (voucher && new Date(voucher.tanggal_kadaluarsa) >= new Date() &&
        (voucher.kuota === 0 || voucher.terpakai < voucher.kuota) &&
        subtotal >= voucher.minimal_belanja) {
      if (voucher.tipe === "persentase") {
        diskonVoucher = Math.floor((subtotal * voucher.nilai) / 100);
        if (voucher.maksimal_potongan > 0 && diskonVoucher > voucher.maksimal_potongan) {
          diskonVoucher = voucher.maksimal_potongan;
        }
      } else {
        diskonVoucher = voucher.nilai;
      }
      if (diskonVoucher > subtotal) diskonVoucher = subtotal;
      voucherValid = voucher;
    }
  }

  const total = subtotal + ongkir - diskonVoucher;
  const nomorPesanan = await generateNomorPesanan(env.DB);

  let pelanggan = await env.DB.prepare("SELECT * FROM pelanggan WHERE whatsapp = ?").bind(whatsapp).first();
  if (pelanggan) {
    await env.DB.prepare(
      "UPDATE pelanggan SET nama = ?, alamat_terakhir = ?, total_pesanan = total_pesanan + 1, total_belanja = total_belanja + ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(nama, alamat, total, pelanggan.id).run();
  } else {
    const result = await env.DB.prepare(
      "INSERT INTO pelanggan (nama, whatsapp, alamat_terakhir, total_pesanan, total_belanja) VALUES (?, ?, ?, 1, ?)"
    ).bind(nama, whatsapp, alamat, total).run();
    pelanggan = { id: result.meta.last_row_id };
  }

  const orderResult = await env.DB.prepare(
    `INSERT INTO pesanan
     (nomor_pesanan, pelanggan_id, nama, whatsapp, alamat, patokan, catatan, latitude, longitude, akurasi_meter,
      jarak_km, subtotal, ongkir, diskon_voucher, voucher_kode, total, metode_bayar, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COD', 'menunggu')`
  ).bind(
    nomorPesanan, pelanggan.id, nama, whatsapp, alamat, patokan, catatan,
    latitude, longitude, akurasi, Math.round(distanceKm * 100) / 100,
    subtotal, ongkir, diskonVoucher, voucherValid ? voucherValid.kode : null, total
  ).run();

  const pesananId = orderResult.meta.last_row_id;

  for (const item of validatedItems) {
    await env.DB.prepare(
      "INSERT INTO pesanan_item (pesanan_id, produk_id, nama_produk, harga_satuan, jumlah, catatan, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(pesananId, item.produk_id, item.nama_produk, item.harga_satuan, item.jumlah, item.catatan, item.subtotal).run();

    await env.DB.prepare("UPDATE produk SET stok = stok - ?, terjual = terjual + ? WHERE id = ?")
      .bind(item.jumlah, item.jumlah, item.produk_id).run();
  }

  if (voucherValid) {
    await env.DB.prepare("UPDATE voucher SET terpakai = terpakai + 1 WHERE id = ?").bind(voucherValid.id).run();
  }

  await env.DB.prepare("INSERT INTO pesanan_status_log (pesanan_id, status, keterangan) VALUES (?, 'menunggu', 'Pesanan dibuat oleh pelanggan')")
    .bind(pesananId).run();

  return successResponse({
    nomor_pesanan: nomorPesanan,
    subtotal,
    ongkir,
    diskon_voucher: diskonVoucher,
    total,
    jarak_km: Math.round(distanceKm * 100) / 100,
  });
}

// ==========================================================
// PUBLIC: LACAK PESANAN
// ==========================================================
async function trackOrder(env, nomor) {
  const pesanan = await env.DB.prepare("SELECT * FROM pesanan WHERE nomor_pesanan = ?").bind(nomor).first();
  if (!pesanan) return errorResponse("Pesanan tidak ditemukan.", 404);

  const { results: items } = await env.DB.prepare("SELECT * FROM pesanan_item WHERE pesanan_id = ?").bind(pesanan.id).all();
  const { results: logs } = await env.DB.prepare("SELECT * FROM pesanan_status_log WHERE pesanan_id = ? ORDER BY created_at ASC").bind(pesanan.id).all();
  const settings = await env.DB.prepare("SELECT nama_warung, latitude, longitude, alamat, whatsapp FROM pengaturan WHERE id = 1").first();

  return successResponse({ pesanan, items, logs, warung: settings });
}

// ==========================================================
// ADMIN: DASHBOARD
// ==========================================================
async function adminDashboard(env) {
  const pesananHariIni = await env.DB.prepare(
    "SELECT COUNT(*) as jumlah, COALESCE(SUM(total),0) as pendapatan FROM pesanan WHERE date(created_at) = date('now') AND status != 'dibatalkan'"
  ).first();

  const pendapatanBulanIni = await env.DB.prepare(
    "SELECT COALESCE(SUM(total),0) as pendapatan FROM pesanan WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status != 'dibatalkan'"
  ).first();

  const produkTerlaris = await env.DB.prepare(
    "SELECT id, nama, terjual, foto_url FROM produk ORDER BY terjual DESC LIMIT 5"
  ).all();

  const produkHabis = await env.DB.prepare(
    "SELECT id, nama, stok FROM produk WHERE stok <= 0 ORDER BY nama ASC LIMIT 10"
  ).all();

  const statusCounts = await env.DB.prepare(
    `SELECT status, COUNT(*) as jumlah FROM pesanan
     WHERE date(created_at) >= date('now', '-30 days')
     GROUP BY status`
  ).all();

  const grafik7Hari = await env.DB.prepare(
    `SELECT date(created_at) as tanggal, COUNT(*) as jumlah_pesanan, COALESCE(SUM(total),0) as pendapatan
     FROM pesanan
     WHERE date(created_at) >= date('now', '-6 days') AND status != 'dibatalkan'
     GROUP BY date(created_at)
     ORDER BY tanggal ASC`
  ).all();

  return successResponse({
    pesanan_hari_ini: pesananHariIni.jumlah,
    pendapatan_hari_ini: pesananHariIni.pendapatan,
    pendapatan_bulan_ini: pendapatanBulanIni.pendapatan,
    produk_terlaris: produkTerlaris.results,
    produk_habis: produkHabis.results,
    status_counts: statusCounts.results,
    grafik_7_hari: grafik7Hari.results,
  });
}

// ==========================================================
// ADMIN: PESANAN
// ==========================================================
async function adminListOrders(env, url) {
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q");
  const page = Math.max(toInt(url.searchParams.get("page"), 1), 1);
  const perPage = Math.min(toInt(url.searchParams.get("per_page"), 20), 100);
  const offset = (page - 1) * perPage;

  let query = "SELECT * FROM pesanan WHERE 1=1";
  const params = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (search) {
    query += " AND (nomor_pesanan LIKE ? OR nama LIKE ? OR whatsapp LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
  const countResult = await env.DB.prepare(countQuery).bind(...params).first();

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(perPage, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  return successResponse({
    items: results,
    total: countResult.total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(countResult.total / perPage),
  });
}

async function adminGetOrder(env, id) {
  const pesanan = await env.DB.prepare("SELECT * FROM pesanan WHERE id = ?").bind(id).first();
  if (!pesanan) return errorResponse("Pesanan tidak ditemukan.", 404);

  const { results: items } = await env.DB.prepare("SELECT * FROM pesanan_item WHERE pesanan_id = ?").bind(id).all();
  const { results: logs } = await env.DB.prepare("SELECT * FROM pesanan_status_log WHERE pesanan_id = ? ORDER BY created_at ASC").bind(id).all();
  const settings = await env.DB.prepare("SELECT latitude, longitude, nama_warung FROM pengaturan WHERE id = 1").first();

  return successResponse({ pesanan, items, logs, warung: settings });
}

const STATUS_VALID = ["menunggu", "diproses", "dimasak", "siap_diantar", "diantar", "selesai", "dibatalkan"];

async function adminUpdateOrderStatus(request, env, id) {
  const body = await safeJson(request);
  const status = sanitizeString(body.status, 30);
  const keterangan = sanitizeString(body.keterangan || "", 300);
  const alasanBatal = sanitizeString(body.alasan_batal || "", 300);

  if (!STATUS_VALID.includes(status)) return errorResponse("Status tidak valid.", 400);

  const pesanan = await env.DB.prepare("SELECT * FROM pesanan WHERE id = ?").bind(id).first();
  if (!pesanan) return errorResponse("Pesanan tidak ditemukan.", 404);

  // Jika dibatalkan, kembalikan stok produk
  if (status === "dibatalkan" && pesanan.status !== "dibatalkan") {
    const { results: items } = await env.DB.prepare("SELECT * FROM pesanan_item WHERE pesanan_id = ?").bind(id).all();
    for (const item of items) {
      if (item.produk_id) {
        await env.DB.prepare("UPDATE produk SET stok = stok + ?, terjual = MAX(0, terjual - ?) WHERE id = ?")
          .bind(item.jumlah, item.jumlah, item.produk_id).run();
      }
    }
  }

  await env.DB.prepare(
    "UPDATE pesanan SET status = ?, alasan_batal = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(status, status === "dibatalkan" ? alasanBatal : null, id).run();

  await env.DB.prepare("INSERT INTO pesanan_status_log (pesanan_id, status, keterangan) VALUES (?, ?, ?)")
    .bind(id, status, keterangan || null).run();

  return successResponse({ message: "Status pesanan diperbarui." });
}

// ==========================================================
// ADMIN: KATEGORI (CRUD)
// ==========================================================
async function adminListCategories(env) {
  const { results } = await env.DB.prepare("SELECT * FROM kategori ORDER BY urutan ASC, nama ASC").all();
  return successResponse(results);
}

async function adminCreateCategory(request, env) {
  const body = await safeJson(request);
  const nama = sanitizeString(body.nama, 100);
  if (!nama) return errorResponse("Nama kategori wajib diisi.", 400);

  const slug = slugify(body.slug || nama);
  const icon = sanitizeString(body.icon || "", 50);
  const urutan = toInt(body.urutan, 0);
  const aktif = body.aktif ? 1 : 0;

  try {
    const result = await env.DB.prepare(
      "INSERT INTO kategori (nama, slug, icon, urutan, aktif) VALUES (?, ?, ?, ?, ?)"
    ).bind(nama, slug, icon, urutan, aktif).run();
    return successResponse({ id: result.meta.last_row_id, message: "Kategori ditambahkan." });
  } catch (err) {
    return errorResponse("Slug kategori sudah digunakan.", 409);
  }
}

async function adminUpdateCategory(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM kategori WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Kategori tidak ditemukan.", 404);

  const nama = sanitizeString(body.nama, 100) || existing.nama;
  const slug = body.slug ? slugify(body.slug) : existing.slug;
  const icon = body.icon !== undefined ? sanitizeString(body.icon, 50) : existing.icon;
  const urutan = body.urutan !== undefined ? toInt(body.urutan, 0) : existing.urutan;
  const aktif = body.aktif !== undefined ? (body.aktif ? 1 : 0) : existing.aktif;

  try {
    await env.DB.prepare(
      "UPDATE kategori SET nama = ?, slug = ?, icon = ?, urutan = ?, aktif = ? WHERE id = ?"
    ).bind(nama, slug, icon, urutan, aktif, id).run();
    return successResponse({ message: "Kategori diperbarui." });
  } catch (err) {
    return errorResponse("Slug kategori sudah digunakan.", 409);
  }
}

async function adminDeleteCategory(env, id) {
  const produkCount = await env.DB.prepare("SELECT COUNT(*) as jumlah FROM produk WHERE kategori_id = ?").bind(id).first();
  if (produkCount.jumlah > 0) {
    return errorResponse("Kategori tidak dapat dihapus karena masih memiliki produk.", 409);
  }
  await env.DB.prepare("DELETE FROM kategori WHERE id = ?").bind(id).run();
  return successResponse({ message: "Kategori dihapus." });
}

// ==========================================================
// ADMIN: PRODUK (CRUD)
// ==========================================================
async function adminListProducts(env, url) {
  const search = url.searchParams.get("q");
  const kategoriId = url.searchParams.get("kategori_id");
  const page = Math.max(toInt(url.searchParams.get("page"), 1), 1);
  const perPage = Math.min(toInt(url.searchParams.get("per_page"), 20), 100);
  const offset = (page - 1) * perPage;

  let query = `SELECT p.*, k.nama as kategori_nama FROM produk p JOIN kategori k ON p.kategori_id = k.id WHERE 1=1`;
  const params = [];

  if (search) {
    query += " AND p.nama LIKE ?";
    params.push(`%${search}%`);
  }
  if (kategoriId) {
    query += " AND p.kategori_id = ?";
    params.push(toInt(kategoriId));
  }

  const countQuery = query.replace(/SELECT p\.\*, k\.nama as kategori_nama/, "SELECT COUNT(*) as total");
  const countResult = await env.DB.prepare(countQuery).bind(...params).first();

  query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
  params.push(perPage, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return successResponse({
    items: results,
    total: countResult.total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(countResult.total / perPage),
  });
}

async function adminCreateProduct(request, env) {
  const body = await safeJson(request);
  const nama = sanitizeString(body.nama, 150);
  const kategoriId = toInt(body.kategori_id, 0);

  if (!nama) return errorResponse("Nama produk wajib diisi.", 400);
  if (kategoriId <= 0) return errorResponse("Kategori wajib dipilih.", 400);

  const slug = slugify(body.slug || nama) + "-" + Math.random().toString(36).substring(2, 6);
  const fotoUrl = sanitizeString(body.foto_url || "", 500);
  const harga = toInt(body.harga, 0);
  const hargaCoret = toInt(body.harga_coret, 0);
  const diskonPersen = toInt(body.diskon_persen, 0);
  const deskripsi = sanitizeString(body.deskripsi || "", 2000);
  const stok = toInt(body.stok, 0);
  const status = ["aktif", "nonaktif", "habis"].includes(body.status) ? body.status : "aktif";
  const bestSeller = body.best_seller ? 1 : 0;
  const produkBaru = body.produk_baru ? 1 : 0;
  const estimasiMasak = toInt(body.estimasi_masak_menit, 15);

  const result = await env.DB.prepare(
    `INSERT INTO produk (kategori_id, nama, slug, foto_url, harga, harga_coret, diskon_persen, deskripsi, stok, status, best_seller, produk_baru, estimasi_masak_menit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(kategoriId, nama, slug, fotoUrl, harga, hargaCoret, diskonPersen, deskripsi, stok, status, bestSeller, produkBaru, estimasiMasak).run();

  return successResponse({ id: result.meta.last_row_id, slug, message: "Produk ditambahkan." });
}

async function adminUpdateProduct(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM produk WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Produk tidak ditemukan.", 404);

  const nama = sanitizeString(body.nama, 150) || existing.nama;
  const kategoriId = body.kategori_id !== undefined ? toInt(body.kategori_id, existing.kategori_id) : existing.kategori_id;
  const fotoUrl = body.foto_url !== undefined ? sanitizeString(body.foto_url, 500) : existing.foto_url;
  const harga = body.harga !== undefined ? toInt(body.harga, existing.harga) : existing.harga;
  const hargaCoret = body.harga_coret !== undefined ? toInt(body.harga_coret, existing.harga_coret) : existing.harga_coret;
  const diskonPersen = body.diskon_persen !== undefined ? toInt(body.diskon_persen, existing.diskon_persen) : existing.diskon_persen;
  const deskripsi = body.deskripsi !== undefined ? sanitizeString(body.deskripsi, 2000) : existing.deskripsi;
  const stok = body.stok !== undefined ? toInt(body.stok, existing.stok) : existing.stok;
  const status = body.status && ["aktif", "nonaktif", "habis"].includes(body.status) ? body.status : existing.status;
  const bestSeller = body.best_seller !== undefined ? (body.best_seller ? 1 : 0) : existing.best_seller;
  const produkBaru = body.produk_baru !== undefined ? (body.produk_baru ? 1 : 0) : existing.produk_baru;
  const estimasiMasak = body.estimasi_masak_menit !== undefined ? toInt(body.estimasi_masak_menit, existing.estimasi_masak_menit) : existing.estimasi_masak_menit;

  await env.DB.prepare(
    `UPDATE produk SET kategori_id=?, nama=?, foto_url=?, harga=?, harga_coret=?, diskon_persen=?, deskripsi=?, stok=?, status=?, best_seller=?, produk_baru=?, estimasi_masak_menit=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(kategoriId, nama, fotoUrl, harga, hargaCoret, diskonPersen, deskripsi, stok, status, bestSeller, produkBaru, estimasiMasak, id).run();

  return successResponse({ message: "Produk diperbarui." });
}

async function adminDeleteProduct(env, id) {
  const orderCount = await env.DB.prepare("SELECT COUNT(*) as jumlah FROM pesanan_item WHERE produk_id = ?").bind(id).first();
  if (orderCount.jumlah > 0) {
    // Produk pernah dipesan -> nonaktifkan saja agar riwayat pesanan tetap utuh
    await env.DB.prepare("UPDATE produk SET status = 'nonaktif' WHERE id = ?").bind(id).run();
    return successResponse({ message: "Produk memiliki riwayat pesanan sehingga dinonaktifkan (tidak dihapus permanen)." });
  }
  await env.DB.prepare("DELETE FROM produk WHERE id = ?").bind(id).run();
  return successResponse({ message: "Produk dihapus." });
}

// ==========================================================
// ADMIN: BANNER (CRUD)
// ==========================================================
async function adminListBanners(env) {
  const { results } = await env.DB.prepare("SELECT * FROM banner ORDER BY urutan ASC").all();
  return successResponse(results);
}

async function adminCreateBanner(request, env) {
  const body = await safeJson(request);
  const gambarUrl = sanitizeString(body.gambar_url, 500);
  if (!gambarUrl) return errorResponse("Gambar banner wajib diisi.", 400);

  const judul = sanitizeString(body.judul || "", 150);
  const linkUrl = sanitizeString(body.link_url || "", 500);
  const urutan = toInt(body.urutan, 0);
  const aktif = body.aktif !== undefined ? (body.aktif ? 1 : 0) : 1;

  const result = await env.DB.prepare(
    "INSERT INTO banner (judul, gambar_url, link_url, urutan, aktif) VALUES (?, ?, ?, ?, ?)"
  ).bind(judul, gambarUrl, linkUrl, urutan, aktif).run();

  return successResponse({ id: result.meta.last_row_id, message: "Banner ditambahkan." });
}

async function adminUpdateBanner(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM banner WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Banner tidak ditemukan.", 404);

  const judul = body.judul !== undefined ? sanitizeString(body.judul, 150) : existing.judul;
  const gambarUrl = body.gambar_url !== undefined ? sanitizeString(body.gambar_url, 500) : existing.gambar_url;
  const linkUrl = body.link_url !== undefined ? sanitizeString(body.link_url, 500) : existing.link_url;
  const urutan = body.urutan !== undefined ? toInt(body.urutan, existing.urutan) : existing.urutan;
  const aktif = body.aktif !== undefined ? (body.aktif ? 1 : 0) : existing.aktif;

  await env.DB.prepare("UPDATE banner SET judul=?, gambar_url=?, link_url=?, urutan=?, aktif=? WHERE id=?")
    .bind(judul, gambarUrl, linkUrl, urutan, aktif, id).run();

  return successResponse({ message: "Banner diperbarui." });
}

async function adminDeleteBanner(env, id) {
  await env.DB.prepare("DELETE FROM banner WHERE id = ?").bind(id).run();
  return successResponse({ message: "Banner dihapus." });
}

// ==========================================================
// ADMIN: PROMO (CRUD)
// ==========================================================
async function adminListPromos(env) {
  const { results } = await env.DB.prepare("SELECT * FROM promo ORDER BY created_at DESC").all();
  return successResponse(results);
}

async function adminCreatePromo(request, env) {
  const body = await safeJson(request);
  const judul = sanitizeString(body.judul, 150);
  if (!judul) return errorResponse("Judul promo wajib diisi.", 400);

  const deskripsi = sanitizeString(body.deskripsi || "", 1000);
  const gambarUrl = sanitizeString(body.gambar_url || "", 500);
  const tanggalMulai = sanitizeString(body.tanggal_mulai, 20);
  const tanggalSelesai = sanitizeString(body.tanggal_selesai, 20);
  const status = body.status === "nonaktif" ? "nonaktif" : "aktif";

  if (!tanggalMulai || !tanggalSelesai) return errorResponse("Tanggal mulai dan selesai wajib diisi.", 400);

  const result = await env.DB.prepare(
    "INSERT INTO promo (judul, deskripsi, gambar_url, tanggal_mulai, tanggal_selesai, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(judul, deskripsi, gambarUrl, tanggalMulai, tanggalSelesai, status).run();

  return successResponse({ id: result.meta.last_row_id, message: "Promo ditambahkan." });
}

async function adminUpdatePromo(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM promo WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Promo tidak ditemukan.", 404);

  const judul = body.judul !== undefined ? sanitizeString(body.judul, 150) : existing.judul;
  const deskripsi = body.deskripsi !== undefined ? sanitizeString(body.deskripsi, 1000) : existing.deskripsi;
  const gambarUrl = body.gambar_url !== undefined ? sanitizeString(body.gambar_url, 500) : existing.gambar_url;
  const tanggalMulai = body.tanggal_mulai !== undefined ? sanitizeString(body.tanggal_mulai, 20) : existing.tanggal_mulai;
  const tanggalSelesai = body.tanggal_selesai !== undefined ? sanitizeString(body.tanggal_selesai, 20) : existing.tanggal_selesai;
  const status = body.status !== undefined ? (body.status === "nonaktif" ? "nonaktif" : "aktif") : existing.status;

  await env.DB.prepare(
    "UPDATE promo SET judul=?, deskripsi=?, gambar_url=?, tanggal_mulai=?, tanggal_selesai=?, status=? WHERE id=?"
  ).bind(judul, deskripsi, gambarUrl, tanggalMulai, tanggalSelesai, status, id).run();

  return successResponse({ message: "Promo diperbarui." });
}

async function adminDeletePromo(env, id) {
  await env.DB.prepare("DELETE FROM promo WHERE id = ?").bind(id).run();
  return successResponse({ message: "Promo dihapus." });
}

// ==========================================================
// ADMIN: VOUCHER (CRUD)
// ==========================================================
async function adminListVouchers(env) {
  const { results } = await env.DB.prepare("SELECT * FROM voucher ORDER BY created_at DESC").all();
  return successResponse(results);
}

async function adminCreateVoucher(request, env) {
  const body = await safeJson(request);
  const kode = sanitizeString(body.kode, 50).toUpperCase();
  const tipe = body.tipe === "nominal" ? "nominal" : "persentase";
  const nilai = toInt(body.nilai, 0);
  const minimalBelanja = toInt(body.minimal_belanja, 0);
  const maksimalPotongan = toInt(body.maksimal_potongan, 0);
  const kuota = toInt(body.kuota, 0);
  const tanggalKadaluarsa = sanitizeString(body.tanggal_kadaluarsa, 20);
  const aktif = body.aktif !== undefined ? (body.aktif ? 1 : 0) : 1;

  if (!kode || nilai <= 0 || !tanggalKadaluarsa) {
    return errorResponse("Kode, nilai, dan tanggal kadaluarsa wajib diisi.", 400);
  }

  try {
    const result = await env.DB.prepare(
      `INSERT INTO voucher (kode, tipe, nilai, minimal_belanja, maksimal_potongan, kuota, tanggal_kadaluarsa, aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(kode, tipe, nilai, minimalBelanja, maksimalPotongan, kuota, tanggalKadaluarsa, aktif).run();
    return successResponse({ id: result.meta.last_row_id, message: "Voucher ditambahkan." });
  } catch (err) {
    return errorResponse("Kode voucher sudah digunakan.", 409);
  }
}

async function adminUpdateVoucher(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM voucher WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Voucher tidak ditemukan.", 404);

  const tipe = body.tipe !== undefined ? (body.tipe === "nominal" ? "nominal" : "persentase") : existing.tipe;
  const nilai = body.nilai !== undefined ? toInt(body.nilai, existing.nilai) : existing.nilai;
  const minimalBelanja = body.minimal_belanja !== undefined ? toInt(body.minimal_belanja, existing.minimal_belanja) : existing.minimal_belanja;
  const maksimalPotongan = body.maksimal_potongan !== undefined ? toInt(body.maksimal_potongan, existing.maksimal_potongan) : existing.maksimal_potongan;
  const kuota = body.kuota !== undefined ? toInt(body.kuota, existing.kuota) : existing.kuota;
  const tanggalKadaluarsa = body.tanggal_kadaluarsa !== undefined ? sanitizeString(body.tanggal_kadaluarsa, 20) : existing.tanggal_kadaluarsa;
  const aktif = body.aktif !== undefined ? (body.aktif ? 1 : 0) : existing.aktif;

  await env.DB.prepare(
    `UPDATE voucher SET tipe=?, nilai=?, minimal_belanja=?, maksimal_potongan=?, kuota=?, tanggal_kadaluarsa=?, aktif=? WHERE id=?`
  ).bind(tipe, nilai, minimalBelanja, maksimalPotongan, kuota, tanggalKadaluarsa, aktif, id).run();

  return successResponse({ message: "Voucher diperbarui." });
}

async function adminDeleteVoucher(env, id) {
  await env.DB.prepare("DELETE FROM voucher WHERE id = ?").bind(id).run();
  return successResponse({ message: "Voucher dihapus." });
}

// ==========================================================
// ADMIN: TARIF ONGKIR (CRUD)
// ==========================================================
async function adminListShippingRates(env) {
  const { results } = await env.DB.prepare("SELECT * FROM tarif_ongkir ORDER BY jarak_dari_km ASC").all();
  return successResponse(results);
}

async function adminCreateShippingRate(request, env) {
  const body = await safeJson(request);
  const jarakDari = toFloat(body.jarak_dari_km, 0);
  const jarakSampai = toFloat(body.jarak_sampai_km, 0);
  const tarif = toInt(body.tarif, 0);
  const urutan = toInt(body.urutan, 0);

  if (jarakSampai <= jarakDari) return errorResponse("Jarak 'sampai' harus lebih besar dari jarak 'dari'.", 400);

  const result = await env.DB.prepare(
    "INSERT INTO tarif_ongkir (jarak_dari_km, jarak_sampai_km, tarif, urutan) VALUES (?, ?, ?, ?)"
  ).bind(jarakDari, jarakSampai, tarif, urutan).run();

  return successResponse({ id: result.meta.last_row_id, message: "Tarif ongkir ditambahkan." });
}

async function adminUpdateShippingRate(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM tarif_ongkir WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Tarif ongkir tidak ditemukan.", 404);

  const jarakDari = body.jarak_dari_km !== undefined ? toFloat(body.jarak_dari_km, existing.jarak_dari_km) : existing.jarak_dari_km;
  const jarakSampai = body.jarak_sampai_km !== undefined ? toFloat(body.jarak_sampai_km, existing.jarak_sampai_km) : existing.jarak_sampai_km;
  const tarif = body.tarif !== undefined ? toInt(body.tarif, existing.tarif) : existing.tarif;
  const urutan = body.urutan !== undefined ? toInt(body.urutan, existing.urutan) : existing.urutan;

  await env.DB.prepare("UPDATE tarif_ongkir SET jarak_dari_km=?, jarak_sampai_km=?, tarif=?, urutan=? WHERE id=?")
    .bind(jarakDari, jarakSampai, tarif, urutan, id).run();

  return successResponse({ message: "Tarif ongkir diperbarui." });
}

async function adminDeleteShippingRate(env, id) {
  await env.DB.prepare("DELETE FROM tarif_ongkir WHERE id = ?").bind(id).run();
  return successResponse({ message: "Tarif ongkir dihapus." });
}

// ==========================================================
// ADMIN: JAM OPERASIONAL
// ==========================================================
async function adminListOperatingHours(env) {
  const { results } = await env.DB.prepare("SELECT * FROM jam_operasional ORDER BY hari ASC").all();
  return successResponse(results);
}

async function adminUpdateOperatingHour(request, env, id) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM jam_operasional WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Data jam operasional tidak ditemukan.", 404);

  const jamBuka = body.jam_buka !== undefined ? sanitizeString(body.jam_buka, 5) : existing.jam_buka;
  const jamTutup = body.jam_tutup !== undefined ? sanitizeString(body.jam_tutup, 5) : existing.jam_tutup;
  const libur = body.libur !== undefined ? (body.libur ? 1 : 0) : existing.libur;

  await env.DB.prepare("UPDATE jam_operasional SET jam_buka=?, jam_tutup=?, libur=? WHERE id=?")
    .bind(jamBuka, jamTutup, libur, id).run();

  return successResponse({ message: "Jam operasional diperbarui." });
}

// ==========================================================
// ADMIN: PELANGGAN
// ==========================================================
async function adminListCustomers(env, url) {
  const search = url.searchParams.get("q");
  const page = Math.max(toInt(url.searchParams.get("page"), 1), 1);
  const perPage = Math.min(toInt(url.searchParams.get("per_page"), 20), 100);
  const offset = (page - 1) * perPage;

  let query = "SELECT * FROM pelanggan WHERE 1=1";
  const params = [];
  if (search) {
    query += " AND (nama LIKE ? OR whatsapp LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const countResult = await env.DB.prepare(query.replace("SELECT *", "SELECT COUNT(*) as total")).bind(...params).first();

  query += " ORDER BY total_belanja DESC LIMIT ? OFFSET ?";
  params.push(perPage, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return successResponse({
    items: results,
    total: countResult.total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(countResult.total / perPage),
  });
}

// ==========================================================
// ADMIN: LAPORAN
// ==========================================================
async function adminReports(env, url) {
  const filter = url.searchParams.get("filter") || "harian"; // harian, mingguan, bulanan, custom
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const format = url.searchParams.get("format"); // csv jika ingin export

  let dateCondition = "";
  const params = [];

  if (filter === "harian") {
    dateCondition = "date(created_at) = date('now')";
  } else if (filter === "mingguan") {
    dateCondition = "date(created_at) >= date('now', '-7 days')";
  } else if (filter === "bulanan") {
    dateCondition = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
  } else if (filter === "custom" && startDate && endDate) {
    dateCondition = "date(created_at) BETWEEN date(?) AND date(?)";
    params.push(startDate, endDate);
  } else {
    dateCondition = "date(created_at) = date('now')";
  }

  const query = `
    SELECT nomor_pesanan, nama, whatsapp, subtotal, ongkir, diskon_voucher, total, status, created_at
    FROM pesanan
    WHERE ${dateCondition}
    ORDER BY created_at DESC
  `;
  const { results } = await env.DB.prepare(query).bind(...params).all();

  const summary = {
    total_pesanan: results.length,
    total_pendapatan: results.filter(r => r.status !== "dibatalkan").reduce((sum, r) => sum + r.total, 0),
    total_dibatalkan: results.filter(r => r.status === "dibatalkan").length,
  };

  if (format === "csv") {
    const csvHeader = "Nomor Pesanan,Nama,WhatsApp,Subtotal,Ongkir,Diskon,Total,Status,Tanggal\n";
    const csvRows = results.map(r =>
      `"${r.nomor_pesanan}","${r.nama}","${r.whatsapp}",${r.subtotal},${r.ongkir},${r.diskon_voucher},${r.total},"${r.status}","${r.created_at}"`
    ).join("\n");
    const csv = csvHeader + csvRows;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${filter}-${Date.now()}.csv"`,
      },
    });
  }

  return successResponse({ items: results, summary });
}

// ==========================================================
// ADMIN: PENGATURAN WEBSITE
// ==========================================================
async function adminUpdateSettings(request, env) {
  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM pengaturan WHERE id = 1").first();

  const namaWarung = body.nama_warung !== undefined ? sanitizeString(body.nama_warung, 150) : existing.nama_warung;
  const logoUrl = body.logo_url !== undefined ? sanitizeString(body.logo_url, 500) : existing.logo_url;
  const faviconUrl = body.favicon_url !== undefined ? sanitizeString(body.favicon_url, 500) : existing.favicon_url;
  const alamat = body.alamat !== undefined ? sanitizeString(body.alamat, 500) : existing.alamat;
  const whatsapp = body.whatsapp !== undefined ? sanitizeString(body.whatsapp, 20) : existing.whatsapp;
  const instagram = body.instagram !== undefined ? sanitizeString(body.instagram, 100) : existing.instagram;
  const facebook = body.facebook !== undefined ? sanitizeString(body.facebook, 100) : existing.facebook;
  const latitude = body.latitude !== undefined ? toFloat(body.latitude, existing.latitude) : existing.latitude;
  const longitude = body.longitude !== undefined ? toFloat(body.longitude, existing.longitude) : existing.longitude;
  const minimalOrder = body.minimal_order !== undefined ? toInt(body.minimal_order, existing.minimal_order) : existing.minimal_order;
  const statusBuka = body.status_buka !== undefined ? (body.status_buka ? 1 : 0) : existing.status_buka;
  const deskripsiSingkat = body.deskripsi_singkat !== undefined ? sanitizeString(body.deskripsi_singkat, 500) : existing.deskripsi_singkat;

  await env.DB.prepare(
    `UPDATE pengaturan SET nama_warung=?, logo_url=?, favicon_url=?, alamat=?, whatsapp=?, instagram=?, facebook=?,
     latitude=?, longitude=?, minimal_order=?, status_buka=?, deskripsi_singkat=?, updated_at=datetime('now') WHERE id=1`
  ).bind(namaWarung, logoUrl, faviconUrl, alamat, whatsapp, instagram, facebook, latitude, longitude, minimalOrder, statusBuka, deskripsiSingkat).run();

  return successResponse({ message: "Pengaturan diperbarui." });
}

async function adminUpdateDeliveryArea(request, env) {
  const body = await safeJson(request);
  const radiusMaksimal = toFloat(body.radius_maksimal_km, null);
  if (radiusMaksimal === null || radiusMaksimal <= 0) {
    return errorResponse("Radius maksimal harus lebih dari 0.", 400);
  }
  await env.DB.prepare("UPDATE pengaturan SET radius_maksimal_km=?, updated_at=datetime('now') WHERE id=1")
    .bind(radiusMaksimal).run();
  return successResponse({ message: "Area pengiriman diperbarui." });
}

// ==========================================================
// ADMIN: MANAJEMEN AKUN ADMIN (khusus super_admin)
// ==========================================================
function requireSuperAdmin(admin) {
  if (admin.role !== "super_admin") {
    return errorResponse("Hanya super admin yang dapat mengakses fitur ini.", 403);
  }
  return null;
}

async function adminListAdmins(env, admin) {
  const denied = requireSuperAdmin(admin);
  if (denied) return denied;
  const { results } = await env.DB.prepare("SELECT id, username, nama_lengkap, role, aktif, created_at FROM admins ORDER BY created_at ASC").all();
  return successResponse(results);
}

async function adminCreateAdmin(request, env, admin) {
  const denied = requireSuperAdmin(admin);
  if (denied) return denied;

  const body = await safeJson(request);
  const username = sanitizeString(body.username, 50);
  const password = String(body.password || "");
  const namaLengkap = sanitizeString(body.nama_lengkap, 100);
  const role = body.role === "super_admin" ? "super_admin" : "admin";

  if (!username || !password || !namaLengkap) return errorResponse("Semua field wajib diisi.", 400);
  if (password.length < 6) return errorResponse("Password minimal 6 karakter.", 400);

  const passwordHash = await hashPassword(password);

  try {
    const result = await env.DB.prepare(
      "INSERT INTO admins (username, password_hash, nama_lengkap, role, aktif) VALUES (?, ?, ?, ?, 1)"
    ).bind(username, passwordHash, namaLengkap, role).run();
    return successResponse({ id: result.meta.last_row_id, message: "Admin baru ditambahkan." });
  } catch (err) {
    return errorResponse("Username sudah digunakan.", 409);
  }
}

async function adminUpdateAdmin(request, env, admin, id) {
  const denied = requireSuperAdmin(admin);
  if (denied) return denied;

  const body = await safeJson(request);
  const existing = await env.DB.prepare("SELECT * FROM admins WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Admin tidak ditemukan.", 404);

  const namaLengkap = body.nama_lengkap !== undefined ? sanitizeString(body.nama_lengkap, 100) : existing.nama_lengkap;
  const role = body.role !== undefined ? (body.role === "super_admin" ? "super_admin" : "admin") : existing.role;
  const aktif = body.aktif !== undefined ? (body.aktif ? 1 : 0) : existing.aktif;

  await env.DB.prepare("UPDATE admins SET nama_lengkap=?, role=?, aktif=?, updated_at=datetime('now') WHERE id=?")
    .bind(namaLengkap, role, aktif, id).run();

  if (body.password) {
    if (String(body.password).length < 6) return errorResponse("Password minimal 6 karakter.", 400);
    const passwordHash = await hashPassword(String(body.password));
    await env.DB.prepare("UPDATE admins SET password_hash=? WHERE id=?").bind(passwordHash, id).run();
  }

  return successResponse({ message: "Admin diperbarui." });
}

async function adminDeleteAdmin(env, admin, id) {
  const denied = requireSuperAdmin(admin);
  if (denied) return denied;

  if (admin.sub === id) return errorResponse("Tidak dapat menghapus akun sendiri.", 400);

  await env.DB.prepare("DELETE FROM admins WHERE id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE admin_id = ?").bind(id).run();
  return successResponse({ message: "Admin dihapus." });
}

async function adminChangePassword(request, env, admin) {
  const body = await safeJson(request);
  const passwordLama = String(body.password_lama || "");
  const passwordBaru = String(body.password_baru || "");

  if (!passwordLama || !passwordBaru) return errorResponse("Password lama dan baru wajib diisi.", 400);
  if (passwordBaru.length < 6) return errorResponse("Password baru minimal 6 karakter.", 400);

  const record = await env.DB.prepare("SELECT * FROM admins WHERE id = ?").bind(admin.sub).first();
  if (!record) return errorResponse("Admin tidak ditemukan.", 404);

  const valid = await verifyPassword(passwordLama, record.password_hash);
  if (!valid) return errorResponse("Password lama salah.", 401);

  const newHash = await hashPassword(passwordBaru);
  await env.DB.prepare("UPDATE admins SET password_hash=?, updated_at=datetime('now') WHERE id=?").bind(newHash, admin.sub).run();

  // Invalidasi semua sesi lama agar admin login ulang dengan password baru
  await env.DB.prepare("DELETE FROM admin_sessions WHERE admin_id = ?").bind(admin.sub).run();

  return successResponse({ message: "Password berhasil diubah. Silakan login kembali." });
}

// ==========================================================
// UPLOAD GAMBAR (R2 dengan fallback Base64 di D1 jika R2 tidak tersedia)
// ==========================================================
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

async function adminUploadImage(request, env) {
  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return errorResponse("Gunakan multipart/form-data untuk upload gambar.", 400);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") return errorResponse("File tidak ditemukan.", 400);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return errorResponse("Tipe file tidak diizinkan. Gunakan JPG, PNG, WEBP, atau GIF.", 400);
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return errorResponse("Ukuran file maksimal 4MB.", 400);
  }

  const ext = file.type.split("/")[1];
  const fileName = `produk/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

  // ---- Coba upload ke R2 jika binding tersedia ----
  if (env.IMAGES) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      await env.IMAGES.put(fileName, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });
      const imageUrl = `/api/images/${fileName}`;
      return successResponse({ url: imageUrl, storage: "r2" });
    } catch (err) {
      // Lanjut ke fallback Base64 jika R2 gagal
    }
  }

  // ---- Fallback: simpan sebagai Base64 langsung di respons (disimpan oleh client di field foto_url) ----
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  // Konversi per-chunk (bukan per-karakter) agar tidak melebihi batas CPU time Worker
  const CHUNK_SIZE = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  const base64 = btoa(binary);
  const dataUrl = `data:${file.type};base64,${base64}`;

  return successResponse({ url: dataUrl, storage: "base64" });
}

async function serveImage(env, key) {
  if (!env.IMAGES) return errorResponse("R2 storage tidak dikonfigurasi.", 500);
  const object = await env.IMAGES.get(key);
  if (!object) return errorResponse("Gambar tidak ditemukan.", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
