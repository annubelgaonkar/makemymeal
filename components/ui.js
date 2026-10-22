"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { INGREDIENTS, STATUSES, nutrition } from "@/lib/menu";
import { LogoMark } from "@/components/art";

export const fmtTime = (t) => { try { return t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""; } catch { return ""; } };
export const fmtClock = (t) => { try { return t ? new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""; } catch { return ""; } };
export function ago(t) {
  const m = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min ago` : fmtTime(t);
}
export const mapsUrl = (pin) => `https://www.google.com/maps?q=${pin.lat},${pin.lng}`;
export const macrosOf = (it) => nutrition(it);

const CLS = { placed: "s-placed", preparing: "s-preparing", out: "s-out", delivered: "s-delivered" };
const LABEL = { placed: "Order placed", preparing: "Being made", out: "On the way", delivered: "Delivered" };

export function Pill({ status }) {
  return <span className={`pill ${CLS[status] || CLS.placed}`}>{LABEL[status] || LABEL.placed}</span>;
}

export function Chips({ items }) {
  return (
    <div className="chips">
      {INGREDIENTS.map((i) => {
        const n = items?.[i.key] ?? 0;
        const label = { pb: "tbsp peanut butter", banana: n === 1 ? "banana" : "bananas", egg: `${items?.eggStyle === "boiled" ? "boiled" : "scrambled"} ${n === 1 ? "egg" : "eggs"}`, bread: n === 1 ? "slice of bread" : "slices of bread" }[i.key];
        return <span className="chip" key={i.key}><b>{n}</b>{label}</span>;
      })}
    </div>
  );
}

export function Tracker({ status }) {
  const n = Math.max(0, STATUSES.findIndex((x) => x.key === status));
  const done = status === "delivered";
  return (
    <div className="tracker" aria-label={`Status: ${LABEL[status]}`}>
      <span className="fill" style={{ width: `${(n / 3) * 75}%` }} />
      {STATUSES.map((s, k) => (
        <div key={s.key} className={`step ${k < n || (done && k === n) ? "done" : ""} ${k === n && !done ? "now" : ""}`}>
          <i />{LABEL[s.key]}
        </div>
      ))}
    </div>
  );
}

export function OtpDigits({ code }) {
  const d = (code || "------").split("");
  return <div className="otp-digits" aria-label={code ? `OTP ${code.split("").join(" ")}` : "OTP hidden"}>{d.map((c, i) => <span key={i}>{c === "-" ? "•" : c}</span>)}</div>;
}


export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  function flip() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("mm_theme", next); } catch {}
    setDark(!dark);
  }
  return (
    <button className="icon-btn theme-btn" onClick={flip} aria-label={dark ? "Switch to white theme" : "Switch to black theme"} title={dark ? "White theme" : "Black theme"}>
      {dark
        ? <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></g></svg>
        : <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.5 9.5 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8Z" /></svg>}
    </button>
  );
}

export function TopBar({ active, right }) {
  return (
    <div className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand" aria-label="makemymeal home">
          <LogoMark size={32} />
          <span className="brand-name">makemymeal</span>
        </Link>
        <div className="top-actions">
          <ThemeToggle />
          {right}
          <nav className="seg" aria-label="Sections">
            <Link href="/" aria-current={active === "order" ? "page" : undefined}>Order</Link>
            <Link href="/kitchen" aria-current={active === "kitchen" ? "page" : undefined}>Kitchen</Link>
          </nav>
        </div>
      </div>
    </div>
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
    <div className="alert" role="alertdialog" aria-modal="true" aria-labelledby="alertTitle" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="alert-card">
        <LogoMark size={44} />
        <h2 id="alertTitle">{alert.title}</h2>
        {alert.code && <OtpDigits code={alert.code} />}
        <p>{alert.body}</p>
        <button className="btn btn-primary" onClick={onClose} autoFocus>Got it</button>
      </div>
    </div>
  );
}

export function Toast({ msg }) { return msg ? <div className="toast" role="status">{msg}</div> : null; }

export function BellIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z" /></svg>;
}
export function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="m7 12.5 3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
