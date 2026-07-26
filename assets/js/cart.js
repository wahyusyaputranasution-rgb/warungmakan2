// ==========================================================
// CART - Manajemen Keranjang Belanja (localStorage)
// ==========================================================

const CART_KEY = "warungmakan_cart";

const Cart = {
  getItems() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Cart.updateBadge();
  },

  addItem(produk, jumlah = 1) {
    const items = Cart.getItems();
    const existing = items.find((i) => i.produk_id === produk.id);
    if (existing) {
      existing.jumlah += jumlah;
    } else {
      items.push({
        produk_id: produk.id,
        nama: produk.nama,
        harga: produk.harga,
        foto_url: produk.foto_url,
        jumlah,
        catatan: "",
        stok: produk.stok,
      });
    }
    Cart.saveItems(items);
  },

  updateQty(produkId, jumlah) {
    let items = Cart.getItems();
    const item = items.find((i) => i.produk_id === produkId);
    if (!item) return;
    if (jumlah <= 0) {
      items = items.filter((i) => i.produk_id !== produkId);
    } else {
      item.jumlah = jumlah;
    }
    Cart.saveItems(items);
  },

  updateNote(produkId, catatan) {
    const items = Cart.getItems();
    const item = items.find((i) => i.produk_id === produkId);
    if (item) item.catatan = catatan;
    Cart.saveItems(items);
  },

  removeItem(produkId) {
    const items = Cart.getItems().filter((i) => i.produk_id !== produkId);
    Cart.saveItems(items);
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    Cart.updateBadge();
  },

  getTotalItems() {
    return Cart.getItems().reduce((sum, i) => sum + i.jumlah, 0);
  },

  getSubtotal() {
    return Cart.getItems().reduce((sum, i) => sum + i.harga * i.jumlah, 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll(".cart-badge");
    const count = Cart.getTotalItems();
    badges.forEach((badge) => {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = count > 0 ? "flex" : "none";
    });
  },
};

document.addEventListener("DOMContentLoaded", Cart.updateBadge);
