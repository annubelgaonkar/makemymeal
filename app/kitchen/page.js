"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { INGREDIENTS } from "@/lib/menu";
import { CheckIcon, Pill, Toast, TopBar, ago, chime, fmtClock, fmtTime, mapsUrl, primeAudio } from "@/components/ui";
import { ICONS, LogoMark } from "@/components/art";

const UNIT = { bread: (n) => (n === 1 ? "slice of bread" : "slices of bread"), pb: () => "tbsp peanut butter", banana: (n) => (n === 1 ? "banana" : "bananas") };
const HINT = { bread: "Zero Maida", pb: "Pintola crunchy", banana: "medium, sliced" };

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

  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  if (authed === false) {
    return (
      <>
        <TopBar active="kitchen" />
        <main className="kpage">
          <form className="login" onSubmit={login}>
            <div className="kicon"><LogoMark size={38} /></div>
            <div><h1 style={{ fontSize: 32 }}>Kitchen</h1><p className="muted" style={{ marginTop: 6 }}>Enter the kitchen password to see incoming orders.</p></div>
            <div className="field"><label htmlFor="k-pass">Kitchen password</label>
              <input id="k-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></div>
            <div className="err" role="alert">{loginErr}</div>
            <button className="btn btn-primary" type="submit">Open kitchen</button>
          </form>
        </main>
      </>
    );
  }

  const active = orders.filter((o) => o.status !== "delivered");
  const count = (st) => orders.filter((o) => o.status === st).length;
  let list = filter === "active" ? active : filter === "delivered" ? orders.filter((o) => o.status === "delivered") : orders.slice();
  list = list.sort((a, b) => (filter === "active" ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)));

  return (
    <>
      <TopBar active="kitchen" right={authed ? <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button> : null} />
      <main className="kpage">
        <div className="khead">
          <div><h1>Kitchen</h1><p>Oldest orders first. A chime plays when a new one comes in.</p></div>
          <nav className="seg" aria-label="Filter orders">
            {[["active", "To do"], ["delivered", "Delivered"], ["all", "All"]].map(([k, l]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </nav>
        </div>
        {authed && (
          <div className="kstats">
            <span className="kstat"><b>{count("placed")}</b>new</span>
            <span className="kstat"><b>{count("preparing")}</b>being made</span>
            <span className="kstat"><b>{count("out")}</b>on the way</span>
          </div>
        )}
        {authed === null && <div className="empty">Loading orders…</div>}
        {authed && !list.length && <div className="empty">{filter === "active" ? "All caught up. New orders will appear here with a chime." : "Nothing here yet."}</div>}
        <div className="tickets">
          {list.map((o) => {
            const locked = o.otpLockedUntil && new Date(o.otpLockedUntil) > new Date();
            return (
              <article className={`ticket ${o.status === "placed" ? "new" : ""}`} key={o.id}>
                <div className="t-top">
                  <div><div className="t-code">{o.shortId}</div><div className="t-time">Ordered {fmtClock(o.createdAt)}, {ago(o.createdAt)}</div></div>
                  <Pill status={o.status} />
                </div>
                <div className="t-items">
                  {INGREDIENTS.map((i) => {
                    const n = o.items?.[i.key] ?? 0; const Icon = ICONS[i.key];
                    return (
                      <div className="t-item" key={i.key} style={n === 0 ? { opacity: .4 } : undefined}>
                        <b>{n}</b>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={28} /><span>{UNIT[i.key](n)}<small>{HINT[i.key]}</small></span></span>
                      </div>
                    );
                  })}
                </div>
                {o.note && <div className="t-note"><b>Note:</b> {o.note}</div>}
                <div className="t-cust">
                  <span className="label">Deliver to</span>
                  <span className="nm">{o.name}</span>
                  <span>+91 {o.phone}</span>
                  <span>{o.address}</span>
                  {o.pin
                    ? <span><a href={mapsUrl(o.pin)} target="_blank" rel="noopener noreferrer">Open pinned location in Maps</a> <span className="coords">{o.pin.lat.toFixed(5)}, {o.pin.lng.toFixed(5)}</span></span>
                    : <span className="coords">No map pin</span>}
                </div>
                <div className="t-action">
                  {o.status === "placed" && <button className="btn btn-yellow" disabled={busy[o.id]} onClick={() => move(o, "preparing")}>Start making</button>}
                  {o.status === "preparing" && <button className="btn btn-primary" disabled={busy[o.id]} onClick={() => move(o, "out")}>Hand to delivery</button>}
                  {o.status === "out" && (
                    <div className="otp-entry">
                      <label className="label" htmlFor={`otp-${o.id}`}>Ask the customer for their OTP</label>
                      <div className="row">
                        <input id={`otp-${o.id}`} inputMode="numeric" maxLength={6} placeholder="······" disabled={locked} autoComplete="one-time-code"
                          value={otpInput[o.id] || ""} onChange={(e) => setOtpInput((x) => ({ ...x, [o.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                          onKeyDown={(e) => { if (e.key === "Enter") deliver(o); }} />
                        <button className="btn btn-primary" style={{ width: "auto" }} disabled={busy[o.id] || locked} onClick={() => deliver(o)}>Confirm</button>
                      </div>
                      <div className="err">{locked ? `Too many wrong tries. OTP entry unlocks at ${fmtClock(o.otpLockedUntil)}.` : otpErr[o.id] || ""}</div>
                    </div>
                  )}
                  {o.status === "delivered" && <div className="t-done"><CheckIcon />Delivered {fmtTime(o.deliveredAt)}, OTP verified</div>}
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <Toast msg={toast} />
    </>
  );
}
