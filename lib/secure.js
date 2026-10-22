import crypto from "node:crypto";

function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SECRET must be set to a long random string");
  return s;
}
const key = (label) => crypto.createHash("sha256").update(label + ":" + secret()).digest();

export const randomId = (bytes = 12) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

export function newOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// OTPs are stored encrypted (AES-256-GCM); only the server can read them.
export function encryptOtp(otp, orderId) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key("otp"), iv);
  c.setAAD(Buffer.from(orderId));
  const enc = Buffer.concat([c.update(otp, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decryptOtp(blob, orderId) {
  const [iv, tag, enc] = String(blob).split(".").map((x) => Buffer.from(x, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key("otp"), iv);
  d.setAAD(Buffer.from(orderId));
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Kitchen login: a signed, expiring cookie value.
const SESSION_HOURS = 12;
export function signSession() {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const body = `kitchen.${exp}`;
  const sig = crypto.createHmac("sha256", key("session")).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function verifySession(value) {
  if (!value) return false;
  const parts = String(value).split(".");
  if (parts.length !== 3 || parts[0] !== "kitchen") return false;
  const body = `${parts[0]}.${parts[1]}`;
  const sig = crypto.createHmac("sha256", key("session")).update(body).digest("base64url");
  return safeEqual(sig, parts[2]) && Number(parts[1]) > Date.now();
}
export const SESSION_COOKIE = "mm_kitchen";
export const SESSION_MAX_AGE = SESSION_HOURS * 3600;
