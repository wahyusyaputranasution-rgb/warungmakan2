// ==========================================================
// API CLIENT - Komunikasi dengan Cloudflare Worker
// ==========================================================

// WAJIB DIISI setelah Worker di-deploy (lihat README.md langkah 4-5).
// Contoh: "https://warung-makan-api.namaanda.workers.dev"
// Worker dan Pages adalah dua deployment terpisah, sehingga URL lengkap
// (bukan path relatif kosong) diperlukan agar frontend bisa memanggil API.
const API_BASE_URL = "https://warungmakan2.videoviralterbaruuu.workers.dev";

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Terjadi kesalahan pada server.");
    }
    return data.data;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    }
    throw err;
  }
}

const Api = {
  // ---------------- PUBLIC ----------------
  getSettings: () => apiRequest("/api/settings"),
  getOperatingHours: () => apiRequest("/api/operating-hours"),
  getCategories: () => apiRequest("/api/categories"),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/api/products${qs ? "?" + qs : ""}`);
  },
  getProductBySlug: (slug) => apiRequest(`/api/products/${encodeURIComponent(slug)}`),
  getBanners: () => apiRequest("/api/banners"),
  getPromos: () => apiRequest("/api/promos"),
  calculateShipping: (latitude, longitude) =>
    apiRequest("/api/shipping/calculate", { method: "POST", body: JSON.stringify({ latitude, longitude }) }),
  validateVoucher: (kode, subtotal) =>
    apiRequest("/api/voucher/validate", { method: "POST", body: JSON.stringify({ kode, subtotal }) }),
  createOrder: (payload) => apiRequest("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  trackOrder: (nomor) => apiRequest(`/api/orders/track/${encodeURIComponent(nomor)}`),

  // ---------------- ADMIN AUTH ----------------
  adminLogin: (username, password) =>
    apiRequest("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }),
};

// ---------------- FORMAT HELPERS ----------------
function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return "Rp" + n.toLocaleString("id-ID");
}

function formatTanggal(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString.replace(" ", "T") + "Z");
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
