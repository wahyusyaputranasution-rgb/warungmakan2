// ==========================================================
// CRYPTO UTILITIES - JWT & Password Hashing
// Menggunakan Web Crypto API bawaan Cloudflare Workers
// Tidak ada dependency eksternal.
// ==========================================================

function bufToHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function bufToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuf(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function textToBuf(str) {
  return new TextEncoder().encode(str);
}

function bufToText(buffer) {
  return new TextDecoder().decode(buffer);
}

// ---------------- PASSWORD HASHING (SHA-256 + salt tetap) ----------------
// Catatan: untuk keamanan produksi tingkat tinggi, pertimbangkan PBKDF2 (juga
// tersedia di Web Crypto). Di sini kami memakai PBKDF2-SHA256 asli, bukan
// SHA-256 polos, agar tahan brute-force.

const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  let salt;
  if (saltHex) {
    salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = bufToHex(derivedBits);
  const saltHexOut = bufToHex(salt);
  return `${saltHexOut}:${hashHex}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [saltHex, hashHex] = storedHash.split(":");
  const recomputed = await hashPassword(password, saltHex);
  const [, recomputedHash] = recomputed.split(":");
  return timingSafeEqual(recomputedHash, hashHex);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---------------- JWT (HMAC-SHA256) ----------------

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    textToBuf(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload, secret, expiresInSeconds = 86400) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerB64 = bufToBase64Url(textToBuf(JSON.stringify(header)));
  const payloadB64 = bufToBase64Url(textToBuf(JSON.stringify(fullPayload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textToBuf(unsigned));
  const signatureB64 = bufToBase64Url(signature);

  return `${unsigned}.${signatureB64}`;
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const unsigned = `${headerB64}.${payloadB64}`;

    const key = await getHmacKey(secret);
    const signatureBuf = base64UrlToBuf(signatureB64);
    const valid = await crypto.subtle.verify("HMAC", key, signatureBuf, textToBuf(unsigned));
    if (!valid) return null;

    const payload = JSON.parse(bufToText(base64UrlToBuf(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", textToBuf(text));
  return bufToHex(digest);
}

export { bufToHex, bufToBase64Url, base64UrlToBuf };
