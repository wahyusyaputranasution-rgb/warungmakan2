// ==========================================================
// ADMIN LAYOUT - Sidebar, Topbar, Auth Guard, Toast, Modal
// ==========================================================

const MENU_ITEMS = [
  { section: "Utama" },
  { label: "Dashboard", icon: "grid", href: "dashboard.html", page: "dashboard" },
  { label: "Pesanan", icon: "shopping-bag", href: "pages/pesanan.html", page: "pesanan" },
  { section: "Katalog" },
  { label: "Produk", icon: "box", href: "pages/produk.html", page: "produk" },
  { label: "Kategori", icon: "tag", href: "pages/kategori.html", page: "kategori" },
  { label: "Banner", icon: "image", href: "pages/banner.html", page: "banner" },
  { label: "Promo", icon: "percent", href: "pages/promo.html", page: "promo" },
  { label: "Voucher", icon: "ticket", href: "pages/voucher.html", page: "voucher" },
  { section: "Operasional" },
  { label: "Ongkos Kirim", icon: "truck", href: "pages/ongkir.html", page: "ongkir" },
  { label: "Jam Operasional", icon: "clock", href: "pages/jam-operasional.html", page: "jam-operasional" },
  { label: "Area Pengiriman", icon: "map-pin", href: "pages/area-pengiriman.html", page: "area-pengiriman" },
  { section: "Data" },
  { label: "Pelanggan", icon: "users", href: "pages/pelanggan.html", page: "pelanggan" },
  { label: "Laporan", icon: "bar-chart", href: "pages/laporan.html", page: "laporan" },
  { section: "Sistem" },
  { label: "Pengaturan", icon: "settings", href: "pages/pengaturan.html", page: "pengaturan" },
  { label: "Admin", icon: "user-shield", href: "pages/admin.html", page: "admin" },
];

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  "shopping-bag": '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>',
  box: '<path d="M21 8L12 3 3 8l9 5 9-5z"/><path d="M3 8v10l9 5 9-5V8"/><path d="M12 13v10"/>',
  tag: '<path d="M20.59 13.41L11 22l-9-9L11 4h9.59A1.41 1.41 0 0122 5.41V13a1.41 1.41 0 01-1.41 1.41z" transform="rotate(180 12 12)"/><path d="M2 2l10.59 10.59a2 2 0 010 2.82L4 24"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  ticket: '<path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  "map-pin": '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  "bar-chart": '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  "user-shield": '<path d="M20.5 7.28a1 1 0 00-.4-.8l-7.5-4.5a1 1 0 00-1.2 0l-7.5 4.5a1 1 0 00-.4.8v6.72c0 5 3.5 8.5 8.5 10.5 5-2 8.5-5.5 8.5-10.5z"/><path d="M9 12l2 2 4-4"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  bell: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  moon: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
};

function svgIcon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

function renderAdminLayout(activePage, pageTitle) {
  const basePath = getAdminBasePath();
  const admin = getAdminInfo();

  const sidebarLinks = MENU_ITEMS.map((item) => {
    if (item.section) return `<div class="sidebar-section-label">${item.section}</div>`;
    const isActive = item.page === activePage;
    const badge = item.page === "pesanan" ? `<span class="sidebar-badge" id="sidebar-badge-pesanan" style="display:none">0</span>` : "";
    return `<a href="${basePath}${item.href}" class="${isActive ? "active" : ""}">${svgIcon(item.icon)}<span>${item.label}</span>${badge}</a>`;
  }).join("");

  const sidebarHtml = `
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="sidebar-brand">
        <img src="${basePath}../assets/images/logo-placeholder.svg" alt="Logo" onerror="this.style.display='none'">
        <span>Admin Panel</span>
      </div>
      <nav class="sidebar-nav">${sidebarLinks}</nav>
      <div class="sidebar-footer">
        <button class="btn-logout-sidebar" id="btn-logout">${svgIcon("logout")}<span>Keluar</span></button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;

  const topbarHtml = `
    <header class="admin-topbar">
      <div class="flex items-center gap-3" style="display:flex;align-items:center;gap:12px">
        <button id="sidebar-toggle-mobile" class="icon-btn">${svgIcon("menu")}</button>
        <span class="topbar-title">${pageTitle}</span>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" id="btn-notif-bell" title="Aktifkan notifikasi pesanan baru" style="position:relative">
          ${svgIcon("bell")}
          <span class="notif-dot" id="notif-dot" style="display:none"></span>
        </button>
        <button class="icon-btn btn-toggle-theme">
          <span class="theme-icon-moon">${svgIcon("moon")}</span>
          <span class="theme-icon-sun" style="display:none">${svgIcon("sun")}</span>
        </button>
        <div class="admin-avatar">${admin ? admin.nama_lengkap.charAt(0).toUpperCase() : "A"}</div>
      </div>
    </header>
  `;

  const root = document.getElementById("admin-root");
  root.insertAdjacentHTML("afterbegin", sidebarHtml);

  const main = document.createElement("div");
  main.className = "admin-main";
  main.innerHTML = topbarHtml + `<main class="admin-content" id="admin-page-content"></main>`;

  // Pindahkan konten halaman yang sudah ada ke dalam <main>
  const existingContent = document.getElementById("admin-page-content-source");
  root.appendChild(main);
  if (existingContent) {
    const target = document.getElementById("admin-page-content");
    // PENTING: pindahkan node DOM asli satu per satu (bukan innerHTML copy).
    // innerHTML akan membuang node lama & membuat node baru dari teks HTML,
    // sehingga event listener yang sudah dipasang sebelumnya (mis. submit form,
    // change pada input file) ikut hilang. appendChild memindahkan node yang
    // sama persis, jadi listener yang sudah terpasang tetap berfungsi.
    while (existingContent.firstChild) {
      target.appendChild(existingContent.firstChild);
    }
    existingContent.remove();
  }

  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("sidebar-toggle-mobile")?.addEventListener("click", () => {
    document.getElementById("admin-sidebar").classList.toggle("open");
    document.getElementById("sidebar-overlay").classList.toggle("show");
  });
  document.getElementById("sidebar-overlay")?.addEventListener("click", () => {
    document.getElementById("admin-sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("show");
  });
  document.querySelector(".btn-toggle-theme")?.addEventListener("click", toggleDarkMode);
  document.getElementById("btn-notif-bell")?.addEventListener("click", handleNotifBellClick);

  updateNotifBellIcon();
  updateSidebarBadge();
  if (activePage === "pesanan") {
    // Kunjungan ke halaman Pesanan dianggap sudah "melihat" semua pesanan sejauh ini
    markOrdersAsSeen();
  }
  startOrderNotificationPolling();

  // Registrasi service worker (PWA) untuk dashboard admin
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => {});
  }
}

async function handleLogout() {
  try { await AdminApi.logout(); } catch (err) { /* abaikan */ }
  clearToken();
  window.location.href = getAdminBasePath() + "index.html";
}

// ---------------- AUTH GUARD ----------------
async function requireAuthGuard() {
  const token = getToken();
  if (!token) {
    window.location.href = getAdminBasePath() + "index.html";
    return false;
  }
  try {
    const me = await AdminApi.me();
    setAdminInfo(me);
    return true;
  } catch (err) {
    return false;
  }
}

// ---------------- DARK MODE ----------------
function initDarkMode() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}
function toggleDarkMode() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  document.querySelectorAll(".theme-icon-sun").forEach((el) => (el.style.display = theme === "dark" ? "block" : "none"));
  document.querySelectorAll(".theme-icon-moon").forEach((el) => (el.style.display = theme === "dark" ? "none" : "block"));
}

// ---------------- TOAST ----------------
function showToast(message, type = "info", duration = 3000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------------- MODAL ----------------
function openModal(id) { document.getElementById(id)?.classList.add("show"); document.body.style.overflow = "hidden"; }
function closeModal(id) { document.getElementById(id)?.classList.remove("show"); document.body.style.overflow = ""; }
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) { e.target.classList.remove("show"); document.body.style.overflow = ""; }
  if (e.target.closest("[data-close-modal]")) { const id = e.target.closest("[data-close-modal]").dataset.closeModal; closeModal(id); }
});

// ---------------- CONFIRM DIALOG SEDERHANA ----------------
function confirmAction(message) {
  return window.confirm(message);
}

// ---------------- LOADING SCREEN ----------------
function hideLoadingScreen() {
  const el = document.getElementById("loading-screen");
  if (el) setTimeout(() => el.classList.add("hidden"), 200);
}

// ==========================================================
// NOTIFIKASI PESANAN BARU
// ==========================================================
const LAST_ORDER_ID_KEY = "warungmakan_last_order_id";
const UNSEEN_ORDER_COUNT_KEY = "warungmakan_unseen_order_count";
const NOTIF_POLL_INTERVAL_MS = 20000; // cek tiap 20 detik
let notifPollTimer = null;

function getLastOrderId() { return parseInt(localStorage.getItem(LAST_ORDER_ID_KEY) || "0", 10); }
function setLastOrderId(id) { localStorage.setItem(LAST_ORDER_ID_KEY, String(id)); }
function getUnseenCount() { return parseInt(localStorage.getItem(UNSEEN_ORDER_COUNT_KEY) || "0", 10); }
function setUnseenCount(n) { localStorage.setItem(UNSEEN_ORDER_COUNT_KEY, String(n)); }

function markOrdersAsSeen() {
  setUnseenCount(0);
  updateSidebarBadge();
}

function updateSidebarBadge() {
  const badge = document.getElementById("sidebar-badge-pesanan");
  if (!badge) return;
  const count = getUnseenCount();
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
  document.title = count > 0 ? `(${count}) Pesanan Baru` : document.title.replace(/^\(\d+\)\s*/, "");
}

function updateNotifBellIcon() {
  const dot = document.getElementById("notif-dot");
  if (!dot) return;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    dot.style.display = "block";
    dot.style.background = "var(--admin-success)";
  } else {
    dot.style.display = "block";
    dot.style.background = "var(--admin-text-muted)";
  }
}

async function handleNotifBellClick() {
  if (typeof Notification === "undefined") {
    showToast("Browser ini tidak mendukung notifikasi.", "info");
    return;
  }
  if (Notification.permission === "granted") {
    showToast("Notifikasi pesanan baru sudah aktif.", "success");
    return;
  }
  if (Notification.permission === "denied") {
    showToast("Notifikasi diblokir. Aktifkan lewat pengaturan izin browser untuk situs ini.", "error", 5000);
    return;
  }
  const result = await Notification.requestPermission();
  updateNotifBellIcon();
  if (result === "granted") {
    showToast("Notifikasi pesanan baru diaktifkan.", "success");
    new Notification("Notifikasi Aktif", { body: "Anda akan diberi tahu setiap ada pesanan baru masuk." });
  } else {
    showToast("Izin notifikasi tidak diberikan.", "info");
  }
}

// Bunyi "ting" sederhana via Web Audio API — tidak perlu file suara eksternal
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.32);
    });
    setTimeout(() => ctx.close(), 800);
  } catch (err) { /* abaikan jika audio tidak didukung */ }
}

async function checkForNewOrders() {
  try {
    const lastId = getLastOrderId();
    const result = await AdminApi.checkNewOrders(lastId);

    if (lastId === 0) {
      // Kunjungan pertama kali: jangan notifikasi untuk histori lama, cukup catat baseline
      setLastOrderId(result.latest_id);
      return;
    }

    if (result.new_orders && result.new_orders.length > 0) {
      playNotificationSound();
      setUnseenCount(getUnseenCount() + result.new_orders.length);
      updateSidebarBadge();

      const first = result.new_orders[0];
      const pesan = result.new_orders.length === 1
        ? `${first.nomor_pesanan} - ${first.nama} - ${formatRupiah(first.total)}`
        : `${result.new_orders.length} pesanan baru masuk`;

      showToast(`🔔 Pesanan baru! ${pesan}`, "success", 6000);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const notif = new Notification("Pesanan Baru Masuk!", {
          body: pesan,
          icon: "/assets/images/icon-192.png",
          tag: "pesanan-baru",
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = getAdminBasePath() + "pages/pesanan.html";
        };
      }

      setLastOrderId(result.latest_id);
    }
  } catch (err) {
    // Diamkan saja saat polling gagal (mis. koneksi terputus sesaat) agar tidak mengganggu
  }
}

function startOrderNotificationPolling() {
  if (notifPollTimer) clearInterval(notifPollTimer);
  checkForNewOrders();
  notifPollTimer = setInterval(checkForNewOrders, NOTIF_POLL_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
});
