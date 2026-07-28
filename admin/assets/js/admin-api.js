// ==========================================================
// ADMIN API CLIENT
// ==========================================================
// WAJIB DIISI setelah Worker di-deploy (lihat README.md langkah 4-5).
// Harus sama persis dengan API_BASE_URL di assets/js/api.js.
const ADMIN_API_BASE = "https://warungmakan2.videoviralterbaruuu.workers.dev";
const TOKEN_KEY = "warungmakan_admin_token";
const ADMIN_INFO_KEY = "warungmakan_admin_info";

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ADMIN_INFO_KEY); }
function getAdminInfo() {
  try { return JSON.parse(localStorage.getItem(ADMIN_INFO_KEY) || "null"); } catch { return null; }
}
function setAdminInfo(info) { localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info)); }

async function adminApiRequest(endpoint, options = {}) {
  const url = `${ADMIN_API_BASE}${endpoint}`;
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
  }

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.endsWith("/admin/") && !window.location.pathname.endsWith("index.html")) {
      window.location.href = getAdminBasePath() + "index.html";
    }
    throw new Error("Sesi Anda telah berakhir, silakan login kembali.");
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("text/csv")) {
    return response; // biarkan pemanggil menangani unduhan CSV
  }

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Terjadi kesalahan pada server.");
  }
  return data.data;
}

function getAdminBasePath() {
  const path = window.location.pathname;
  if (path.includes("/admin/pages/")) return "../";
  if (path.includes("/admin/")) return "";
  return "admin/";
}

const AdminApi = {
  login: (username, password) => adminApiRequest("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => adminApiRequest("/api/admin/logout", { method: "POST" }),
  me: () => adminApiRequest("/api/admin/me"),

  dashboard: () => adminApiRequest("/api/admin/dashboard"),

  listOrders: (params = {}) => adminApiRequest(`/api/admin/orders?${new URLSearchParams(params)}`),
  checkNewOrders: (sinceId) => adminApiRequest(`/api/admin/orders/notifications?since_id=${sinceId}`),
  getOrder: (id) => adminApiRequest(`/api/admin/orders/${id}`),
  updateOrderStatus: (id, payload) => adminApiRequest(`/api/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify(payload) }),

  listCategories: () => adminApiRequest("/api/admin/categories"),
  createCategory: (payload) => adminApiRequest("/api/admin/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => adminApiRequest(`/api/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id) => adminApiRequest(`/api/admin/categories/${id}`, { method: "DELETE" }),

  listProducts: (params = {}) => adminApiRequest(`/api/admin/products?${new URLSearchParams(params)}`),
  createProduct: (payload) => adminApiRequest("/api/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => adminApiRequest(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => adminApiRequest(`/api/admin/products/${id}`, { method: "DELETE" }),

  listBanners: () => adminApiRequest("/api/admin/banners"),
  createBanner: (payload) => adminApiRequest("/api/admin/banners", { method: "POST", body: JSON.stringify(payload) }),
  updateBanner: (id, payload) => adminApiRequest(`/api/admin/banners/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBanner: (id) => adminApiRequest(`/api/admin/banners/${id}`, { method: "DELETE" }),

  listPromos: () => adminApiRequest("/api/admin/promos"),
  createPromo: (payload) => adminApiRequest("/api/admin/promos", { method: "POST", body: JSON.stringify(payload) }),
  updatePromo: (id, payload) => adminApiRequest(`/api/admin/promos/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePromo: (id) => adminApiRequest(`/api/admin/promos/${id}`, { method: "DELETE" }),

  listVouchers: () => adminApiRequest("/api/admin/vouchers"),
  createVoucher: (payload) => adminApiRequest("/api/admin/vouchers", { method: "POST", body: JSON.stringify(payload) }),
  updateVoucher: (id, payload) => adminApiRequest(`/api/admin/vouchers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteVoucher: (id) => adminApiRequest(`/api/admin/vouchers/${id}`, { method: "DELETE" }),

  listShippingRates: () => adminApiRequest("/api/admin/shipping-rates"),
  createShippingRate: (payload) => adminApiRequest("/api/admin/shipping-rates", { method: "POST", body: JSON.stringify(payload) }),
  updateShippingRate: (id, payload) => adminApiRequest(`/api/admin/shipping-rates/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteShippingRate: (id) => adminApiRequest(`/api/admin/shipping-rates/${id}`, { method: "DELETE" }),

  listOperatingHours: () => adminApiRequest("/api/admin/operating-hours"),
  updateOperatingHour: (id, payload) => adminApiRequest(`/api/admin/operating-hours/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  listCustomers: (params = {}) => adminApiRequest(`/api/admin/customers?${new URLSearchParams(params)}`),

  getReports: (params = {}) => adminApiRequest(`/api/admin/reports?${new URLSearchParams(params)}`),

  getSettings: () => adminApiRequest("/api/admin/settings"),
  updateSettings: (payload) => adminApiRequest("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) }),
  updateDeliveryArea: (payload) => adminApiRequest("/api/admin/delivery-area", { method: "PUT", body: JSON.stringify(payload) }),

  listAdmins: () => adminApiRequest("/api/admin/admins"),
  createAdmin: (payload) => adminApiRequest("/api/admin/admins", { method: "POST", body: JSON.stringify(payload) }),
  updateAdmin: (id, payload) => adminApiRequest(`/api/admin/admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAdmin: (id) => adminApiRequest(`/api/admin/admins/${id}`, { method: "DELETE" }),
  changePassword: (payload) => adminApiRequest("/api/admin/change-password", { method: "PUT", body: JSON.stringify(payload) }),

  uploadImage: async (file) => {
    const compressed = await compressImageFile(file);
    const formData = new FormData();
    formData.append("file", compressed);
    return adminApiRequest("/api/admin/upload", { method: "POST", body: formData });
  },
};

// ---------------- KOMPRESI GAMBAR SEBELUM UPLOAD ----------------
// Foto dari HP biasanya berukuran beberapa MB (misal 12MP), yang bisa
// menyebabkan Worker melebihi batas CPU time saat fallback ke Base64
// (karena tidak ada R2). Fungsi ini mengecilkan gambar ke maksimal
// 900px pada sisi terpanjang dan mengompresnya sebagai JPEG kualitas 75%
// sebelum dikirim ke server — jauh lebih ringan dan cepat.
function compressImageFile(file, maxDimension = 900, quality = 0.75) {
  return new Promise((resolve) => {
    // GIF tidak dikompres agar animasi tidak rusak
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, "") + ".jpg",
              { type: "image/jpeg" }
            );
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ---------------- FORMAT HELPERS ----------------
function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return "Rp" + n.toLocaleString("id-ID");
}
function formatTanggal(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString.replace(" ", "T") + "Z");
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatTanggalSingkat(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString.replace(" ", "T") + "Z");
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
