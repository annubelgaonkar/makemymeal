"use client";
import Link from "next/link";
import { INGREDIENTS, STATUSES, nutrition } from "@/lib/menu";

export const fmtTime = (t) => { try { return t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""; } catch { return ""; } };
export const macros = (it) => { const t = nutrition(it); return `${t.kcal} kcal · ${t.p}g protein · ${t.c}g carbs · ${t.f}g fat`; };
export const mapsUrl = (pin) => `https://www.google.com/maps?q=${pin.lat},${pin.lng}`;
const CLS = { placed: "s-placed", preparing: "s-preparing", out: "s-out", delivered: "s-delivered" };

export function Pill({ status }) {
  const s = STATUSES.find((x) => x.key === status) || STATUSES[0];
  return <span className={`pill ${CLS[s.key]}`}>{s.label}</span>;
}
export function Chips({ items }) {
  return (
    <div className="items">
      {INGREDIENTS.map((i) => {
        const n = items?.[i.key] ?? 0;
        const label = i.key === "pb" ? "tbsp peanut butter" : i.key === "banana" ? (n === 1 ? "banana" : "bananas") : "bread slices";
        return <span className="chip" key={i.key}><b>{n}</b> {label}</span>;
      })}
    </div>
  );
}
export function Track({ status }) {
  const n = STATUSES.findIndex((x) => x.key === status);
  return (
    <>
      <div className="track">{STATUSES.map((s, k) => <div key={s.key} className={k <= n ? "on" : ""} />)}</div>
      <div className="track-labels">{STATUSES.map((s) => <span key={s.key}>{s.label}</span>)}</div>
    </>
  );
}
export function Header({ active, right }) {
  return (
    <header>
      <Link href="/" className="brand" style={{ color: "inherit", textDecoration: "none" }}>makemymeal<span className="dot">.</span><span className="tld">com</span></Link>
      <div className="hdr-right">
        {right}
        <nav className="tabs">
          <Link href="/" aria-current={active === "order" ? "page" : undefined}>Order</Link>
          <Link href="/kitchen" aria-current={active === "kitchen" ? "page" : undefined}>Kitchen</Link>
        </nav>
      </div>
    </header>
  );
}

let audioCtx = null;
export function primeAudio() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch {} }
export function chime() {
  try {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [[880, 0], [1320, 0.16]].forEach(([f, d]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
      o.connect(g).connect(audioCtx.destination); o.start(t + d); o.stop(t + d + 0.4);
    });
  } catch {}
}
export function browserNotify(title, body) {
  try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(title, { body }); } catch {}
}
export function AlertModal({ alert, onClose }) {
  if (!alert) return null;
  return (
    <div className="alert" role="alertdialog" aria-labelledby="alertTitle">
      <div className="alert-card">
        <div className="label">Notification</div>
        <h2 id="alertTitle">{alert.title}</h2>
        {alert.code && <div className="alert-code">{alert.code}</div>}
        <p>{alert.body}</p>
        <button className="btn primary" onClick={onClose} autoFocus>Got it</button>
      </div>
    </div>
  );
}
export function Toast({ msg }) { return msg ? <div className="toast">{msg}</div> : null; }
