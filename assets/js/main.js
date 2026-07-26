// ==========================================================
// MAIN - UI Bersama (Header, Footer, Toast, Modal, Dark Mode)
// ==========================================================

// ---------------- LOADING SCREEN ----------------
function hideLoadingScreen() {
  const el = document.getElementById("loading-screen");
  if (el) setTimeout(() => el.classList.add("hidden"), 250);
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

// ---------------- TOAST NOTIFICATION ----------------
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
    toast.style.transform = "translateY(-12px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------------- MODAL ----------------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("show");
    document.body.style.overflow = "";
  }
});

// ---------------- HEADER / FOOTER DINAMIS (dari pengaturan Dashboard) ----------------
async function loadSiteInfo() {
  try {
    const settings = await Api.getSettings();
    window.__siteSettings = settings;

    document.querySelectorAll(".site-nama-warung").forEach((el) => (el.textContent = settings.nama_warung));
    document.querySelectorAll(".site-logo").forEach((el) => {
      if (settings.logo_url) el.src = settings.logo_url;
    });
    document.querySelectorAll(".site-alamat").forEach((el) => (el.textContent = settings.alamat || "-"));
    document.querySelectorAll(".site-whatsapp").forEach((el) => (el.textContent = settings.whatsapp || "-"));
    document.querySelectorAll(".site-whatsapp-link").forEach((el) => {
      if (settings.whatsapp) el.href = `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`;
    });
    document.querySelectorAll(".site-instagram-link").forEach((el) => {
      if (settings.instagram) { el.href = `https://instagram.com/${settings.instagram.replace("@", "")}`; el.style.display = "flex"; }
      else el.style.display = "none";
    });
    document.querySelectorAll(".site-facebook-link").forEach((el) => {
      if (settings.facebook) { el.href = settings.facebook; el.style.display = "flex"; }
      else el.style.display = "none";
    });
    document.querySelectorAll(".site-deskripsi").forEach((el) => (el.textContent = settings.deskripsi_singkat || ""));

    const statusPills = document.querySelectorAll(".status-buka-tutup");
    statusPills.forEach((el) => {
      if (settings.status_buka === 1) {
        el.textContent = "Buka";
        el.className = "status-pill buka status-buka-tutup";
      } else {
        el.textContent = "Tutup";
        el.className = "status-pill tutup status-buka-tutup";
      }
    });

    if (settings.favicon_url) {
      let favicon = document.querySelector("link[rel='icon']");
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = settings.favicon_url;
    }

    document.title = document.title.includes("|") ? document.title : `${document.title} | ${settings.nama_warung}`;
  } catch (err) {
    console.error("Gagal memuat pengaturan situs:", err);
  }
}

async function loadOperatingHoursFooter() {
  try {
    const hours = await Api.getOperatingHours();
    const container = document.querySelector(".jam-operasional-list");
    if (!container) return;
    const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    container.innerHTML = hours
      .map((h) => `<p><strong>${namaHari[h.hari]}:</strong> ${h.libur ? "Libur" : `${h.jam_buka} - ${h.jam_tutup}`}</p>`)
      .join("");
  } catch (err) {
    console.error("Gagal memuat jam operasional:", err);
  }
}

// ---------------- HIGHLIGHT NAV AKTIF ----------------
function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.main-nav a, .bottom-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage) link.classList.add("active");
  });
}

// ---------------- INIT GLOBAL ----------------
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  loadSiteInfo();
  loadOperatingHoursFooter();
  highlightActiveNav();
  Cart.updateBadge();

  document.querySelectorAll(".btn-toggle-theme").forEach((btn) => btn.addEventListener("click", toggleDarkMode));
  document.querySelectorAll(".modal-close, [data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal || btn.closest(".modal-overlay").id));
  });

  window.addEventListener("load", hideLoadingScreen);
  setTimeout(hideLoadingScreen, 2000); // fallback jika event load lambat
});
