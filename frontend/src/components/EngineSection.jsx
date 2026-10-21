import { Link } from "react-router-dom";

/* Side view of the engine with the real C-MAPSS sensor stations. Each label opens that sensor in the explorer. */
const W = 1200, H = 470, mid = 270;
const mir = (y) => 2 * mid - y;
const coreTop = [[205, 205], [520, 232], [610, 214], [880, 204], [1010, 238]];
const nac = [[70, 190], [110, 148], [860, 148], [1060, 188], [1130, 250]];
const poly = (pts, flip) => pts.map(([x, y]) => `${x},${flip ? mir(y) : y}`).join(" ");
const yCore = (x) => { for (let i = 0; i < coreTop.length - 1; i++) { const [a, b] = [coreTop[i], coreTop[i + 1]]; if (x >= a[0] && x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); } return 220; };
const bars = (x0, x1, n, hFrom, hTo) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / Math.max(1, n - 1), h = hFrom + ((hTo - hFrom) * i) / Math.max(1, n - 1), y = yCore(x);
    out.push(<line key={`a${x0}${i}`} x1={x} y1={y} x2={x} y2={y + h} />, <line key={`b${x0}${i}`} x1={x} y1={mir(y)} x2={x} y2={mir(y) - h} />);
  }
  return out;
};
const groups = [
  { x: 140, y: mid - 96, lines: [["Nf", "sensor_8"], ["NRf", "sensor_13"]] },
  { x: 255, y: yCore(255) + 12, lines: [["Nc", "sensor_9"], ["NRc", "sensor_14"]] },
  { x: 345, y: yCore(345), lines: [["T24", "sensor_2"]] },
  { x: 445, y: 178, lines: [["BPR", "sensor_15"]] },
  { x: 530, y: yCore(530), lines: [["T30", "sensor_3"], ["P30", "sensor_7"], ["Ps30", "sensor_11"], ["htBleed", "sensor_17"]] },
  { x: 612, y: mid - 40, lines: [["phi", "sensor_12"]] },
  { x: 693, y: yCore(693), lines: [["W31", "sensor_20"]] },
  { x: 795, y: yCore(795), lines: [["W32", "sensor_21"]] },
  { x: 885, y: yCore(885), lines: [["T50", "sensor_4"]] },
];
const KEY = new Set(["sensor_4", "sensor_11", "sensor_15"]); // the three inputs the models rely on most
const sections = [["Fan", 100, 190], ["Low-pressure compressor", 200, 345], ["High-pressure compressor", 350, 520], ["Combustor", 520, 650], ["HPT", 650, 725], ["Low-pressure turbine", 730, 880]];

export default function EngineSection({ meta = {} }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Side view of a turbofan engine with the C-MAPSS sensor stations marked" style={{ width: "100%", height: "auto", fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <polygon points={`${poly(nac)} ${poly(nac.slice().reverse(), true)}`} fill="var(--eng-fill1)" stroke="var(--eng-line)" strokeWidth="1.5" />
      <polygon points={`${poly(coreTop)} ${poly(coreTop.slice().reverse(), true)}`} fill="var(--eng-fill2)" stroke="var(--eng-core-line)" strokeWidth="1.5" />
      <line x1="90" y1={mid} x2="1130" y2={mid} stroke="var(--line)" strokeDasharray="8 6" />
      <rect x="120" y={mid - 9} width="760" height="18" fill="var(--eng-hub)" stroke="var(--eng-line)" />
      <g stroke="var(--eng-blade)" strokeWidth="3" strokeLinecap="round"><line x1="140" y1={mid - 120} x2="140" y2={mid + 120} /><line x1="156" y1={mid - 116} x2="156" y2={mid + 116} /></g>
      <g stroke="var(--eng-blade)" strokeWidth="2" strokeLinecap="round">{bars(220, 335, 4, 26, 24)}{bars(362, 505, 7, 22, 10)}</g>
      <rect x="530" y={mid - 40} width="110" height="80" rx="30" fill="var(--eng-comb)" stroke="var(--link)" strokeOpacity=".7" />
      <g stroke="var(--eng-blade)" strokeWidth="2.4" strokeLinecap="round">{bars(660, 700, 2, 22, 22)}{bars(740, 860, 3, 26, 34)}</g>
      {sections.map(([nm, a, b]) => (
        <g key={nm}>
          <line x1={a} y1={H - 52} x2={b} y2={H - 52} stroke="var(--eng-line)" /><line x1={a} y1={H - 56} x2={a} y2={H - 48} stroke="var(--eng-line)" /><line x1={b} y1={H - 56} x2={b} y2={H - 48} stroke="var(--eng-line)" />
          <text x={(a + b) / 2} y={H - 28} textAnchor="middle" fontSize="13" fill="var(--ink3)">{nm}</text>
        </g>
      ))}
      {groups.map((gr) => {
        const rows = gr.lines.length, y0 = 16 + (4 - rows) * 20, key = gr.lines.some((l) => KEY.has(l[1]));
        return (
          <g key={gr.x}>
            <line x1={gr.x} y1={y0 + rows * 20 - 4} x2={gr.x} y2={gr.y} stroke={key ? "var(--link)" : "var(--ink3)"} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={gr.x} cy={gr.y} r="5" fill={key ? "var(--link)" : "var(--panel)"} stroke={key ? "var(--link)" : "var(--ink3)"} strokeWidth="1.5" />
            {gr.lines.map(([sym, id], i) => {
              const num = id.split("_")[1], k = KEY.has(id);
              return (
                <Link key={id} to={`/dataset?sensor=${id}#explorer`} className="outline-offset-2 hover:opacity-70">
                  <title>{`Sensor ${num}: ${(meta[id] && meta[id].name) || sym}. Open in the dataset explorer.`}</title>
                  <rect x={gr.x - 46} y={y0 + i * 20 - 14} width="92" height="20" fill="transparent" />
                  <text x={gr.x} y={y0 + i * 20} textAnchor="middle" fontSize="14" fontWeight={k ? 600 : 500} fill={k ? "var(--link)" : "var(--ink)"}>{sym} <tspan fill="var(--ink3)" fontWeight="400" fontSize="12">s{num}</tspan></text>
                </Link>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
