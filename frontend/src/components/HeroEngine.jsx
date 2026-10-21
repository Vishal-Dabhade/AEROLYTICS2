/* Turbofan fan face. The outer ring has 125 ticks, one per cycle of the capped RUL horizon.
   mode="ring" draws only the ring (used over an optional photograph). */
const cx = 400, cy = 400, BLADES = 24, TICKS = 125, LIT = 78;
const BLADE = "M -10 -62 C -27 -130 -33 -232 -15 -326 L 31 -326 C 35 -240 27 -140 21 -62 Z";

export default function HeroEngine({ mode = "full" }) {
  const ring = Array.from({ length: TICKS }, (_, i) => {
    const a = ((-90 + (i * 360) / TICKS) * Math.PI) / 180, on = i < LIT, r1 = 366, r2 = on ? 392 : 380;
    return (
      <line key={i} className={on ? "rul-tick" : ""} style={on ? { animationDelay: `${(i * 16).toFixed(0)}ms` } : undefined}
        x1={(cx + r1 * Math.cos(a)).toFixed(1)} y1={(cy + r1 * Math.sin(a)).toFixed(1)} x2={(cx + r2 * Math.cos(a)).toFixed(1)} y2={(cy + r2 * Math.sin(a)).toFixed(1)}
        stroke={on ? "#c5f03a" : "var(--tick-off)"} strokeWidth={on ? 2.4 : 1.6} strokeLinecap="round" />
    );
  });
  return (
    <svg className="block h-full w-full" viewBox="-40 -40 880 880" role="img" aria-label="Illustration of a turbofan engine seen from the front. A ring of 125 ticks surrounds the fan.">
      <defs>
        <radialGradient id="he-bg" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#060a12" /><stop offset=".72" stopColor="#0c1320" /><stop offset="1" stopColor="#16203177" /></radialGradient>
        <linearGradient id="he-blade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#28344c" /><stop offset=".55" stopColor="#1a2336" /><stop offset="1" stopColor="#0f1626" /></linearGradient>
        <radialGradient id="he-hub" cx="38%" cy="34%" r="75%"><stop offset="0" stopColor="#3a4864" /><stop offset=".6" stopColor="#151d2e" /><stop offset="1" stopColor="#0a0f1a" /></radialGradient>
        <linearGradient id="he-lip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a4762" /><stop offset=".5" stopColor="#1b2538" /><stop offset="1" stopColor="#0d1320" /></linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r="400" fill="var(--plate)" />
      {mode === "full" && (
        <>
          <circle cx={cx} cy={cy} r="398" fill="none" stroke="rgba(236,233,225,.06)" />
          <circle cx={cx} cy={cy} r="354" fill="url(#he-lip)" />
          <circle cx={cx} cy={cy} r="334" fill="url(#he-bg)" stroke="#263146" strokeWidth="1.5" />
          <path d={`M ${cx - 330} ${cy} A 330 330 0 0 1 ${cx} ${cy - 330}`} fill="none" stroke="#45d6e6" strokeOpacity=".35" strokeWidth="1.2" />
          <g className="fan">
            {Array.from({ length: BLADES }, (_, i) => (
              <g key={i} transform={`translate(${cx} ${cy}) rotate(${(i * 360) / BLADES})`}>
                <path d={BLADE} fill="url(#he-blade)" stroke="rgba(236,233,225,.2)" strokeWidth=".8" />
                <path d="M -10 -62 C -27 -130 -33 -232 -15 -326" fill="none" stroke="#45d6e6" strokeOpacity=".28" strokeWidth="1" />
              </g>
            ))}
          </g>
          <circle cx={cx} cy={cy} r="74" fill="url(#he-hub)" stroke="#2c3850" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="30" fill="#0a0f1a" stroke="#263146" />
          <circle cx={cx} cy={cy} r="5" fill="#c5f03a" />
        </>
      )}
      {mode === "ring" && <circle cx={cx} cy={cy} r="356" fill="none" stroke="#263146" strokeWidth="2" />}
      <g>{ring}</g>
    </svg>
  );
}
