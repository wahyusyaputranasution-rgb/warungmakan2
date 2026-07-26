// ==========================================================
// HELPERS - Response, CORS, Validasi, Rate Limit sederhana
// ==========================================================
import { verifyJWT } from "./crypto-utils.js";

export function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(message, status = 400, extraHeaders = {}) {
  return json({ success: false, error: message }, status, extraHeaders);
}

export function successResponse(data, extraHeaders = {}) {
  return json({ success: true, data }, 200, extraHeaders);
}

// ---------------- SANITASI INPUT SEDERHANA ----------------
export function sanitizeString(value, maxLength = 500) {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Hapus tag HTML/script dasar untuk mencegah XSS pada data yang ditampilkan mentah
  str = str.replace(/<script[^>]*>.*?<\/script>/gis, "");
  str = str.replace(/<[^>]+>/g, "");
  str = str.trim();
  if (str.length > maxLength) str = str.substring(0, maxLength);
  return str;
}

export function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function toFloat(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------- AUTH MIDDLEWARE ----------------
export async function requireAdmin(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token) return { ok: false, response: errorResponse("Token tidak ditemukan.", 401) };

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return { ok: false, response: errorResponse("Token tidak valid atau kedaluwarsa.", 401) };

  // Verifikasi sesi masih ada di DB (memungkinkan logout paksa / invalidasi)
  const tokenHash = await sha256HexLocal(token);
  const session = await env.DB.prepare(
    "SELECT * FROM admin_sessions WHERE token_hash = ? AND expires_at > datetime('now')"
  ).bind(tokenHash).first();

  if (!session) return { ok: false, response: errorResponse("Sesi tidak valid, silakan login kembali.", 401) };

  return { ok: true, admin: payload };
}

async function sha256HexLocal(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export { sha256HexLocal as sha256Hex };

// ---------------- RATE LIMITING SEDERHANA (in-memory per isolate) ----------------
// Catatan: Workers bersifat stateless per-isolate, jadi ini adalah proteksi dasar
// (best-effort). Untuk proteksi kuat, gunakan Cloudflare Rate Limiting Rules
// di dashboard Cloudflare (gratis, tidak butuh kode tambahan).
const rateLimitMap = new Map();

export function checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  if (entry.count > maxRequests) return false;
  return true;
}

// ---------------- HAVERSINE FORMULA ----------------
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius bumi (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------- NOMOR PESANAN OTOMATIS ----------------
export async function generateNomorPesanan(db) {
  const year = new Date().getFullYear();
  const prefix = `WM-${year}-`;
  const last = await db
    .prepare("SELECT nomor_pesanan FROM pesanan WHERE nomor_pesanan LIKE ? ORDER BY id DESC LIMIT 1")
    .bind(`${prefix}%`)
    .first();

  let nextNumber = 1;
  if (last && last.nomor_pesanan) {
    const parts = last.nomor_pesanan.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (Number.isFinite(lastNum)) nextNumber = lastNum + 1;
  }
  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
}

// ---------------- SLUG GENERATOR ----------------
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
