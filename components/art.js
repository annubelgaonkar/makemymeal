// Hand-drawn SVG artwork: ingredient icons and the live sandwich stack.

export function BreadIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 22c-3-1-4-4-4-6 0-5 6-9 20-9s20 4 20 9c0 2-1 5-4 6v17a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V22Z" fill="#D99A55" />
      <path d="M11.5 23.5c-2.4-.8-3.2-2.6-3.2-4 0-3.6 5-6.3 15.7-6.3s15.7 2.7 15.7 6.3c0 1.4-.8 3.2-3.2 4V38a1 1 0 0 1-1 1h-23a1 1 0 0 1-1-1V23.5Z" fill="#F6DDB0" />
      <circle cx="18" cy="26" r="1" fill="#E2BC80" /><circle cx="27" cy="31" r="1.1" fill="#E2BC80" /><circle cx="31" cy="23" r=".9" fill="#E2BC80" /><circle cx="20" cy="34" r=".9" fill="#E2BC80" />
    </svg>
  );
}

export function JarIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="13" y="6" width="22" height="7" rx="2" fill="#24170E" />
      <path d="M12 15a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v2c2 1.5 3 3.5 3 6v15a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V23c0-2.5 1-4.5 3-6v-2Z" fill="#8A4F22" />
      <rect x="12" y="23" width="24" height="12" rx="2" fill="#FFD23F" />
      <path d="M17 29.5c1.6-2.4 4.2-2.4 5.6 0 1.4-2.4 4-2.4 5.6 0" stroke="#8A4F22" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M14 17.5c2-1 5-1.5 10-1.5" stroke="#B87A45" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BananaIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 13c1 13 9 24 25 25 4 0 6-1 6-3-12-1-21-9-24-21-1-3-7-4-7-1Z" fill="#FFD23F" />
      <path d="M16 14c3 12 12 20 24 21 0 2-2 3-6 3C18 37 10 26 9 13c0-1.5 1.6-2 3.2-1.6" fill="#E8B500" opacity=".55" />
      <path d="M8.2 11.5 6.5 8.6c-.4-.8.6-1.6 1.3-1L10.6 10" stroke="#5B3A1A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M40 35.5c1 .3 1.6.8 1.4 1.6" stroke="#5B3A1A" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function EggIcon({ size = 44, style }) {
  if (style === "boiled") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="24" cy="25" rx="15" ry="18" fill="#FFFFFF" stroke="#E6DED2" strokeWidth="1.5" />
        <circle cx="24" cy="27" r="8" fill="#FFC93C" />
        <circle cx="24" cy="27" r="8" fill="none" stroke="#F2A900" strokeWidth="1.5" />
        <ellipse cx="21" cy="24" rx="3" ry="1.6" fill="#FFE38A" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="33" rx="19" ry="8" fill="#E9E2D8" />
      <ellipse cx="24" cy="31.5" rx="17" ry="6.5" fill="#FFFFFF" />
      <path d="M10 30c1-6 6-9 10-8 2-5 9-6 12-1 4-1 8 2 7 7 2 2 0 5-3 5H13c-3 0-5-1-3-3Z" fill="#FFC93C" />
      <path d="M15 27c2-2 4-2 6-1M25 24c2-1 4-1 5 1M31 29c2-1 4 0 5 1" stroke="#F2A900" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="30" r="1" fill="#2F7A3A" /><circle cx="29" cy="27" r="1" fill="#2F7A3A" />
    </svg>
  );
}

export const ICONS = { bread: BreadIcon, pb: JarIcon, banana: BananaIcon, egg: EggIcon };

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#FFD23F" />
      <rect x="6" y="9" width="20" height="5" rx="2.5" fill="#D99A55" />
      <rect x="7.5" y="14.5" width="17" height="2.4" rx="1.2" fill="#8A4F22" />
      <circle cx="10.5" cy="18.8" r="1.7" fill="#FFF1B8" /><circle cx="16" cy="18.8" r="1.7" fill="#FFF1B8" /><circle cx="21.5" cy="18.8" r="1.7" fill="#FFF1B8" />
      <rect x="6" y="20.8" width="20" height="4.6" rx="2.3" fill="#D99A55" />
    </svg>
  );
}

/* ---------- live sandwich ---------- */

const W = 220;           // drawing width of a slice
const BREAD_H = 42, PB_H = 14, BANANA_H = 24, EGG_H = 22;

// Turn quantities into a bottom-to-top list of layers.
export function buildLayers(q) {
  const slices = Math.max(2, q.bread || 2);
  const gaps = slices - 1;
  const layers = [];
  let pbLeft = q.pb || 0, bnLeft = q.banana || 0, egLeft = q.egg || 0;
  for (let s = 0; s < slices; s++) {
    layers.push({ t: "bread", top: s === slices - 1 });
    if (s < gaps) {
      const left = gaps - s;
      const pb = Math.ceil(pbLeft / left), bn = Math.ceil(bnLeft / left), eg = Math.ceil(egLeft / left);
      pbLeft -= pb; bnLeft -= bn; egLeft -= eg;
      for (let k = 0; k < Math.min(pb, 2); k++) layers.push({ t: "pb", amt: pb });
      if (bn > 0) layers.push({ t: "banana", amt: bn });
      if (eg > 0) layers.push({ t: "egg", amt: eg, style: q.eggStyle });
    }
  }
  return layers;
}

function Slice({ y, top }) {
  const x = 0;
  if (top) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d={`M6 ${BREAD_H} C2 ${BREAD_H} 0 22 0 16 C0 6 18 0 ${W / 2} 0 C${W - 18} 0 ${W} 6 ${W} 16 C${W} 22 ${W - 2} ${BREAD_H} ${W - 6} ${BREAD_H} Z`} fill="#C9843F" />
        <path d={`M10 ${BREAD_H - 4} C7 ${BREAD_H - 4} 5 21 5 16 C5 9 20 4.5 ${W / 2} 4.5 C${W - 20} 4.5 ${W - 5} 9 ${W - 5} 16 C${W - 5} 21 ${W - 7} ${BREAD_H - 4} ${W - 10} ${BREAD_H - 4} Z`} fill="#E4A963" />
        <path d={`M34 11 C70 7 ${W - 70} 7 ${W - 34} 11`} stroke="#F2C88A" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
        {[.28,.46,.62,.78].map((f,k)=><ellipse key={k} cx={W*f} cy={k%2?13:17} rx="2.6" ry="1.4" fill="#F6E2BC" />)}
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="2" width={W} height={BREAD_H - 4} rx="13" fill="#C9843F" />
      <rect x="5" y="5" width={W - 10} height={BREAD_H - 10} rx="10" fill="#F4D7A4" />
      {[.2,.42,.63,.84].map((f,k)=><circle key={k} cx={W*f} cy={BREAD_H/2+(k%2?-3:3)} r="1.6" fill="#E2BC80" />)}
    </g>
  );
}

function Spread({ y }) {
  let wave = "";
  for (let x = W - 4; x - 16 >= 4; x -= 16) wave += ` Q${x - 8} ${PB_H + 4} ${x - 16} ${PB_H - 1}`;
  return (
    <g transform={`translate(0 ${y})`}>
      <path d={`M6 2 H${W - 6} Q${W} 2 ${W - 2} ${PB_H - 2} L${W - 4} ${PB_H - 1}${wave} L2 ${PB_H - 2} Q0 2 6 2 Z`} fill="#8A4F22" />
      <path d={`M14 4.5 H${W - 30}`} stroke="#B07040" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </g>
  );
}

function Coins({ y, amt }) {
  const n = Math.min(3 + amt * 2, 9);
  const step = (W - 24) / (n - 1);
  return (
    <g transform={`translate(0 ${y})`}>
      {Array.from({ length: n }, (_, k) => {
        const cx = 12 + k * step;
        return (
          <g key={k}>
            <ellipse cx={cx} cy={BANANA_H / 2 + 0.5} rx={Math.min(19, step / 2 + 5)} ry={BANANA_H / 2} fill="#F7D774" stroke="#E2B64A" strokeWidth="1.5" />
            <ellipse cx={cx} cy={BANANA_H / 2} rx="6" ry="3.4" fill="#FFF3C4" />
            <circle cx={cx - 1.5} cy={BANANA_H / 2} r=".8" fill="#B58A3A" /><circle cx={cx + 1.8} cy={BANANA_H / 2 - .4} r=".8" fill="#B58A3A" />
          </g>
        );
      })}
    </g>
  );
}

function BoiledSlices({ y, amt }) {
  // rounds of sliced hard-boiled egg: white ring, yolk centre
  const n = Math.min(3 + amt * 2, 9);
  const step = (W - 28) / (n - 1);
  return (
    <g transform={`translate(0 ${y})`}>
      {Array.from({ length: n }, (_, k) => {
        const cx = 14 + k * step, ry = EGG_H / 2;
        return (
          <g key={k}>
            <ellipse cx={cx} cy={ry + 0.5} rx={Math.min(21, step / 2 + 7)} ry={ry} fill="#FFFFFF" stroke="#E2D9CC" strokeWidth="1.5" />
            <ellipse cx={cx} cy={ry + 0.5} rx="8" ry={ry - 5} fill="#FFC93C" />
            <ellipse cx={cx - 2} cy={ry - 1} rx="3" ry="1.6" fill="#FFE38A" />
          </g>
        );
      })}
    </g>
  );
}

function Scramble({ y, amt }) {
  // fluffy curds: overlapping blobs, more eggs = fuller layer
  const n = Math.min(6 + amt * 3, 16);
  const step = (W - 20) / (n - 1);
  const blobs = Array.from({ length: n }, (_, k) => {
    const cx = 10 + k * step, wob = (k * 37) % 7;
    return { cx, cy: EGG_H / 2 + (k % 2 ? -2 : 2), rx: step * 0.85 + 6, ry: EGG_H / 2 - 1 + (wob % 3) };
  });
  return (
    <g transform={`translate(0 ${y})`}>
      {blobs.map((b, k) => <ellipse key={"a" + k} cx={b.cx} cy={b.cy + 1.5} rx={b.rx} ry={b.ry} fill="#F2A900" />)}
      {blobs.map((b, k) => <ellipse key={"b" + k} cx={b.cx} cy={b.cy} rx={b.rx - 1.5} ry={b.ry - 1.5} fill="#FFC93C" />)}
      {blobs.filter((_, k) => k % 2 === 0).map((b, k) => <ellipse key={"c" + k} cx={b.cx - 2} cy={b.cy - 3} rx={b.rx / 3} ry="2" fill="#FFE38A" />)}
      {blobs.filter((_, k) => k % 3 === 1).map((b, k) => <circle key={"d" + k} cx={b.cx + 3} cy={b.cy + 1} r="1.3" fill="#2F7A3A" />)}
    </g>
  );
}

export function SandwichArt({ qty, className }) {
  const layers = buildLayers(qty);
  const H = { bread: BREAD_H - 3, pb: PB_H - 4, banana: BANANA_H - 5, egg: EGG_H - 6 };
  const total = layers.reduce((s, l) => s + H[l.t], 0) + 8;
  const pad = 20;
  const vbH = total + pad * 2 + 18;
  let y = vbH - pad - 18; // bottom (above plate shadow)
  const items = layers.map((l, i) => {
    const h = { bread: BREAD_H, pb: PB_H, banana: BANANA_H, egg: EGG_H }[l.t];
    y -= H[l.t];
    const yy = y - (h - H[l.t]);
    const el = l.t === "bread" ? <Slice y={yy} top={l.top} /> : l.t === "pb" ? <Spread y={yy} /> : l.t === "egg" ? (l.style === "boiled" ? <BoiledSlices y={yy} amt={l.amt} /> : <Scramble y={yy} amt={l.amt} />) : <Coins y={yy} amt={l.amt} />;
    return <g key={`${i}-${l.t}`} className="layer-in" style={{ animationDelay: `${Math.min(i, 3) * 20}ms` }}>{el}</g>;
  });
  // draw bottom first; later items (higher) paint over lower ones
  return (
    <svg className={className} viewBox={`-20 0 ${W + 40} ${vbH}`} role="img" aria-label={`Sandwich with ${qty.bread} bread slices, ${qty.pb} tablespoons of peanut butter, ${qty.banana} banana and ${qty.egg || 0} ${qty.eggStyle === "boiled" ? "boiled" : "scrambled"} egg`}>
      <ellipse cx={W / 2} cy={vbH - pad - 17} rx={W / 2 - 4} ry="8" fill="#24170E" opacity=".14" />
      {items}
    </svg>
  );
}
