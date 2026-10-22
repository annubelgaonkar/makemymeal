import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isKitchen, unauthorized } from "@/lib/kitchenAuth";
import { toPublic } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Only forward steps are allowed here. "Delivered" can only be set by the OTP check in /deliver.
const NEXT = { placed: "preparing", preparing: "out" };

export async function POST(req, { params }) {
  if (!isKitchen()) return unauthorized();
  let body = {};
  try { body = await req.json(); } catch {}
  const to = String(body.status || "");
  const from = Object.keys(NEXT).find((k) => NEXT[k] === to);
  if (!from) return NextResponse.json({ error: "That status change isn't allowed." }, { status: 400 });
  const { rows } = await query(
    `UPDATE orders SET status = $1, updated_at = now(), out_at = CASE WHEN $1 = 'out' THEN now() ELSE out_at END
     WHERE id = $2 AND status = $3 RETURNING *`,
    [to, params.id, from]
  );
  if (!rows.length) return NextResponse.json({ error: "This order has already moved on. Refresh the list." }, { status: 409 });
  return NextResponse.json({ order: toPublic(rows[0], { forKitchen: true }) });
}
