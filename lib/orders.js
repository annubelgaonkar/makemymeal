import { decryptOtp } from "./secure";

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Shape a database row for the browser. The OTP is included only for the customer who owns the order. */
export function toPublic(row, { withOtp = false, forKitchen = false } = {}) {
  const o = {
    id: row.id,
    shortId: row.short_id,
    items: row.items,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    status: row.status,
    createdAt: iso(row.created_at),
    outAt: iso(row.out_at),
    deliveredAt: iso(row.delivered_at),
    pin: row.pin_lat != null ? { lat: row.pin_lat, lng: row.pin_lng } : null,
  };
  if (forKitchen) {
    Object.assign(o, {
      name: row.name, phone: row.phone, address: row.address, note: row.note,
      otpLockedUntil: iso(row.otp_locked_until),
      otpTriesLeft: Math.max(0, 5 - (row.otp_attempts || 0)),
    });
  }
  if (withOtp && row.status !== "delivered") {
    try { o.otp = decryptOtp(row.otp_enc, row.id); } catch { o.otp = null; }
  }
  return o;
}
