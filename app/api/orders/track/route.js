import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeEqual, sha256 } from "@/lib/secure";
import { toPublic } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The customer's browser sends [{id, token}] for its own orders; only matching tokens get data (and the OTP).
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const list = Array.isArray(body.orders) ? body.orders.slice(0, 50) : [];
  const ids = list.map((x) => String(x?.id || "")).filter(Boolean);
  if (!ids.length) return NextResponse.json({ orders: [] });
  const { rows } = await query("SELECT * FROM orders WHERE id = ANY($1)", [ids]);
  const orders = [];
  for (const row of rows) {
    const mine = list.find((x) => x.id === row.id);
    if (mine && safeEqual(sha256(mine.token || ""), row.token_hash)) orders.push(toPublic(row, { withOtp: true }));
  }
  return NextResponse.json({ orders });
}
