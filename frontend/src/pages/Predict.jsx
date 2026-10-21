import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, config, useAsync } from "../lib/api";
import { MODELS, SHORT, STATUS_LABEL } from "../lib/constants";
import { decimals, n } from "../lib/format";
import { axis, modelColor } from "../lib/chart";
import ChartCanvas from "../components/ChartCanvas";
import Gauge from "../components/Gauge";
import PredBars from "../components/PredBars";
import { Badge, Key, Loading, PageHead, Skeleton, StateBox } from "../components/ui";

/* Prediction lab. Every number comes from POST /api/predict and /api/predict-csv, which run the saved Stage 6 models. */

const fmtIn = (v, step) => (Number.isFinite(v) ? v.toFixed(decimals(step)) : "");
const toNum = (s) => (String(s).trim() === "" ? NaN : Number(s));
const labelFor = (cfg, spec) => {
  const m = cfg.sensor_meta;
  if (spec.name === "cycle") return ["Cycle", "Flight cycles completed", ""];
  if (m.sensors[spec.name]) { const s = m.sensors[spec.name]; return [s.symbol, s.name, s.unit]; }
  const t = m.settings[spec.name]; return [t.symbol, t.name, ""];
};
const defaultsOf = (cfg) => Object.fromEntries(cfg.inputs.map((s) => [s.name, fmtIn(s.default, s.step)]));

/* ---------------- one slider + number control ---------------- */
function Control({ spec, cfg, text, onSlider, onText, onBlur }) {
  const [sym, nm, unit] = labelFor(cfg, spec), id = spec.name, dec = decimals(spec.step), v = toNum(text);
  const inRange = Number.isFinite(v) ? Math.min(Math.max(v, spec.min), spec.max) : Math.min(Math.max(spec.default, spec.min), spec.max);
  let msg = "", bad = false;
  if (!Number.isFinite(v)) { msg = "Enter a number"; bad = true; }
  else if (id === "cycle" && (v < 1 || !Number.isInteger(v))) { msg = "Use a whole number of 1 or more"; bad = true; }
  else if (v < spec.min || v > spec.max) msg = `Outside the training range ${n(spec.min, dec)} to ${n(spec.max, dec)}`;
  const imp = spec.importance_pct;
  return (
    <div className="border-b border-soft pb-3.5 pt-4">
      <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={`n-${id}`} className="text-[.95rem] font-medium text-ink"><span className="mr-2 font-display font-bold [font-stretch:112%]">{sym}</span><span className="font-normal text-ink2">{nm}</span></label>
        <span className="inline-flex items-center gap-2 text-[.8rem] text-ink3" title="Share of the Random Forest and XGBoost decisions that rely on this input">Model weight {n(imp, 1)}%<i className="inline-block h-1 min-w-0.5 rounded-sm bg-link" style={{ width: Math.max(2, imp * 1.6) }} /></span>
      </div>
      <div className="grid grid-cols-1 items-center gap-[18px] sm:grid-cols-[1fr_auto]">
        <input type="range" id={`r-${id}`} min={spec.min} max={spec.max} step={spec.step} value={inRange} aria-label={`${sym} slider`}
          style={{ "--fill": `${((inRange - spec.min) / (spec.max - spec.min)) * 100}%` }} onChange={(e) => onSlider(id, parseFloat(e.target.value))} />
        <div className="flex items-center gap-2 max-sm:justify-between">
          <input type="number" id={`n-${id}`} step={spec.step} inputMode="decimal" value={text} aria-describedby={`w-${id}`} className={`max-sm:!w-full ${bad || msg ? "invalid" : ""}`}
            onChange={(e) => onText(id, e.target.value)} onBlur={() => onBlur(id)} />
          <span className="min-w-[4.4em] text-[.8rem] text-ink3">{unit}</span>
        </div>
      </div>
      <div className="-mt-0.5 flex justify-between gap-3 font-mono text-[.76rem] text-ink3">
        <span>{n(spec.min, dec)}</span>
        <span id={`w-${id}`} role="status" className={`flex-1 text-center font-body text-[.84rem] ${bad ? "text-critical" : "text-warning"}`}>{msg}</span>
        <span>{n(spec.max, dec)}</span>
      </div>
    </div>
  );
}

/* ---------------- result panel ---------------- */
function Result({ p, model, setModel, cfg, busy }) {
  const m = p.predictions[model], rf = (cfg.test_metrics || {})["Random Forest"];
  let truth = null;
  if (p.truth != null) {
    const diff = m.rul - p.truth, word = Math.abs(diff) < 0.5 ? "on target" : diff > 0 ? `${n(Math.abs(diff), 1)} cycles too optimistic` : `${n(Math.abs(diff), 1)} cycles too cautious`;
    truth = <div className="mt-[18px] rounded-[2px] border border-l-[3px] border-line border-l-cyan px-3.5 py-3 text-[.92rem] text-ink2"><b className="font-semibold text-ink">Actual remaining life: {n(p.truth)} cycles.</b> {model} is {word}. A single reading uses its own value as the rolling average, so this can differ a little from the test results.</div>;
  }
  return (
    <div>
      <div className="panel-h !mb-2.5"><h3>{p.title}</h3></div>
      <div className="seg mb-2.5" role="group" aria-label="Model shown in the gauge">
        {MODELS.map((nm) => <button key={nm} type="button" aria-pressed={nm === model} onClick={() => setModel(nm)}>{SHORT[nm]}</button>)}
      </div>
      <div className={`transition-opacity duration-150 ${busy ? "opacity-55" : ""}`}>
        <div className="mx-auto mt-1.5 max-w-[380px]"><Gauge rul={m.rul} status={m.status} atCap={m.at_cap} cfg={cfg} /></div>
        <div className="mb-1 mt-1.5 flex justify-center"><Badge status={m.status} /></div>
        {m.at_cap && <p className="mt-2 text-center text-[.84rem] leading-normal text-ink3">The models are trained to tell apart the last {cfg.cap} cycles of life, so anything above that is shown as {cfg.cap}+.</p>}
        <h4 className="mb-1.5 mt-[26px] font-body text-[.95rem] font-semibold text-ink2">All three models</h4>
        <PredBars preds={p.predictions} cfg={cfg} />
      </div>
      {truth}
      {p.warnings && p.warnings.length > 0 && (
        <div role="status" className="mt-3.5 rounded-[2px] border border-warning px-3.5 py-3 text-[.88rem] text-ink"><b>Check these inputs</b><ul className="mb-0 mt-1.5 pl-[18px] text-ink2">{p.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
      )}
      {!p.exact_rolling_mean && <p className="mb-0 mt-[18px] text-[.84rem] leading-normal text-ink3">{p.kind === "csv" ? "This engine has fewer than three rows, so the rolling average is approximate. " : "This is a single reading, so the three-cycle rolling average is approximate. "}Upload three or more cycles for the exact calculation.</p>}
      <p className="mb-0 mt-[18px] text-[.84rem] leading-normal text-ink3">This is an estimate, not a guaranteed failure date. On 100 unseen test engines the best model, Random Forest, is off by {rf ? n(rf.test_MAE, 1) : "about 14"} cycles on average, and some engines by 40 or more.</p>
    </div>
  );
}

/* ---------------- CSV trend chart ---------------- */
function CsvChart({ rows, cfg }) {
  const build = useCallback((t) => {
    const cap = cfg.cap, th = cfg.status_thresholds;
    const guides = { id: "guides", afterDatasetsDraw(c) {
      const { ctx, chartArea: a, scales: { y } } = c; ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = 1; ctx.font = '400 11px "IBM Plex Sans"'; ctx.fillStyle = t.ink3;
      [[th.critical_below, "Critical below " + th.critical_below, t.critical], [th.warning_below, "Warning below " + th.warning_below, t.warning]].forEach(([v, l, col]) => { const py = y.getPixelForValue(v); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke(); ctx.fillText(l, a.left + 6, py - 5); });
      ctx.restore();
    } };
    const ends = { id: "ends", afterDatasetsDraw(c) {
      const { ctx } = c; ctx.save(); ctx.font = '500 12px "IBM Plex Sans"'; ctx.fillStyle = t.ink; ctx.textBaseline = "middle";
      const pts = c.data.datasets.map((ds, i) => { const pt = c.getDatasetMeta(i).data.at(-1); return pt ? { x: pt.x, y: pt.y, t: SHORT[ds.label] } : null; }).filter(Boolean).sort((a, b) => a.y - b.y);
      for (let i = 1; i < pts.length; i++) if (pts[i].y - pts[i - 1].y < 15) pts[i].y = pts[i - 1].y + 15; // keep neighbouring labels apart
      pts.forEach((p) => ctx.fillText(p.t, p.x + 8, p.y)); ctx.restore();
    } };
    return {
      type: "line",
      data: { datasets: MODELS.map((m) => ({ label: m, data: rows.map((r) => ({ x: r.cycle, y: r["pred_" + m] })), borderColor: modelColor(t, m), backgroundColor: modelColor(t, m), borderWidth: 2, pointHoverRadius: 5 })) },
      options: { parsing: false, normalized: true, interaction: { mode: "index", intersect: false }, layout: { padding: { right: 70 } },
        scales: { x: axis(t, "Cycle", { type: "linear" }), y: axis(t, "Predicted RUL (cycles)", { min: 0, max: cap + 5 }) },
        plugins: { tooltip: { callbacks: { title: (i) => `Cycle ${i[0].parsed.x}`, label: (c) => ` ${c.dataset.label}: ${n(c.parsed.y, 1)}` } } } },
      plugins: [guides, ends],
    };
  }, [rows, cfg]);
  return <ChartCanvas build={build} height={420} label="Line chart of predicted remaining useful life by cycle for the three models" />;
}

/* ---------------- the lab ---------------- */
function Lab({ cfg, examples }) {
  const ids = useMemo(() => cfg.inputs.map((s) => s.name), [cfg]);
  const [txt, setTxt] = useState(() => defaultsOf(cfg));
  const [example, setExample] = useState(null);
  const [mode, setMode] = useState("manual");
  const [model, setModel] = useState("Random Forest");
  const [manual, setManual] = useState({ payload: null, error: null, invalid: false });
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exSel, setExSel] = useState(examples[0]?.id);
  const seq = useRef(0);
  const resultRef = useRef(null);
  const [showFloat, setShowFloat] = useState(false);

  const vals = useMemo(() => Object.fromEntries(ids.map((id) => [id, toNum(txt[id])])), [ids, txt]);
  const invalid = ids.filter((id) => !Number.isFinite(vals[id]) || (id === "cycle" && (vals[id] < 1 || !Number.isInteger(vals[id]))));
  const valsKey = JSON.stringify(vals);

  /* debounced live prediction */
  useEffect(() => {
    const my = ++seq.current;
    if (invalid.length) { setManual({ payload: null, error: null, invalid: true }); setBusy(false); return undefined; }
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await api("/api/predict", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inputs: vals }) });
        if (my !== seq.current) return;
        setManual({ payload: { ...r, title: example ? `Test engine ${example.unit}, last recorded cycle` : "Your readings", truth: example ? example.true_rul : null, kind: "manual" }, error: null, invalid: false });
      } catch (e) {
        if (my === seq.current) setManual({ payload: null, error: e, invalid: false });
      } finally { if (my === seq.current) setBusy(false); }
    }, manual.payload || manual.error ? 260 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valsKey, example, retry]);

  const setField = (id, v) => { setTxt((t) => ({ ...t, [id]: v })); setExample(null); };
  const onSlider = (id, v) => { const s = cfg.inputs.find((x) => x.name === id); setField(id, fmtIn(v, s.step)); };
  const onBlur = (id) => { const s = cfg.inputs.find((x) => x.name === id), v = toNum(txt[id]); if (Number.isFinite(v)) setTxt((t) => ({ ...t, [id]: fmtIn(v, s.step) })); };
  const setAll = (map, ex) => { setTxt(Object.fromEntries(cfg.inputs.map((s) => [s.name, fmtIn(map[s.name] != null ? map[s.name] : s.default, s.step)]))); setExample(ex || null); };
  const loadExample = (id) => { const e = examples.find((x) => x.id === id); if (e) setAll(e.inputs, e); };

  /* deep link: /predict?example=critical */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("example");
    if (q && examples.some((e) => e.id === q)) { setExSel(q); loadExample(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- CSV ---- */
  const [csv, setCsv] = useState({ state: "idle", error: null, data: null, name: "", unit: null });
  const [over, setOver] = useState(false);
  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && !/csv|text/.test(file.type)) return setCsv({ state: "error", error: ["That is not a CSV file", "Choose a file ending in .csv, or download the sample to see the format."], data: null, name: "", unit: null });
    if (file.size > 5 * 1024 * 1024) return setCsv({ state: "error", error: ["The file is larger than 5 MB", "Upload one engine at a time or trim the rows."], data: null, name: "", unit: null });
    setCsv({ state: "reading", error: null, data: null, name: file.name, unit: null });
    try {
      const fd = new FormData(); fd.append("file", file);
      const data = await api("/api/predict-csv", { method: "POST", body: fd });
      setCsv({ state: "ok", error: null, data, name: file.name, unit: data.summary[0].unit });
    } catch (e) { setCsv({ state: "error", error: ["This file could not be used", e.message], data: null, name: "", unit: null }); }
  };
  const csvRows = useMemo(() => (csv.data ? csv.data.rows.filter((r) => r.unit === csv.unit) : []), [csv.data, csv.unit]);
  const csvPayload = useMemo(() => {
    if (!csv.data) return null;
    const s = csv.data.summary.find((x) => x.unit === csv.unit); if (!s || !csvRows.length) return null;
    return { ...s, title: `Engine ${csv.unit}, cycle ${csvRows[csvRows.length - 1].cycle}`, truth: null, kind: "csv" };
  }, [csv.data, csv.unit, csvRows]);
  const download = () => {
    const head = ["unit", "cycle", ...MODELS.map((m) => "pred_" + m.replace(/ /g, "_"))];
    const text = [head.join(","), ...csv.data.rows.map((r) => [r.unit, r.cycle, ...MODELS.map((m) => r["pred_" + m])].join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = "aerolytics_predictions.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  /* ---- result panel content ---- */
  const payload = mode === "manual" ? manual.payload : csvPayload;
  let resultBody;
  if (mode === "manual" && manual.invalid) resultBody = <StateBox kind="error" title="Check the highlighted inputs" body="Every field needs a valid number before the models can run." />;
  else if (mode === "manual" && manual.error) resultBody = <StateBox kind="error" title="The prediction did not run" body={manual.error.message} onRetry={() => setRetry((r) => r + 1)} />;
  else if (payload) resultBody = <Result p={payload} model={model} setModel={setModel} cfg={cfg} busy={busy && mode === "manual"} />;
  else if (mode === "csv") resultBody = <StateBox title="No engine uploaded yet" body="Upload a CSV to see the estimate for its last recorded cycle." />;
  else resultBody = <Loading title="Running the models" />;

  useEffect(() => {
    const el = resultRef.current; if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setShowFloat(!e.isIntersecting)); io.observe(el); return () => io.disconnect();
  }, []);
  const floatOn = showFloat && mode === "manual" && !!manual.payload;
  const fm = manual.payload && manual.payload.predictions[model];

  const main = cfg.inputs.filter((s) => s.group === "main"), adv = cfg.inputs.filter((s) => s.group !== "main");
  const ctl = (s) => <Control key={s.name} spec={s} cfg={cfg} text={txt[s.name] ?? ""} onSlider={onSlider} onText={setField} onBlur={onBlur} />;

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <div className="seg" role="group" aria-label="Input method">
            <button type="button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>Enter readings</button>
            <button type="button" aria-pressed={mode === "csv"} onClick={() => setMode("csv")}>Upload CSV</button>
          </div>

          {mode === "manual" && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pb-[22px] pt-[18px]">
                <div className="flex flex-wrap items-end gap-3.5 max-sm:w-full max-sm:items-stretch">
                  <div className="field max-sm:w-full"><label htmlFor="exSel">Start from a real engine</label>
                    <select id="exSel" value={exSel} onChange={(e) => setExSel(e.target.value)} className="max-sm:w-full">{examples.map((e) => <option key={e.id} value={e.id}>{e.label} (test engine {e.unit})</option>)}</select></div>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => loadExample(exSel)}>Load example</button>
                </div>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAll({}, null)}>Reset to typical values</button>
              </div>
              <div className="border-t border-line" aria-label="Main inputs">{main.map(ctl)}</div>
              <details className="mt-[18px]">
                <summary>Advanced inputs ({adv.length})</summary>
                <p className="mb-2 mt-1 text-[.875rem] text-ink2">These move the estimate less. They keep typical values unless you change them.</p>
                <div className="border-t border-line">{adv.map(ctl)}</div>
              </details>
              <p className="chart-note !mt-[22px]">Sliders can combine values that no real engine would produce. Treat results from heavily edited readings as the models' response to the numbers, not a forecast.</p>
            </div>
          )}

          {mode === "csv" && (
            <div className="pt-[22px]">
              <label htmlFor="file" className={`drop ${over ? "over" : ""}`}
                onDragEnter={(e) => { e.preventDefault(); setOver(true); }} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setOver(false); }} onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}>
                <input type="file" id="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files[0])} />
                <strong className="mb-1.5 block font-body text-[1.05rem] font-semibold text-ink">Drop a CSV here or choose a file</strong>
                <span className="text-[.875rem] text-ink2">One engine's recorded cycles, up to 5 MB. Three or more rows give the exact rolling average.</span>
              </label>
              <p className="mt-3.5 flex flex-wrap gap-6"><a className="link" href="/api/sample-csv" download>Download a sample CSV</a></p>
              <details className="mt-2"><summary>Required columns</summary>
                <ul className="req">{cfg.csv_required_columns.map((c) => <li key={c}>{c}</li>)}</ul>
                <p className="mt-2.5 text-[.875rem] text-ink2">An optional <span className="num">unit</span> column lets one file hold several engines. Extra columns are ignored.</p></details>
              <div className="mt-[18px]" aria-live="polite">
                {csv.state === "reading" && <Loading title={`Reading ${csv.name}`} body="Running the three models on every row." />}
                {csv.state === "error" && <StateBox kind="error" title={csv.error[0]} body={csv.error[1]} />}
                {csv.state === "ok" && <p className="m-0 text-[.875rem] text-ink2">{csv.name}: {n(csv.data.rows.length)} rows, {csv.data.summary.length} engine{csv.data.summary.length > 1 ? "s" : ""}.</p>}
              </div>
              {csv.state === "ok" && (
                <div>
                  <div className="mb-3.5 mt-6 flex flex-wrap items-center justify-between gap-3.5">
                    {csv.data.summary.length > 1 && <div className="field"><label htmlFor="unitSel">Engine</label>
                      <select id="unitSel" value={csv.unit} onChange={(e) => setCsv((c) => ({ ...c, unit: parseInt(e.target.value, 10) }))}>{csv.data.summary.map((s) => <option key={s.unit} value={s.unit}>Engine {s.unit}</option>)}</select></div>}
                    <button className="btn btn-ghost btn-sm" type="button" onClick={download}>Download predictions</button>
                  </div>
                  <div className="panel panel-pad">
                    <div className="panel-h"><h3>Predicted remaining life by cycle</h3></div>
                    <Key items={MODELS.map((m) => [`var(--m-${m === "Linear Regression" ? "lr" : m === "Random Forest" ? "rf" : "xgb"})`, m])} />
                    <CsvChart rows={csvRows} cfg={cfg} />
                    <p className="chart-note">Dashed lines mark the critical (30) and warning (60) thresholds. The first two cycles use a shorter rolling average, so early predictions are less reliable.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside ref={resultRef} className="panel p-[clamp(20px,2.6vw,32px)] max-lg:order-first lg:sticky lg:top-[88px]" aria-label="Prediction result" aria-live="polite">{resultBody}</aside>
      </div>

      <button type="button" onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-[2px] border-0 bg-ink px-5 py-3 font-body text-[.95rem] font-semibold text-page shadow-[var(--shadow)] lg:!hidden ${floatOn ? "inline-flex" : "hidden"}`}>
        {fm ? `Estimate: ${fm.at_cap ? cfg.cap + "+" : n(fm.rul, 0)} cycles, ${STATUS_LABEL[fm.status]}` : "Jump to estimate"}
      </button>
    </>
  );
}

export default function Predict() {
  const init = useAsync(() => Promise.all([config(), api("/api/examples")]), []);
  return (
    <>
      <PageHead title="Prediction lab">Set the sensor readings, or upload an engine's recorded cycles. Three trained models estimate how many cycles are left.</PageHead>
      <section className="py-[clamp(40px,6vw,72px)]">
        <div className="wrap">
          {init.error ? <StateBox kind="error" title="The prediction service did not respond" body={init.error.message} onRetry={init.reload} />
            : init.data ? <Lab cfg={init.data[0]} examples={init.data[1]} />
            : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12" role="status" aria-label="Loading the prediction lab">
                <div className="grid gap-4"><Skeleton className="h-11 w-64" />{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[74px]" />)}</div>
                <Skeleton className="h-[520px]" />
              </div>
            )}
        </div>
      </section>
    </>
  );
}
