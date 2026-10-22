"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { INGREDIENTS, NUTRIENTS, DELIVERY_FEE, defaultQty, itemTotal, nutrition, r1 } from "@/lib/menu";
import { AlertModal, Chips, Header, Pill, Toast, Track, browserNotify, chime, fmtTime, macros, primeAudio } from "@/components/ui";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false, loading: () => <div className="map-box"><div className="map" /></div> });

const LS_ORDERS = "mm_orders", LS_PROFILE = "mm_profile", LS_SEEN = "mm_lastSeen";
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function Sandwich({ qty }) {
  const layers = []; const slices = qty.bread; const pairs = Math.max(1, Math.floor(slices / 2));
  let pbLeft = qty.pb, bnLeft = qty.banana;
  for (let p = 0; p < slices; p++) {
    layers.push(<div key={"b" + p} className="layer bread" />);
    if (p < slices - 1 && (p % 2 === 0 || slices % 2)) {
      const share = Math.max(1, pairs - Math.floor(p / 2));
      const pbN = Math.ceil(pbLeft / share), bnN = Math.ceil(bnLeft / share);
      for (let k = 0; k < Math.min(pbN, 3); k++) layers.push(<div key={`p${p}${k}`} className="layer pb" />);
      for (let k = 0; k < Math.min(bnN, 3); k++) layers.push(<div key={`n${p}${k}`} className="layer banana" />);
      pbLeft -= pbN; bnLeft -= bnN;
    }
  }
  return <div className="sandwich" aria-hidden="true">{layers}</div>;
}

function NutritionPanel({ qty }) {
  const t = nutrition(qty);
  const pc = t.p * 4, cc = t.c * 4, fc = t.f * 9, all = pc + cc + fc || 1, pct = (x) => Math.round((x / all) * 100);
  return (
    <section className="panel stack" aria-labelledby="nutHead">
      <div className="nut-top">
        <div><h2 id="nutHead">Nutrition</h2><p className="meta" style={{ margin: "2px 0 0" }}>For the whole sandwich, updated as you change amounts</p></div>
        <div className="kcal-big"><strong>{t.kcal}</strong><span>kcal</span></div>
      </div>
      <div className="macro-cards">
        {NUTRIENTS.filter((n) => n.k !== "kcal").map((n) => <div className="macro" key={n.k}><span className="v">{t[n.k]}<small>{n.u}</small></span><span className="l">{n.label}</span></div>)}
      </div>
      <div>
        <div className="split" aria-hidden="true">
          <div className="m-p" style={{ width: `${(pc / all) * 100}%` }} /><div className="m-c" style={{ width: `${(cc / all) * 100}%` }} /><div className="m-f" style={{ width: `${(fc / all) * 100}%` }} />
        </div>
        <div className="split-legend"><span><i className="m-p" />Protein {pct(pc)}%</span><span><i className="m-c" />Carbs {pct(cc)}%</span><span><i className="m-f" />Fat {pct(fc)}%</span><span>of calories</span></div>
      </div>
      <div className="tbl-wrap">
        <table className="nut-table">
          <thead><tr><th>Per sandwich</th>{INGREDIENTS.map((i) => <th key={i.key}>{i.name.replace(" slices", "")}<small>× {qty[i.key]} {i.key === "banana" ? "" : i.unit}</small></th>)}<th className="tot">Total</th></tr></thead>
          <tbody>{NUTRIENTS.map((n) => (
            <tr key={n.k}><td>{n.label} ({n.u})</td>{INGREDIENTS.map((i) => { const v = qty[i.key] * i.n[n.k]; return <td key={i.key}>{n.k === "kcal" ? Math.round(v) : r1(v)}</td>; })}<td className="tot">{t[n.k]}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="meta" style={{ margin: 0 }}>Based on the labels of The Health Factory Zero Maida bread (whole wheat, 27 g slice) and Pintola All Natural Crunchy Unsweetened peanut butter (16 g tablespoon), plus a medium banana (118 g). Values are approximate.</p>
    </section>
  );
}

export default function OrderPage() {
  const [qty, setQty] = useState(defaultQty);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [pin, setPin] = useState(null);
  const [invalid, setInvalid] = useState({});
  const [err, setErr] = useState("");
  const [placing, setPlacing] = useState(false);
  const [refs, setRefs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alert, setAlert] = useState(null);
  const [toast, setToast] = useState("");
  const [lastSeen, setLastSeen] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const prev = useRef(null);
  const refsLoaded = useRef(false);

  useEffect(() => {
    const p = load(LS_PROFILE, null);
    if (p) { setForm((f) => ({ ...f, name: p.name || "", phone: p.phone || "", address: p.address || "" })); if (p.pin) setPin(p.pin); }
    setRefs(load(LS_ORDERS, []));
    setLastSeen(Number(load(LS_SEEN, 0)) || 0);
    refsLoaded.current = true;
    const close = (e) => { if (!e.target.closest(".bell-wrap")) setBellOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const raise = useCallback((a) => { setAlert(a); chime(); browserNotify(a.title, a.code ? `${a.body} OTP: ${a.code}` : a.body); }, []);

  // Poll the server for my orders' status every 5 seconds.
  const poll = useCallback(async (list) => {
    if (!list.length) { setOrders([]); return; }
    try {
      const res = await fetch("/api/orders/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orders: list }), cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const got = data.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (prev.current) {
        for (const o of got) {
          const before = prev.current[o.id];
          if (!before || before.status === o.status) continue;
          if (o.status === "out") raise({ title: `${o.shortId} is out for delivery`, body: "Your sandwich is on its way. Keep this OTP ready and share it only at your door.", code: before.otp || o.otp });
          if (o.status === "delivered") raise({ title: `${o.shortId} delivered`, body: "Your OTP was verified at the door. Enjoy your sandwich!" });
        }
      }
      const map = {}; got.forEach((o) => { map[o.id] = { status: o.status, otp: o.otp || prev.current?.[o.id]?.otp }; });
      prev.current = map;
      setOrders(got);
    } catch {}
  }, [raise]);

  useEffect(() => {
    if (!refsLoaded.current) return;
    poll(refs);
    const t = setInterval(() => poll(refs), 5000);
    return () => clearInterval(t);
  }, [refs, poll]);

  const setField = (k) => (e) => {
    let v = e.target.value;
    if (k === "phone") v = v.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, [k]: v })); setInvalid((x) => ({ ...x, [k]: false }));
  };
  const step = (key, d) => setQty((q) => { const i = INGREDIENTS.find((x) => x.key === key); return { ...q, [key]: Math.min(i.max, Math.max(i.min, q[key] + d)) }; });

  async function placeOrder() {
    primeAudio();
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {}
    setErr("");
    const name = form.name.trim(), phone = form.phone.trim(), address = form.address.trim();
    const missing = []; if (!name) missing.push("name"); if (!phone) missing.push("phone"); if (!address) missing.push("address");
    if (missing.length) {
      setInvalid(Object.fromEntries(missing.map((m) => [m, true])));
      const words = { name: "name", phone: "phone number", address: "delivery address" };
      setErr("Fill in your " + missing.map((m) => words[m]).join(", ").replace(/, ([^,]*)$/, " and $1") + " to place the order.");
      document.getElementById("c-" + missing[0])?.focus(); return;
    }
    if (name.length < 2) { setInvalid({ name: true }); setErr("Enter your full name."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setInvalid({ phone: true }); setErr("Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9."); return; }
    if (address.length < 8) { setInvalid({ address: true }); setErr("Enter a full delivery address with flat, building and area."); return; }
    if (qty.pb === 0 && qty.banana === 0) { setErr("Add peanut butter or banana. Plain bread isn't much of a sandwich."); return; }

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, phone, address, note: form.note, pin, items: qty }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "The order didn't go through. Try again."); return; }
      const next = [{ id: data.order.id, token: data.token }, ...refs].slice(0, 50);
      save(LS_ORDERS, next); setRefs(next);
      save(LS_PROFILE, { name, phone, address, pin });
      prev.current = { ...(prev.current || {}), [data.order.id]: { status: data.order.status, otp: data.order.otp } };
      setOrders((o) => [data.order, ...o.filter((x) => x.id !== data.order.id)]);
      setForm((f) => ({ ...f, note: "" }));
      raise({
        title: `OTP for ${data.order.shortId}`,
        body: data.sms === "sent" ? `Order sent to your chef. We've also texted this OTP to +91 ${phone}. Share it only when the delivery person is at your door.` : "Order sent to your chef. Share this OTP only when the delivery person is at your door. It's also saved under the bell and in My orders.",
        code: data.order.otp,
      });
    } catch { setErr("The order didn't go through. Check your connection and try again."); }
    finally { setPlacing(false); }
  }

  // Notifications derived from my orders.
  const notifs = [];
  orders.forEach((o) => {
    const otp = o.otp || prev.current?.[o.id]?.otp;
    notifs.push({ t: o.createdAt, kind: "otp", title: `OTP for ${o.shortId}`, text: otp ? `Your delivery OTP is ${otp}. Share it only when the delivery person is at your door.` : "Your delivery OTP was created." });
    if (o.outAt) notifs.push({ t: o.outAt, kind: "out", title: `${o.shortId} is out for delivery`, text: otp ? `Keep your OTP ${otp} ready.` : "Keep your OTP ready." });
    if (o.deliveredAt) notifs.push({ t: o.deliveredAt, kind: "done", title: `${o.shortId} delivered`, text: "OTP verified at your door. Enjoy!" });
  });
  notifs.sort((a, b) => new Date(b.t) - new Date(a.t));
  const unread = notifs.filter((n) => new Date(n.t).getTime() > lastSeen).length;
  function toggleBell(e) {
    e.stopPropagation();
    const open = !bellOpen; setBellOpen(open);
    if (open) setTimeout(() => { const now = Date.now(); setLastSeen(now); save(LS_SEEN, now); }, 1500);
  }

  const bell = (
    <div className="bell-wrap">
      <button className="bell" aria-label="Notifications" aria-expanded={bellOpen} onClick={toggleBell}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z" /></svg>
        {unread > 0 && <span className="count">{unread}</span>}
      </button>
      {bellOpen && (
        <div className="notif-panel"><div className="label" style={{ padding: "10px 14px 4px" }}>Notifications</div>
          <ul>{notifs.length ? notifs.slice(0, 30).map((n, k) => (
            <li key={k} className={`n-${n.kind}${new Date(n.t).getTime() > lastSeen ? " unread" : ""}`}><b>{n.title}</b><span>{n.text}</span><time>{fmtTime(n.t)}</time></li>
          )) : <li className="none">No notifications yet. Your OTP and delivery updates will appear here.</li>}</ul>
        </div>
      )}
    </div>
  );

  const subtotal = itemTotal(qty);
  return (
    <div className="wrap">
      <Header active="order" right={bell} />
      <main>
        <section>
          <h1>Peanut butter &amp; banana, made fresh.</h1>
          <p className="lede">Pick how much of each goes in. Your chef starts as soon as you order.</p>
        </section>

        <section className="panel">
          <div className="builder">
            <Sandwich qty={qty} />
            <div className="ingredients">
              {INGREDIENTS.map((i) => (
                <div className="ing" key={i.key}>
                  <div className={`swatch ${i.key}`} />
                  <div>
                    <div className="ing-name">{i.name}</div>
                    {i.brand && <div className="ing-brand">{i.brand}</div>}
                    <div className="ing-unit">₹{i.price} per {i.per}</div>
                    <div className="ing-nut"><b>{i.n.kcal}</b> kcal · P {i.n.p}g · C {i.n.c}g · F {i.n.f}g</div>
                  </div>
                  <div className="stepper">
                    <button aria-label={`Less ${i.name}`} disabled={qty[i.key] <= i.min} onClick={() => step(i.key, -1)}>−</button>
                    <output aria-live="polite">{qty[i.key]}</output>
                    <button aria-label={`More ${i.name}`} disabled={qty[i.key] >= i.max} onClick={() => step(i.key, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bill">
            {INGREDIENTS.map((i) => <div key={i.key}><span>{i.name} <span className="q">{qty[i.key]} × ₹{i.price}</span></span><span>₹{qty[i.key] * i.price}</span></div>)}
            <div className="sub"><span>Item total</span><span>₹{subtotal}</span></div>
            <div><span>Delivery charge</span><span>₹{DELIVERY_FEE}</span></div>
          </div>
          <div className="total"><span className="label">Order charge</span><strong>₹{subtotal + DELIVERY_FEE}</strong></div>
          <p className="meta" style={{ margin: "6px 0 0" }}>Test mode: this shows what you&apos;d pay. No payment is taken.</p>
        </section>

        <NutritionPanel qty={qty} />

        <section className="panel stack">
          <h2>Your details</h2>
          <p className="meta" style={{ margin: "-8px 0 0" }}>Shared with your chef so they know who it&apos;s for and where to send it. Saved on this device for next time. Fields marked <span className="req">*</span> are required.</p>
          <div className="row2">
            <div className="field"><label htmlFor="c-name">Full name <span className="req" aria-hidden="true">*</span></label>
              <input id="c-name" required autoComplete="name" placeholder="Anu Belgaonkar" value={form.name} onChange={setField("name")} aria-invalid={invalid.name || undefined} /></div>
            <div className="field"><label htmlFor="c-phone">Phone number <span className="req" aria-hidden="true">*</span></label>
              <div className="phone"><span>+91</span><input id="c-phone" required inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="98765 43210" value={form.phone} onChange={setField("phone")} aria-invalid={invalid.phone || undefined} /></div></div>
          </div>
          <div className="field"><label htmlFor="c-address">Delivery address <span className="req" aria-hidden="true">*</span></label>
            <textarea id="c-address" required autoComplete="street-address" placeholder="Flat, building, street, area, city, PIN" value={form.address} onChange={setField("address")} aria-invalid={invalid.address || undefined} /></div>
          <div className="field"><span className="label" style={{ fontSize: 13, textTransform: "none", letterSpacing: 0, color: "var(--ink)", fontWeight: 600 }}>Exact location pin <span className="opt">(recommended)</span></span>
            <MapPicker value={pin} onChange={setPin} />
            <p className="meta" style={{ margin: 0 }}>Tap the map, drag the pin onto your building, or use your current location. The delivery person uses it to find your door.</p>
          </div>
          <div className="field"><label htmlFor="c-note">Note for the chef (optional)</label>
            <input id="c-note" placeholder="Toast the bread lightly, cut diagonally" maxLength={200} value={form.note} onChange={setField("note")} /></div>
          <div className="err" role="alert">{err}</div>
          <button className="btn primary" onClick={placeOrder} disabled={placing}>{placing ? "Placing order…" : "Place order"}</button>
        </section>

        <section>
          <h2>My orders</h2>
          <div className="stack" style={{ marginTop: 12 }}>
            {!orders.length && <div className="empty">Your orders will show here with live status and the delivery OTP.</div>}
            {orders.map((o) => {
              const otp = o.otp || prev.current?.[o.id]?.otp;
              return (
                <article className="order" key={o.id}>
                  <div className="order-top"><div><h3>{o.shortId}</h3><div className="oid">{fmtTime(o.createdAt)} · ₹{o.total}</div></div><Pill status={o.status} /></div>
                  <Chips items={o.items} />
                  <Track status={o.status} />
                  <div className="meta">{macros(o.items)}</div>
                  <div className="meta">Items ₹{o.subtotal} + delivery ₹{o.deliveryFee} = <b>₹{o.total}</b> · test mode, not charged</div>
                  {o.status === "delivered"
                    ? <div className="meta">Delivered {fmtTime(o.deliveredAt)} · OTP verified. Enjoy!</div>
                    : <div className="otp"><div><div className="label">Delivery OTP</div><small>Only you can see this. Share it only when the delivery person is at your door.</small></div><div className="otp-code">{otp || "••••••"}</div></div>}
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <Toast msg={toast} />
      <AlertModal alert={alert} onClose={() => setAlert(null)} />
    </div>
  );
}
