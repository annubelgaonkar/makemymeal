"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chips, Header, Pill, Toast, chime, fmtTime, macros, mapsUrl, primeAudio } from "@/components/ui";

export default function KitchenPage() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("active");
  const [otpInput, setOtpInput] = useState({});
  const [otpErr, setOtpErr] = useState({});
  const [busy, setBusy] = useState({});
  const [toast, setToast] = useState("");
  const known = useRef(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/orders", { cache: "no-store" });
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) return;
      const data = await res.json();
      setAuthed(true);
      if (known.current) {
        const fresh = data.orders.filter((o) => !known.current.has(o.id));
        if (fresh.length) {
          chime(); showToast(fresh.length === 1 ? `New order ${fresh[0].shortId}` : `${fresh.length} new orders`);
          document.title = "● New order · Kitchen";
        }
      }
      known.current = new Set(data.orders.map((o) => o.id));
      setOrders(data.orders);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const reset = () => { document.title = "Kitchen · makemymeal.com"; };
    reset(); window.addEventListener("focus", reset); document.addEventListener("click", reset);
    return () => { clearInterval(t); window.removeEventListener("focus", reset); document.removeEventListener("click", reset); };
  }, [load]);

  async function login(e) {
    e.preventDefault(); primeAudio(); setLoginErr("");
    const res = await fetch("/api/kitchen/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setLoginErr(data.error || "Couldn't log in."); return; }
    setPassword(""); known.current = null; load();
  }
  async function logout() { await fetch("/api/kitchen/logout", { method: "POST" }); setAuthed(false); setOrders([]); }

  async function move(o, status) {
    primeAudio(); setBusy((b) => ({ ...b, [o.id]: true }));
    const res = await fetch(`/api/kitchen/orders/${o.id}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json().catch(() => ({}));
    setBusy((b) => ({ ...b, [o.id]: false }));
    if (!res.ok) { showToast(data.error || "Couldn't update the order."); }
    load();
  }
  async function deliver(o) {
    const otp = (otpInput[o.id] || "").trim();
    if (!/^\d{6}$/.test(otp)) { setOtpErr((x) => ({ ...x, [o.id]: "Enter the 6-digit OTP from the customer." })); return; }
    setBusy((b) => ({ ...b, [o.id]: true })); setOtpErr((x) => ({ ...x, [o.id]: "Checking…" }));
    const res = await fetch(`/api/kitchen/orders/${o.id}/deliver`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otp }) });
    const data = await res.json().catch(() => ({}));
    setBusy((b) => ({ ...b, [o.id]: false }));
    if (!res.ok) { setOtpErr((x) => ({ ...x, [o.id]: data.error || "Couldn't confirm delivery." })); load(); return; }
    setOtpErr((x) => ({ ...x, [o.id]: "" })); setOtpInput((x) => ({ ...x, [o.id]: "" }));
    showToast(`${o.shortId} delivered · OTP verified`); load();
  }

  if (authed === false) {
    return (
      <div className="wrap">
        <Header active="kitchen" />
        <form className="panel stack login" onSubmit={login}>
          <h1 style={{ fontSize: 26 }}>Kitchen login</h1>
          <p className="meta" style={{ margin: 0 }}>Enter the kitchen password to see orders.</p>
          <div className="field"><label htmlFor="k-pass">Kitchen password</label>
            <input id="k-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></div>
          <div className="err" role="alert">{loginErr}</div>
          <button className="btn primary" type="submit">Open kitchen</button>
        </form>
      </div>
    );
  }

  const active = orders.filter((o) => o.status !== "delivered");
  let list = filter === "active" ? active : filter === "delivered" ? orders.filter((o) => o.status === "delivered") : orders.slice();
  list = list.sort((a, b) => (filter === "active" ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)));

  return (
    <div className="wrap">
      <Header active="kitchen" />
      <main>
        <section className="kitchen-bar">
          <div><h1>Kitchen</h1><p className="lede">New orders arrive here with a chime. Ask the customer for their OTP at the door to complete delivery.</p></div>
          {authed && <button className="btn small ghost" onClick={logout}>Log out</button>}
        </section>
        <section className="filters">
          {[["active", `Active (${active.length})`], ["delivered", "Delivered"], ["all", "All"]].map(([k, l]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </section>
        <section className="stack">
          {authed === null && <div className="empty">Loading orders…</div>}
          {authed && !list.length && <div className="empty">{filter === "active" ? "No orders waiting. New ones appear here with a chime." : "Nothing here yet."}</div>}
          {list.map((o) => {
            const locked = o.otpLockedUntil && new Date(o.otpLockedUntil) > new Date();
            return (
              <article className="order" key={o.id}>
                <div className="order-top"><div><h3>{o.shortId}</h3><div className="oid">{fmtTime(o.createdAt)} · ₹{o.total}</div></div><Pill status={o.status} /></div>
                <div className="cust">
                  <span className="label">Customer</span>
                  <span className="nm">{o.name}</span>
                  <span className="ph">+91 {o.phone}</span>
                  <span>{o.address}</span>
                  <span>{o.pin
                    ? <><a className="pin-link" href={mapsUrl(o.pin)} target="_blank" rel="noopener noreferrer">Open pinned location ↗</a> <span className="coords">{o.pin.lat.toFixed(5)}, {o.pin.lng.toFixed(5)}</span></>
                    : <span className="coords">No location pin</span>}</span>
                </div>
                <Chips items={o.items} />
                <div className="meta">{macros(o.items)}</div>
                {o.note && <div className="meta"><b>Note:</b> {o.note}</div>}
                <div className="actions">
                  {o.status === "placed" && <button className="btn small" disabled={busy[o.id]} onClick={() => move(o, "preparing")}>Start making</button>}
                  {o.status === "preparing" && <button className="btn small" disabled={busy[o.id]} onClick={() => move(o, "out")}>Hand to delivery</button>}
                  {o.status === "out" && (
                    <div className="otp-in">
                      <label className="label" htmlFor={`otp-${o.id}`}>Customer OTP</label>
                      <input id={`otp-${o.id}`} inputMode="numeric" maxLength={6} placeholder="000000" disabled={locked}
                        value={otpInput[o.id] || ""} onChange={(e) => setOtpInput((x) => ({ ...x, [o.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                        onKeyDown={(e) => { if (e.key === "Enter") deliver(o); }} />
                      <button className="btn small" disabled={busy[o.id] || locked} onClick={() => deliver(o)}>Confirm delivery</button>
                    </div>
                  )}
                  {o.status === "delivered" && <span className="meta">Delivered {fmtTime(o.deliveredAt)} · OTP verified</span>}
                </div>
                {o.status === "out" && <div className="err">{locked ? `Too many wrong tries. OTP entry unlocks at ${fmtTime(o.otpLockedUntil)}.` : otpErr[o.id] || ""}</div>}
              </article>
            );
          })}
        </section>
      </main>
      <Toast msg={toast} />
    </div>
  );
}
