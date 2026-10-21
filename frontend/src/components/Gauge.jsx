import { STATUS_LABEL, STATUS_VAR } from "../lib/constants";
import { n } from "../lib/format";

/* semicircle gauge: 0 on the left, the cap on the right, with the two status thresholds ticked */
function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a0 - a1 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
export default function Gauge({ rul, status, atCap, cfg }) {
  const cap = cfg.cap, t = cfg.status_thresholds, cx = 170, cy = 168, r = 134;
  const frac = Math.min(rul, cap) / cap, d = arc(cx, cy, r, 180, 0);
  const tick = (v) => {
    const a = 180 - (v / cap) * 180, rad = (a * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
    const pts = { x1: cx + (r - 14) * c, y1: cy - (r - 14) * s, x2: cx + (r + 8) * c, y2: cy - (r + 8) * s };
    return (
      <g key={v}>
        <line {...pts} stroke="var(--panel)" strokeWidth="3" /><line {...pts} stroke="var(--ink3)" strokeWidth="1" />
        <text x={cx + (r + 22) * c} y={cy - (r + 22) * s + 4} textAnchor="middle" style={{ font: "400 11px var(--font-mono)", fill: "var(--ink3)" }}>{v}</text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 340 206" role="img" aria-label={`Gauge: ${atCap ? cap + " or more" : n(rul, 1)} cycles remaining, ${STATUS_LABEL[status]}`} className="block h-auto w-full overflow-visible">
      <path d={d} fill="none" stroke="var(--line)" strokeWidth="18" pathLength="100" />
      <path className="arc-fill" d={d} fill="none" stroke={STATUS_VAR[status]} strokeWidth="18" pathLength="100" strokeDasharray="100" strokeDashoffset={(100 - frac * 100).toFixed(2)} />
      {tick(t.critical_below)}{tick(t.warning_below)}
      <text x={cx - r} y={cy + 22} textAnchor="middle" style={{ font: "400 11px var(--font-mono)", fill: "var(--ink3)" }}>0</text>
      <text x={cx + r} y={cy + 22} textAnchor="middle" style={{ font: "400 11px var(--font-mono)", fill: "var(--ink3)" }}>{cap}+</text>
      <text x={cx} y={cy - 28} textAnchor="middle" style={{ font: "800 58px/1 var(--font-display)", fontStretch: "112%", fill: "var(--ink)" }}>{atCap ? cap + "+" : n(rul, 0)}</text>
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ font: "400 14px var(--font-body)", fill: "var(--ink2)" }}>cycles remaining</text>
    </svg>
  );
}
