import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { api, config, useAsync } from "../lib/api";
import { n, sNum, sg } from "../lib/format";
import { alpha, axis } from "../lib/chart";
import ChartCanvas from "../components/ChartCanvas";
import { ChartSkeleton, Key, PageHead, Section, Skeleton, Split, StateBox, Stats, TableSkeleton } from "../components/ui";

/* Dataset explorer. Every chart reads the real FD001 files through /api/dataset/*. */

const metaOf = (cfg, id) => cfg.sensor_meta.sensors[id] || cfg.sensor_meta.settings[id] || { symbol: id, name: id, unit: "" };
const corrWithRul = (corr, id) => corr.matrix[corr.labels.indexOf(id)][corr.labels.indexOf("RUL")];
const rolling = (a, w = 3) => a.map((_, i) => { const s = a.slice(Math.max(0, i - w + 1), i + 1); return s.reduce((x, y) => x + y, 0) / s.length; });

const Seg = ({ label, labelId, options, value, onChange }) => (
  <div className="field"><span className="lab" id={labelId}>{label}</span>
    <div className="seg max-sm:flex max-sm:w-full" role="group" aria-labelledby={labelId}>
      {options.map(([v, t]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className="max-sm:flex-1 max-sm:!px-2">{t}</button>)}
    </div>
  </div>
);
const Chip = ({ children, dim }) => (
  <span className={`mb-1.5 mr-1.5 inline-block rounded-[2px] border px-2.5 py-1 text-[.85rem] ${dim ? "border-line text-ink3" : "border-ink3 text-ink"}`}>{children}</span>
);

/* ---------------- overview ---------------- */
function Overview({ cfg, sum, corr, set }) {
  const top = corr.labels.filter((l) => l !== "RUL").map((l) => [l, corrWithRul(corr, l)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
  const finds = [
    <><strong>{sum.constant_columns.length} of {sum.raw_columns} columns never change</strong> (setting_3 and seven sensors), so the models drop them. {sum.useful_sensors} sensors stay informative.</>,
    sum.missing_values === 0 && sum.duplicate_rows === 0 ? <><strong>No missing values and no duplicate rows</strong> in either file.</> : <>{sum.missing_values} missing values and {sum.duplicate_rows} duplicate rows were found.</>,
    <><strong>Training engines last {sum.train_life.min} to {sum.train_life.max} cycles</strong>, {n(sum.train_life.mean, 0)} on average. Test engines stop after {sum.test_length.min} to {sum.test_length.max} cycles, with {sum.test_true_rul.min} to {sum.test_true_rul.max} cycles actually left.</>,
    <><strong>One operating condition.</strong> setting_3 is {set.setting_3_unique.join(", ")} in every row, and the other two settings barely vary and barely relate to remaining life.</>,
    <><strong>The strongest signals</strong> against remaining life are {top.map(([id, r]) => `${metaOf(cfg, id).symbol} (sensor ${sNum(id)}, ${sg(r)})`).join(", ")}.</>,
  ];
  const h = sum.life_histogram;
  const build = useCallback((t) => ({
    type: "bar",
    data: { labels: h.counts.map((_, i) => `${Math.round(h.edges[i])}-${Math.round(h.edges[i + 1])}`), datasets: [{ data: h.counts, backgroundColor: t.data1, borderRadius: 2, categoryPercentage: 1, barPercentage: 0.88 }] },
    options: { scales: { x: axis(t, "Cycles until failure", { ticks: { color: t.ink3, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } }), y: axis(t, "Engines", { beginAtZero: true, ticks: { precision: 0, color: t.ink3 } }) },
      plugins: { tooltip: { callbacks: { title: (i) => `${i[0].label} cycles`, label: (c) => ` ${c.parsed.y} engines` } } } },
  }), [h]);
  const kept = corr.labels.filter((l) => l !== "RUL").sort((a, b) => sNum(a) - sNum(b));
  return (
    <>
      <Split a={<h2 className="t-h2">What the data shows</h2>} b={<ul className="finds">{finds.map((f, i) => <li key={i}>{f}</li>)}</ul>} />
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>How long training engines last</h3><span className="text-[.875rem] text-ink2">cycles until failure</span></div><ChartCanvas build={build} height={260} label="Histogram of training engine lifetimes" /></div>
        <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>Sensors and settings</h3><span className="text-[.875rem] text-ink2">which columns carry information</span></div>
          <p className="mb-2 text-[.875rem] text-ink2">Used by the models ({kept.length} sensors, plus cycle):</p>
          <div>{kept.map((id) => <Chip key={id}>{metaOf(cfg, id).symbol} <span className="text-ink3">s{sNum(id)}</span></Chip>)}<Chip>setting_1</Chip><Chip>setting_2</Chip></div>
          <p className="mb-2 mt-4 text-[.875rem] text-ink2">Dropped because they never change:</p>
          <div>{sum.constant_columns.map((c) => <Chip key={c} dim>{c.replace("sensor_", "sensor ")}</Chip>)}</div>
        </div>
      </div>
    </>
  );
}

/* ---------------- engine explorer ---------------- */
function Explorer({ cfg, corr }) {
  const [params] = useSearchParams();
  const ids = useMemo(() => corr.labels.filter((l) => l !== "RUL").sort((a, b) => sNum(a) - sNum(b)), [corr]);
  const [split, setSplit] = useState("train");
  const [unit, setUnit] = useState(1);
  const [sensor, setSensor] = useState(() => (ids.includes(params.get("sensor")) ? params.get("sensor") : "sensor_4"));
  const [smooth, setSmooth] = useState(false);
  const list = useAsync(() => api(`/api/dataset/engines?split=${split}`), [split]);
  const valid = !!list.data && list.data.some((e) => e.unit === unit);
  useEffect(() => { if (list.data && !valid) setUnit(list.data[0].unit); }, [list.data, valid]);
  const eng = useAsync(() => (valid ? api(`/api/dataset/engine/${split}/${unit}`) : Promise.resolve(null)), [split, unit, valid]);
  const e = eng.data, m = metaOf(cfg, sensor), r = corrWithRul(corr, sensor), inp = cfg.inputs.find((i) => i.name === sensor);
  const stale = eng.loading && !!e;

  const rulBuild = useCallback((t) => {
    const cyc = e.cycle, xy = (ys) => cyc.map((c, i) => ({ x: c, y: ys[i] }));
    const ds = [{ label: split === "train" ? "Remaining life (actual)" : "Remaining life (implied)", data: xy(e.rul), borderColor: t.data1, backgroundColor: t.data1 }];
    if (split === "train") ds.push({ label: `Training target, capped at ${cfg.cap}`, data: xy(e.rul.map((v) => Math.min(v, cfg.cap))), borderColor: t.data2, backgroundColor: t.data2, borderDash: [7, 5] });
    else ds.push({ label: "True value at the last recorded cycle", data: [{ x: cyc.at(-1), y: e.rul.at(-1) }], borderColor: t.data2, backgroundColor: t.data2, pointRadius: 6, showLine: false });
    return { type: "line", data: { datasets: ds }, options: { parsing: false, normalized: true, interaction: { mode: "nearest", axis: "x", intersect: false },
      scales: { x: axis(t, "Cycle", { type: "linear", min: 0 }), y: axis(t, "Remaining useful life (cycles)", { beginAtZero: true }) },
      plugins: { tooltip: { callbacks: { title: (i) => `Cycle ${i[0].parsed.x}`, label: (c) => ` ${c.dataset.label}: ${c.parsed.y}` } } } } };
  }, [e, split, cfg]);
  const senBuild = useCallback((t) => {
    const cyc = e.cycle, xy = (ys) => cyc.map((c, i) => ({ x: c, y: ys[i] })), raw = e[sensor];
    const sd = [{ label: "Raw readings", data: xy(raw), borderColor: smooth ? alpha(t.data1, 0.45) : t.data1, backgroundColor: t.data1, borderWidth: smooth ? 1.2 : 2 }];
    if (smooth) sd.push({ label: "3-cycle average", data: xy(rolling(raw)), borderColor: t.data2, backgroundColor: t.data2 });
    return { type: "line", data: { datasets: sd }, options: { parsing: false, normalized: true, interaction: { mode: "nearest", axis: "x", intersect: false },
      scales: { x: axis(t, "Cycle", { type: "linear", min: 0 }), y: axis(t, m.unit ? `${m.symbol} (${m.unit})` : m.symbol, { grace: "6%" }) },
      plugins: { tooltip: { callbacks: { title: (i) => `Cycle ${i[0].parsed.x}`, label: (c) => ` ${c.dataset.label}: ${n(c.parsed.y, 2)}` } } } } };
  }, [e, sensor, smooth, m]);

  return (
    <>
      <div className="mb-[26px] flex flex-wrap items-end gap-3.5 max-sm:items-stretch">
        <Seg label="Set" labelId="splitLab" options={[["train", "Training"], ["test", "Test"]]} value={split} onChange={setSplit} />
        <div className="field max-sm:w-full"><label htmlFor="engSel">Engine</label>
          <select id="engSel" className="min-w-[17rem] max-sm:w-full max-sm:!min-w-0" value={unit} onChange={(ev) => setUnit(parseInt(ev.target.value, 10))}>{(list.data || []).map((x) => <option key={x.unit} value={x.unit}>{x.label}</option>)}</select></div>
        <div className="field max-sm:w-full"><label htmlFor="senSel">Sensor</label>
          <select id="senSel" className="min-w-[20rem] max-sm:w-full max-sm:!min-w-0" value={sensor} onChange={(ev) => setSensor(ev.target.value)}>{ids.map((id) => <option key={id} value={id}>{metaOf(cfg, id).symbol} (sensor {sNum(id)}): {metaOf(cfg, id).name}</option>)}</select></div>
        <Seg label="Smoothing" labelId="avgLab" options={[[false, "Raw readings"], [true, "3-cycle average"]]} value={smooth} onChange={setSmooth} />
      </div>
      {(eng.error || list.error) && <StateBox kind="error" title="This engine could not be loaded" body={(eng.error || list.error).message} onRetry={eng.error ? eng.reload : list.reload} />}
      {!eng.error && (
        <div className={`grid grid-cols-1 gap-6 transition-opacity md:grid-cols-2 ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
          <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>Remaining useful life by cycle</h3></div>
            {e ? <>
              <Key items={split === "train" ? [[`var(--data1)`, "Remaining life (actual)"], [`var(--data2)`, `Training target, capped at ${cfg.cap}`]] : [[`var(--data1)`, "Remaining life (implied)"], [`var(--data2)`, "True value at the last recorded cycle", true]]} />
              <ChartCanvas build={rulBuild} height={340} label="Remaining useful life against cycle for the selected engine" />
              <p className="chart-note">{split === "train" ? `Engine ${unit} fails after ${e.cycle.at(-1)} cycles. The capped line is what the models are trained on.` : `Engine ${unit} was recorded for ${e.cycle.at(-1)} cycles and still has ${e.rul.at(-1)} left. Earlier values are counted back from that, one per cycle.`}</p>
            </> : <ChartSkeleton />}
          </div>
          <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>{m.symbol}, {m.name}</h3></div>
            {e ? <>
              <Key items={[["var(--data1)", "Raw readings"], ...(smooth ? [["var(--data2)", "3-cycle average"]] : [])]} />
              <ChartCanvas build={senBuild} height={340} label="Selected sensor reading against cycle" />
              <dl className="sensor-card">
                <dt>Dataset column</dt><dd>{sensor}</dd>
                <dt>Measures</dt><dd>{m.name}{m.unit ? ` (${m.unit})` : ""}</dd>
                <dt>Link to remaining life</dt><dd>{sg(r)} {Math.abs(r) >= 0.6 ? "(strong)" : Math.abs(r) >= 0.3 ? "(moderate)" : "(weak)"}, across all training rows</dd>
                <dt>Weight in the models</dt><dd>{inp ? n(inp.importance_pct, 1) + "%" : "Not used"}</dd>
              </dl>
            </> : <ChartSkeleton />}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- operating conditions ---------------- */
function Hist({ s, dec, name }) {
  const build = useCallback((t) => ({
    type: "bar",
    data: { labels: s.hist.counts.map((_, i) => ((s.hist.edges[i] + s.hist.edges[i + 1]) / 2).toFixed(dec)), datasets: [{ data: s.hist.counts, backgroundColor: t.data1, borderRadius: 1, categoryPercentage: 1, barPercentage: 0.9 }] },
    options: { scales: { x: axis(t, "Value", { ticks: { color: t.ink3, maxTicksLimit: 5, maxRotation: 0 } }), y: axis(t, "Rows", { beginAtZero: true }) }, plugins: { tooltip: { callbacks: { title: (i) => `Around ${i[0].label}`, label: (c) => ` ${n(c.parsed.y)} rows` } } } },
  }), [s, dec]);
  return <ChartCanvas build={build} height={260} label={`Histogram of ${name}`} />;
}
function Scatter({ set }) {
  const build = useCallback((t) => ({
    type: "scatter",
    data: { datasets: [{ data: set.scatter.x.map((x, i) => ({ x, y: set.scatter.y[i] })), backgroundColor: alpha(t.data1, 0.55), pointRadius: 2.2 }] },
    options: { scales: { x: axis(t, "setting_1"), y: axis(t, "setting_2") }, plugins: { tooltip: { callbacks: { label: (c) => ` setting_1 ${c.parsed.x}, setting_2 ${c.parsed.y}` } } } },
  }), [set]);
  return <ChartCanvas build={build} height={260} label="Scatter of setting 1 against setting 2" />;
}
function Operating({ set }) {
  const s1 = set.setting_1, s2 = set.setting_2;
  return (
    <>
      <Split className="mb-10" a={<h2 id="oh" className="t-h2">Operating conditions</h2>}
        b={<p className="t-lede">{`setting_3 is ${set.setting_3_unique.join(", ")} in every row. setting_1 and setting_2 vary by tiny amounts and show almost no link to remaining life (correlations ${sg(s1.corr_with_rul, 3)} and ${sg(s2.corr_with_rul, 3)}). That is what a single operating condition looks like.`}</p>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>setting_1</h3><span className="text-[.875rem] text-ink2">{`mean ${s1.mean.toExponential(1)}, std ${s1.std.toFixed(4)}`}</span></div><Hist s={s1} dec={4} name="setting 1" /></div>
        <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>setting_2</h3><span className="text-[.875rem] text-ink2">{`mean ${s2.mean.toExponential(1)}, std ${s2.std.toFixed(4)}`}</span></div><Hist s={s2} dec={5} name="setting 2" /></div>
        <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>Both settings together</h3><span className="text-[.875rem] text-ink2">1,500 random rows</span></div><Scatter set={set} /></div>
      </div>
    </>
  );
}

/* ---------------- correlation heatmap ---------------- */
function Heatmap({ cfg, corr }) {
  const [tip, setTip] = useState(null);
  const ids = useMemo(() => corr.labels.filter((l) => l !== "RUL").sort((a, b) => corrWithRul(corr, b) - corrWithRul(corr, a)), [corr]);
  const order = ["RUL", ...ids], N = order.length;
  const val = (a, b) => corr.matrix[corr.labels.indexOf(a)][corr.labels.indexOf(b)];
  const lab = (id) => (id === "RUL" ? "RUL" : `${metaOf(cfg, id).symbol} s${sNum(id)}`);
  const fill = (r) => `color-mix(in srgb, var(${r >= 0 ? "--heat-pos" : "--heat-neg"}) ${Math.round(Math.abs(r) * 100)}%, var(--heat-mid))`;
  const cs = 50, L = 92, T = 92, W = L + N * cs + 56, H = T + N * cs;
  return (
    <>
      <div className="overflow-x-auto" onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[720px] heat" role="img" aria-label="Correlation heatmap of the 14 informative sensors and remaining life. A table version follows.">
          {order.map((a, i) => (
            <g key={a}>
              <text x={L - 10} y={T + i * cs + cs / 2 + 4} textAnchor="end" fontSize="13" fill={a === "RUL" ? "var(--link)" : "var(--ink)"} fontWeight={a === "RUL" ? 600 : 400}>{lab(a)}</text>
              <text transform={`translate(${L + i * cs + cs / 2 + 4},${T - 10}) rotate(-55)`} fontSize="13" fill={a === "RUL" ? "var(--link)" : "var(--ink)"} fontWeight={a === "RUL" ? 600 : 400}>{lab(a)}</text>
            </g>
          ))}
          {order.map((a, i) => order.map((b, j) => {
            const r = val(a, b);
            return (
              <g key={a + b} onMouseMove={(ev) => setTip({ x: ev.clientX, y: ev.clientY, a, b, r })}>
                <rect x={L + j * cs + 1} y={T + i * cs + 1} width={cs - 2} height={cs - 2} style={{ fill: fill(r) }} />
                <text x={L + j * cs + cs / 2} y={T + i * cs + cs / 2 + 4} textAnchor="middle" fontSize="11" fill={Math.abs(r) > 0.45 ? "var(--heat-strong)" : "var(--ink2)"} style={{ fontFamily: "var(--font-mono)" }}>{r.toFixed(2)}</text>
              </g>
            );
          }))}
        </svg>
      </div>
      <div className="mt-[18px] flex flex-wrap items-center gap-x-6 gap-y-3.5">
        <span className="text-[.875rem] text-ink2">-1</span>
        <span className="h-2.5 w-[220px] rounded-[1px]" aria-hidden="true" style={{ background: "linear-gradient(90deg,var(--heat-neg),var(--heat-mid),var(--heat-pos))" }} />
        <span className="text-[.875rem] text-ink2">+1</span>
        <span className="chart-note !m-0">Blue: move in opposite directions. Red: move together. Hover a cell for the exact value, or open the table view below.</span>
      </div>
      <details className="mt-3.5"><summary>View as a table</summary>
        <div className="tbl-wrap mt-2.5"><table><thead><tr><th></th>{order.map((o) => <th key={o}>{lab(o)}</th>)}</tr></thead>
          <tbody>{order.map((a) => <tr key={a}><td>{lab(a)}</td>{order.map((b) => <td key={b}>{val(a, b).toFixed(2)}</td>)}</tr>)}</tbody></table></div>
      </details>
      {tip && (
        <div role="presentation" className="pointer-events-none fixed z-[80] max-w-[260px] rounded-[2px] border border-line bg-panel2 px-3 py-2 text-[.85rem]" style={{ left: Math.min(tip.x + 14, window.innerWidth - 270), top: tip.y + 14 }}>
          <b>{lab(tip.a)}</b> and <b>{lab(tip.b)}</b><br />correlation {sg(tip.r)}
        </div>
      )}
    </>
  );
}

/* ---------------- raw table ---------------- */
function RawTable({ sum }) {
  const [T, setT] = useState({ split: "train", q: "", page: 1, ps: 25 });
  const [qIn, setQIn] = useState("");
  useEffect(() => { const id = setTimeout(() => setT((t) => ({ ...t, q: qIn.trim(), page: 1 })), 300); return () => clearTimeout(id); }, [qIn]);
  const nonDigit = T.q && !/^\d+$/.test(T.q);
  const d = useAsync(() => (nonDigit ? Promise.resolve(null) : api(`/api/dataset/table?split=${T.split}&q=${encodeURIComponent(T.q)}&page=${T.page}&page_size=${T.ps}`)), [T.split, T.q, T.page, T.ps, nonDigit]);
  const page = d.data;
  const go = (p) => setT((t) => ({ ...t, page: p }));
  let body;
  if (nonDigit) body = <StateBox title="Search by engine number" body="Type a whole number such as 17, or clear the box to see every row." />;
  else if (d.error) body = <StateBox kind="error" title="The table could not be loaded" body={d.error.message} onRetry={d.reload} />;
  else if (!page) body = <TableSkeleton rows={8} />;
  else if (!page.total) body = <StateBox title={`No rows for engine ${T.q}`} body={`Engines are numbered 1 to ${sum[T.split + "_engines"]} in the ${T.split === "train" ? "training" : "test"} set.`} />;
  else body = (
    <div className={`tbl-wrap sticky2 transition-opacity ${d.loading ? "opacity-60" : ""}`} tabIndex={0} role="region" aria-label="Raw data table, scrolls sideways">
      <table><thead><tr>{page.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{page.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>
    </div>
  );
  const showPager = !nonDigit && !d.error && page && page.total > 0;
  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-end gap-3.5 max-sm:items-stretch">
        <Seg label="Set" labelId="tSplitLab" options={[["train", "Training"], ["test", "Test"]]} value={T.split} onChange={(v) => setT((t) => ({ ...t, split: v, page: 1 }))} />
        <div className="field max-sm:w-full"><label htmlFor="q">Search by engine number</label><input type="search" id="q" placeholder="For example 17" inputMode="numeric" value={qIn} onChange={(ev) => setQIn(ev.target.value)} className="w-56 max-sm:!w-full" /></div>
        <div className="field max-sm:w-full"><label htmlFor="ps">Rows per page</label>
          <select id="ps" value={T.ps} onChange={(ev) => setT((t) => ({ ...t, ps: parseInt(ev.target.value, 10), page: 1 }))} className="max-sm:w-full">{[10, 25, 50, 100].map((v) => <option key={v}>{v}</option>)}</select></div>
      </div>
      {body}
      {showPager && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 text-[.9rem] text-ink2">
          <span>Rows {n((page.page - 1) * T.ps + 1)} to {n(Math.min(page.page * T.ps, page.total))} of {n(page.total)}</span>
          <span className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" disabled={page.page === 1} onClick={() => go(1)}>First</button>
            <button className="btn btn-ghost btn-sm" disabled={page.page === 1} onClick={() => go(page.page - 1)}>Previous</button>
            <span className="text-[.875rem]">Page {n(page.page)} of {n(page.pages)}</span>
            <button className="btn btn-ghost btn-sm" disabled={page.page === page.pages} onClick={() => go(page.page + 1)}>Next</button>
            <button className="btn btn-ghost btn-sm" disabled={page.page === page.pages} onClick={() => go(page.pages)}>Last</button>
          </span>
        </div>
      )}
    </>
  );
}

export default function Dataset() {
  const core = useAsync(() => Promise.all([config(), api("/api/dataset/summary"), api("/api/dataset/correlation"), api("/api/dataset/settings")]), []);
  const loc = useLocation();
  const ready = !!core.data;
  useEffect(() => { if (ready && loc.hash === "#explorer") { const t = setTimeout(() => document.getElementById("explorer")?.scrollIntoView(), 150); return () => clearTimeout(t); } return undefined; }, [ready, loc.hash]);
  const [cfg, sum, corr, set] = core.data || [];
  const failed = core.error && (
    <section className="py-[clamp(40px,6vw,72px)]"><div className="wrap"><StateBox kind="error" title="The dataset service did not respond" body={core.error.message} onRetry={core.reload} /></div></section>
  );
  return (
    <>
      <PageHead title="Dataset explorer">The real FD001 data behind every model: 200 simulated turbofan engines, each with 21 sensors recorded once per flight cycle.</PageHead>
      {failed || (
        <>
          <Section tight>
            <div className="mb-14">
              {ready ? <Stats padded items={[[n(sum.train_engines), "training engines, each run to failure"], [n(sum.test_engines), "test engines, stopped before failure"], [n(sum.train_rows), "training rows of sensor readings"], [n(sum.test_rows), "test rows of sensor readings"]]} />
                : <Skeleton className="h-[110px]" />}
            </div>
            {ready ? <Overview cfg={cfg} sum={sum} corr={corr} set={set} /> : <div className="grid gap-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-6" /><Skeleton className="h-6" /><Skeleton className="h-6" /><div className="grid gap-6 md:grid-cols-2"><ChartSkeleton height={300} /><ChartSkeleton height={300} /></div></div>}
          </Section>

          <Section alt id="explorer" label="eh">
            <h2 id="eh" className="t-h2">Follow one engine</h2>
            <p className="t-lede mb-7 mt-3.5">Training engines run to failure, so their remaining life is known on every row. Test engines stop early, and their remaining life is implied by counting down from the true value at the last recorded cycle.</p>
            {ready ? <Explorer cfg={cfg} corr={corr} /> : <ChartSkeleton height={420} />}
          </Section>

          <Section label="oh">{ready ? <Operating set={set} /> : <ChartSkeleton height={300} />}</Section>

          <Section alt label="ch">
            <Split className="mb-10" a={<h2 id="ch" className="t-h2">Sensors move together</h2>} b={<p className="t-lede">Correlation between the 14 informative sensors and remaining life, across all training rows. Sensors are ordered from most positive to most negative against RUL.</p>} />
            <div className="panel panel-pad">{ready ? <Heatmap cfg={cfg} corr={corr} /> : <ChartSkeleton height={420} />}</div>
          </Section>

          <Section label="th">
            <h2 id="th" className="t-h2">Raw data</h2>
            <p className="t-lede mb-[26px] mt-3.5">Every row of the original files, including the columns the models drop.</p>
            {ready ? <RawTable sum={sum} /> : <TableSkeleton rows={8} />}
          </Section>
        </>
      )}
    </>
  );
}
