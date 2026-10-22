import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cleanItems, itemTotal, DELIVERY_FEE } from "@/lib/menu";
import { encryptOtp, newOtp, randomId, sha256 } from "@/lib/secure";
import { sendOtpSms } from "@/lib/sms";
import { toPublic } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bad = (error) => NextResponse.json({ error }, { status: 400 });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return bad("Invalid request."); }

  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").replace(/\D/g, "");
  const address = String(body.address || "").trim().slice(0, 400);
  const note = String(body.note || "").trim().slice(0, 200);
  if (name.length < 2) return bad("Enter your full name.");
  if (!/^[6-9]\d{9}$/.test(phone)) return bad("Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
  if (address.length < 8) return bad("Enter a full delivery address with flat, building and area.");

  let lat = null, lng = null;
  if (body.pin) {
    lat = Number(body.pin.lat); lng = Number(body.pin.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return bad("The location pin is invalid.");
  }

  const items = cleanItems(body.items);
  if (!items) return bad("Check the ingredient amounts. Add peanut butter or banana.");

  // Simple abuse limit: at most 5 orders per phone number per hour.
  const recent = await query("SELECT count(*)::int AS n FROM orders WHERE phone = $1 AND created_at > now() - interval '1 hour'", [phone]);
  if (recent.rows[0].n >= 5) return NextResponse.json({ error: "Too many orders from this number. Try again in an hour." }, { status: 429 });

  const id = randomId(12);
  const token = randomId(24);
  const otp = newOtp();
  const shortId = "MM-" + sha256(id).slice(0, 5).toUpperCase();
  const subtotal = itemTotal(items);

  const { rows } = await query(
    `INSERT INTO orders (id, short_id, token_hash, name, phone, address, pin_lat, pin_lng, note, items, subtotal, delivery_fee, total, otp_enc)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [id, shortId, sha256(token), name, phone, address, lat, lng, note || null, JSON.stringify(items), subtotal, DELIVERY_FEE, subtotal + DELIVERY_FEE, encryptOtp(otp, id)]
  );

  const sms = await sendOtpSms({ phone, otp, shortId });
  await query("UPDATE orders SET sms_status = $1 WHERE id = $2", [sms, id]);

  return NextResponse.json({ order: toPublic(rows[0], { withOtp: true }), token, sms }, { status: 201 });
}
