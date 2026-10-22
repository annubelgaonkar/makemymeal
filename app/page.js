"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { INGREDIENTS, NUTRIENTS, DELIVERY_FEE, defaultQty, itemTotal, nutrition, r1 } from "@/lib/menu";
import { AlertModal, BellIcon, Chips, CheckIcon, OtpDigits, Pill, Toast, TopBar, Tracker, browserNotify, chime, fmtTime, primeAudio } from "@/components/ui";
import { ICONS, SandwichArt } from "@/components/art";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false, loading: () => <div className="map-box"><div className="map" /></div> });

const LS_ORDERS = "mm_orders", LS_PROFILE = "mm_profile", LS_SEEN = "mm_lastSeen";
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function Receipt({ qty }) {
  const subtotal = itemTotal(qty);
  return (
    <>
      {INGREDIENTS.map((i) => (
        <div className="receipt-row" key={i.key}>
          <span>{i.name} <span className="q">× {qty[i.key]}</span></span><span>₹{qty[i.key] * i.price}</span>
        </div>
      ))}
      <hr className="receipt-rule" />
      <div className="receipt-row"><span>Item total</span><span>₹{subtotal}</span></div>
      <div className="receipt-row"><span>Delivery</span><span>₹{DELIVERY_FEE}</span></div>
      <hr className="receipt-rule" />
      <div className="receipt-total"><span className="label">To pay</span><strong>₹{subtotal + DELIVERY_FEE}</strong></div>
      <p className="test-note"><i />Test mode. No payment is taken.</p>
    </>
  );
}

function Nutrition({ qty }) {
  const t = nutrition(qty);
  const pc = t.p * 4, cc = t.c * 4, fc = t.f * 9, all = pc + cc + fc || 1;
  const rows = [["Protein", t.p, pc, "c-p"], ["Carbs", t.c, cc, "c-c"], ["Fat", t.f, fc, "c-f"]];
  return (
    <section aria-labelledby="nutHead">
      <div className="sec-head"><div><h2 id="nutHead">Nutrition</h2><p>For the whole sandwich. Bars show each macro&apos;s share of the calories.</p></div></div>
      <div className="nut">
        <div className="kcal"><strong>{t.kcal}</strong><span>kcal</span></div>
        <div className="macros">
          {rows.map(([name, g, cal, cls]) => (
            <div className="macro-row" key={name}>
              <span>{name}</span>
              <span className="bar"><i className={cls} style={{ width: `${(cal / all) * 100}%` }} /></span>
              <span className="v">{g} g</span>
            </div>
          ))}
          <div className="extras"><span>Fibre <b>{t.fib} g</b></span><span>Sugars <b>{t.sug} g</b></span></div>
        </div>
        <details className="breakdown">
          <summary>See it ingredient by ingredient</summary>
          <div className="tbl-wrap">
            <table className="nut-table">
              <thead><tr><th>Nutrient</th>{INGREDIENTS.map((i) => <th key={i.key}>{i.name.replace(" slices", "")} ×{qty[i.key]}</th>)}<th className="tot">Total</th></tr></thead>
              <tbody>{NUTRIENTS.map((n) => (
                <tr key={n.k}><td>{n.label} ({n.u})</td>{INGREDIENTS.map((i) => { const v = qty[i.key] * i.n[n.k]; return <td key={i.key}>{n.k === "kcal" ? Math.round(v) : r1(v)}</td>; })}<td className="tot">{t[n.k]}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="hint source">From the labels of The Health Factory Zero Maida bread (27 g slice) and Pintola All Natural Crunchy Unsweetened peanut butter (16 g tablespoon), plus a medium banana (118 g). Values are approximate.</p>
        </details>
      </div>
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
      <button className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} new` : ""}`} aria-expanded={bellOpen} onClick={toggleBell}>
        <BellIcon />{unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {bellOpen && (
        <div className="notif-panel"><h3>Updates</h3>
          <ul>{notifs.length ? notifs.slice(0, 30).map((n, k) => (
            <li key={k} className={new Date(n.t).getTime() > lastSeen ? "unread" : ""}><b>{n.title}</b><span>{n.text}</span><time>{fmtTime(n.t)}</time></li>
          )) : <li className="none">Your OTP and delivery updates will show up here.</li>}</ul>
        </div>
      )}
    </div>
  );

  const total = itemTotal(qty) + DELIVERY_FEE;
  const kcal = nutrition(qty).kcal;
  const orderBtn = (
    <button className="btn btn-primary" onClick={placeOrder} disabled={placing}>
      {placing ? "Placing your order…" : <>Place order <span className="price">₹{total}</span></>}
    </button>
  );

  return (
    <>
      <TopBar active="order" right={bell} />
      <main className="page">
        <section className="hero">
          <h1>Build your peanut butter banana sandwich.</h1>
          <p>Choose how much bread, peanut butter and banana goes in. Your chef makes it fresh and it&apos;s handed over only when you share your OTP at the door.</p>
        </section>

        <aside className="side" aria-label="Your sandwich">
          <div className="stage">
            <SandwichArt qty={qty} />
            <div className="stage-cap"><span><b>{kcal}</b>kcal</span><span><b>{r1(nutrition(qty).p)}</b>g protein</span></div>
          </div>
          <div className="receipt-wrap">
            <div className="receipt">
              <Receipt qty={qty} />
              <div style={{ marginTop: 18 }}>{orderBtn}</div>
              <div className="err" role="alert" style={{ marginTop: 10 }}>{err}</div>
            </div>
          </div>
        </aside>

        <section aria-labelledby="buildHead">
          <div className="sec-head"><div><h2 id="buildHead">What goes in</h2><p>Tap + and − and watch the sandwich change.</p></div></div>
          <div className="ings">
            {INGREDIENTS.map((i) => {
              const Icon = ICONS[i.key];
              return (
                <div className={`ing ${qty[i.key] > 0 ? "on" : ""}`} key={i.key}>
                  <div className="ing-art"><Icon size={46} /></div>
                  <div>
                    <div className="ing-name">{i.name}</div>
                    {i.brand && <div className="ing-brand">{i.brand}</div>}
                    <div className="ing-facts"><span><b>₹{i.price}</b> per {i.per}</span><span>{i.n.kcal} kcal</span><span>{i.n.p} g protein</span></div>
                  </div>
                  <div className="stepper">
                    <button aria-label={`Less ${i.name}`} disabled={qty[i.key] <= i.min} onClick={() => step(i.key, -1)}>−</button>
                    <output aria-live="polite">{qty[i.key]}</output>
                    <button className="plus" aria-label={`More ${i.name}`} disabled={qty[i.key] >= i.max} onClick={() => step(i.key, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mobile-only" aria-label="Bill">
          <div className="receipt"><Receipt qty={qty} /></div>
        </section>

        <Nutrition qty={qty} />

        <section aria-labelledby="detailsHead">
          <div className="sec-head"><div><h2 id="detailsHead">Where should it go?</h2><p>Your chef sees these details. They&apos;re saved on this device for next time.</p></div></div>
          <div className="form">
            <div className="row2">
              <div className="field"><label htmlFor="c-name">Full name <span className="req">*</span></label>
                <input id="c-name" required autoComplete="name" placeholder="Anuradha Belgaonkar" value={form.name} onChange={setField("name")} aria-invalid={invalid.name || undefined} /></div>
              <div className="field"><label htmlFor="c-phone">Mobile number <span className="req">*</span></label>
                <div className="phone"><span>+91</span><input id="c-phone" required inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="98765 43210" value={form.phone} onChange={setField("phone")} aria-invalid={invalid.phone || undefined} /></div></div>
            </div>
            <div className="field"><label htmlFor="c-address">Delivery address <span className="req">*</span></label>
              <textarea id="c-address" required autoComplete="street-address" placeholder="Flat, building, street, area, city, PIN" value={form.address} onChange={setField("address")} aria-invalid={invalid.address || undefined} /></div>
            <div className="field"><span className="flabel">Pin your door <span className="opt">(recommended)</span></span>
              <MapPicker value={pin} onChange={setPin} />
              <p className="hint">Tap the map or use your current location, then drag the pin onto your building.</p>
            </div>
            <div className="field"><label htmlFor="c-note">Note for the chef <span className="opt">(optional)</span></label>
              <input id="c-note" placeholder="Toast the bread lightly, cut diagonally" maxLength={200} value={form.note} onChange={setField("note")} /></div>
            <div className="mobile-only"><div className="err" role="alert">{err}</div></div>
          </div>
        </section>

        <section aria-labelledby="ordersHead">
          <div className="sec-head"><div><h2 id="ordersHead">Your orders</h2><p>Live status and your delivery OTP.</p></div></div>
          <div className="orders">
            {!orders.length && <div className="empty">No orders yet. Build your sandwich above and place your first one.</div>}
            {orders.map((o) => {
              const otp = o.otp || prev.current?.[o.id]?.otp;
              return (
                <article className="order" key={o.id}>
                  <div className="order-top">
                    <div><h3>Order {o.shortId}</h3><div className="order-sub">{fmtTime(o.createdAt)}</div></div>
                    <Pill status={o.status} />
                  </div>
                  <Tracker status={o.status} />
                  <Chips items={o.items} />
                  <div className="order-meta">
                    <span>Total <b>₹{o.total}</b>, not charged in test mode</span>
                    <span><b>{nutrition(o.items).kcal}</b> kcal</span>
                    <span><b>{nutrition(o.items).p} g</b> protein</span>
                  </div>
                  {o.status === "delivered"
                    ? <div className="delivered-note"><CheckIcon />Delivered at {new Date(o.deliveredAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}. OTP verified. Enjoy!</div>
                    : <div className="otp"><span className="label">Your delivery OTP</span><OtpDigits code={otp} /><p>Only you can see this. Read it out only when the delivery person is at your door.</p></div>}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <div className="order-bar">
        <div className="sum"><strong>₹{total}</strong><span>{kcal} kcal, incl. ₹{DELIVERY_FEE} delivery</span></div>
        <button className="btn btn-primary" onClick={placeOrder} disabled={placing}>{placing ? "Placing…" : "Place order"}</button>
      </div>
      <Toast msg={toast} />
      <AlertModal alert={alert} onClose={() => setAlert(null)} />
    </>
  );
}
