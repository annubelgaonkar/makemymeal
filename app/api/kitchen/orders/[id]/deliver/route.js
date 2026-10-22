import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isKitchen, unauthorized } from "@/lib/kitchenAuth";
import { decryptOtp, safeEqual } from "@/lib/secure";
import { toPublic } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_TRIES = 5;
const LOCK_MINUTES = 5;

// The only way an order becomes "delivered": the customer's OTP is checked here, on the server.
export async function POST(req, { params }) {
  if (!isKitchen()) return unauthorized();
  let body = {};
  try { body = await req.json(); } catch {}
  const otp = String(body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) return NextResponse.json({ error: "Enter the 6-digit OTP from the customer." }, { status: 400 });

  const { rows } = await query("SELECT * FROM orders WHERE id = $1", [params.id]);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (row.status !== "out") return NextResponse.json({ error: "Only orders that are out for delivery can be confirmed." }, { status: 409 });
  if (row.otp_locked_until && new Date(row.otp_locked_until) > new Date()) {
    return NextResponse.json({ error: "Too many wrong tries. Wait a few minutes and ask the customer to read the OTP again.", lockedUntil: row.otp_locked_until }, { status: 423 });
  }

  let real;
  try { real = decryptOtp(row.otp_enc, row.id); } catch { return NextResponse.json({ error: "Couldn't check the OTP." }, { status: 500 }); }

  if (!safeEqual(otp, real)) {
    const r = await query(
      `UPDATE orders SET
         otp_attempts = CASE WHEN otp_attempts + 1 >= $2 THEN 0 ELSE otp_attempts + 1 END,
         otp_locked_until = CASE WHEN otp_attempts + 1 >= $2 THEN now() + ($3 || ' minutes')::interval ELSE otp_locked_until END
       WHERE id = $1 RETURNING otp_attempts, otp_locked_until`,
      [row.id, MAX_TRIES, String(LOCK_MINUTES)]
    );
    const locked = r.rows[0].otp_locked_until && new Date(r.rows[0].otp_locked_until) > new Date();
    return NextResponse.json({
      error: locked ? `Too many wrong tries. OTP entry is locked for ${LOCK_MINUTES} minutes.` : (() => { const n = MAX_TRIES - r.rows[0].otp_attempts; return `That OTP doesn't match. ${n} ${n === 1 ? "try" : "tries"} left.`; })(),
    }, { status: locked ? 423 : 400 });
  }

  const done = await query(
    `UPDATE orders SET status = 'delivered', delivered_at = now(), updated_at = now(), otp_attempts = 0 WHERE id = $1 AND status = 'out' RETURNING *`,
    [row.id]
  );
  if (!done.rows.length) return NextResponse.json({ error: "This order was already updated." }, { status: 409 });
  return NextResponse.json({ order: toPublic(done.rows[0], { forKitchen: true }) });
}
