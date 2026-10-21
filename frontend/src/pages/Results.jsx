import { useCallback, useState } from "react";
import { api, useAsync } from "../lib/api";
import { MODELS, MODEL_VAR, SHAPE, SHORT } from "../lib/constants";
import { n, sg } from "../lib/format";
import { axis, dotPlotConfig, modelColor, valueLabels, wrap } from "../lib/chart";
import ChartCanvas from "../components/ChartCanvas";
import { ChartSkeleton, DataTable, Key, ModelKey, PageHead, Section, Skeleton, Split, StateBox } from "../components/ui";

const ABL = { "Final setup (cap 125, window 3, + cycle)": "Final setup", "No cap (raw RUL target)": "No cap", "No rolling mean (raw sensors only)": "No rolling average", "No cycle feature": "No cycle number" };

function Scores({ test, best }) {
  return (
    <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {MODELS.map((m) => {
        const t = test[m], isBest = m === best;
        return (
          <div key={m} className={`panel panel-pad min-w-0 ${isBest ? "!border-link" : ""}`}>
            <div className="panel-h !mb-1.5 min-h-10 !items-center"><h3 className="flex items-center gap-2.5"><i className="inline-block h-3 w-3 rounded-[2px]" style={{ background: MODEL_VAR[m] }} />{m}</h3>{isBest && <span className="badge st-healthy !text-link">Lowest error</span>}</div>
            <div className="mb-1 mt-3.5"><span className="block font-display text-[3.2rem] font-bold leading-none [font-stretch:112%] tracking-[-.01em]">{n(t.test_RMSE, 2)}</span><span className="mt-1.5 block text-[.85rem] text-ink3">RMSE, in cycles</span></div>
            <dl className="sensor-card !grid-cols-[1fr_auto]"><dt>MAE</dt><dd className="num">{n(t.test_MAE, 2)} cycles</dd><dt>R²</dt><dd className="num">{n(t.test_R2, 3)}</dd></dl>
          </div>
        );
      })}
    </div>
  );
}

function PredVsActual({ r, test, best }) {
  const [sel, setSel] = useState(best), P = r.predictions;
  const errs = P.map((p) => p[sel] - p.true_RUL), within = (k) => errs.filter((e) => Math.abs(e) <= k).length;
  const build = useCallback((t) => ({
    type: "scatter",
    data: { datasets: [
      { label: "Perfect prediction", type: "line", data: [{ x: 0, y: 0 }, { x: 150, y: 150 }], borderColor: t.ink3, borderDash: [6, 5], borderWidth: 1.2, pointRadius: 0, pointHoverRadius: 0 },
      { label: sel, data: P.map((p) => ({ x: p.true_RUL, y: p[sel], unit: p.unit })), backgroundColor: modelColor(t, sel), borderColor: t.panel, borderWidth: 1.5, pointRadius: 5.5, pointHoverRadius: 8, pointStyle: SHAPE[sel] }] },
    options: { scales: { x: axis(t, "Actual remaining life (cycles)", { min: 0, max: 150 }), y: axis(t, "Predicted remaining life (cycles)", { min: 0, max: 150 }) },
      plugins: { tooltip: { filter: (i) => i.datasetIndex === 1, callbacks: { title: (i) => `Engine ${i[0].raw.unit}`, label: (c) => [` Actual: ${c.parsed.x}`, ` Predicted: ${n(c.parsed.y, 1)}`] } } } },
  }), [sel, P]);
  return (
    <Split rev
      a={<>
        <dl className="sensor-card !mt-0 !grid-cols-[1fr_auto] !border-t-0 !pt-0">
          <dt>Within 10 cycles</dt><dd className="num">{within(10)} of {P.length}</dd>
          <dt>Within 20 cycles</dt><dd className="num">{within(20)} of {P.length}</dd>
          <dt>Too optimistic</dt><dd className="num">{errs.filter((e) => e > 0).length} engines</dd>
          <dt>Too cautious</dt><dd className="num">{errs.filter((e) => e < 0).length} engines</dd>
          <dt>Largest miss</dt><dd className="num">{n(Math.max(...errs.map(Math.abs)), 1)} cycles</dd>
        </dl>
        <p className="chart-note !mt-5">Dots above the line are too optimistic: the model thinks the engine has more life than it does. Dots below are too cautious. In maintenance, optimistic misses are the costly ones.</p>
      </>}
      b={<div className="panel panel-pad">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3.5">
          <div className="seg" role="group" aria-label="Model shown">{MODELS.map((m) => <button key={m} type="button" aria-pressed={m === sel} onClick={() => setSel(m)}>{SHORT[m]}</button>)}</div>
          <span className="text-[.875rem] text-ink2">{sel}: RMSE {n(test[sel].test_RMSE, 2)}</span>
        </div>
        <ChartCanvas build={build} height={520} label="Scatter of predicted against actual remaining life for the selected model" />
      </div>} />
  );
}

function Bands({ r }) {
  const eb = r.error_bands;
  const build = useCallback((t) => ({
    type: "bar",
    data: { labels: eb.map((b) => [`${b.band} left`, `${b.engines} engines`]), datasets: MODELS.map((m) => ({ label: m, data: eb.map((b) => b[m]), backgroundColor: modelColor(t, m), borderRadius: 2, barPercentage: 0.88, categoryPercentage: 0.78 })) },
    options: { layout: { padding: { top: 18 } }, scales: { x: axis(t, null, { grid: { display: false }, ticks: { color: t.ink } }), y: axis(t, "RMSE (cycles)", { beginAtZero: true }) }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${n(c.parsed.y, 1)}` } } } },
    plugins: [valueLabels(t, (v) => n(v, 0))],
  }), [eb]);
  return (
    <div className="panel panel-pad">
      <div className="panel-h"><h3>Test RMSE by remaining life</h3><span className="text-[.875rem] text-ink2">cycles, lower is better</span></div>
      <Key items={MODELS.map((m) => [MODEL_VAR[m], m, true])} />
      <ChartCanvas build={build} height={420} label="Grouped bars of test RMSE by remaining-life range for each model" />
    </div>
  );
}

function Ablation({ r }) {
  const ab = r.ablation, fin = ab[0];
  const build = useCallback((t) => dotPlotConfig(t, ab.map((a) => wrap(ABL[a.setup] || a.setup, 14)), Object.fromEntries(MODELS.map((m) => [m, ab.map((a) => a[m])])), "Cross-validated RMSE (cycles)", { y: { min: 14, max: 24 } }), [ab]);
  const delta = (row, m) => row[m] - fin[m];
  const rf = (k) => delta(ab.find((a) => (ABL[a.setup] || "") === k), "Random Forest");
  return (
    <>
      <Split className="mb-8" a={<h2 id="ab" className="t-h2">What each choice contributed</h2>}
        b={<p className="t-lede">{`Removing the cycle number cost Random Forest ${n(rf("No cycle number"), 1)} RMSE and removing the cap cost ${n(rf("No cap"), 1)}. Removing the rolling average cost only ${n(rf("No rolling average"), 1)}, so it helps a little but is the least important of the three. The cap matters most for Linear Regression.`}</p>} />
      <div className="panel panel-pad">
        <div className="panel-h"><h3>Cross-validated RMSE with one choice removed</h3><span className="text-[.875rem] text-ink2">default model settings</span></div>
        <ModelKey />
        <ChartCanvas build={build} height={420} label="Dot plot of cross-validated RMSE when each design choice is removed" />
        <p className="chart-note">These runs use default model settings, so the final-setup numbers are slightly higher than the tuned figures. Compare rows with each other.</p>
        <h4 className="mb-2.5 mt-[26px] font-body text-[.95rem] font-semibold text-ink2">Change in RMSE when removed (higher means the choice mattered more)</h4>
        <div className="tbl-wrap tbl-text"><DataTable cols={["Choice removed", ...MODELS]} rows={ab.slice(1).map((a) => [ABL[a.setup] || a.setup, ...MODELS.map((m) => sg(delta(a, m), 2))])} /></div>
      </div>
    </>
  );
}

export default function Results() {
  const { data: r, error, reload } = useAsync(() => api("/api/results"), []);
  const head = <PageHead title="Results">How the models did on 100 engines they had never seen, scored against each engine's actual remaining life.</PageHead>;
  if (error) return <>{head}<Section tight><StateBox kind="error" title="The results could not be loaded" body={error.message} onRetry={reload} /></Section></>;
  if (!r) return <>{head}<Section tight><div role="status" aria-label="Loading" className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-[220px]" /><Skeleton className="h-[220px]" /><Skeleton className="h-[220px]" /></div></Section><Section alt><ChartSkeleton height={420} /></Section></>;
  const test = Object.fromEntries(r.test.map((t) => [t.model, t])), best = r.best_model;
  return (
    <>
      {head}
      <Section tight label="hm">
        <h2 id="hm" className="t-h2">Official test scores</h2>
        <Scores test={test} best={best} />
        <div className="prose mt-8"><p><strong>RMSE</strong> is the typical size of an error in cycles, with large misses counting extra. <strong>MAE</strong> is the plain average miss. <strong>R&sup2;</strong> is the share of the variation in remaining life that the model explains. Lower is better for the first two, higher for R&sup2;.</p></div>
      </Section>

      <Section alt label="pv">
        <Split className="mb-8" a={<h2 id="pv" className="t-h2">Predicted against actual</h2>}
          b={<p className="t-lede">One dot per test engine, at its last recorded cycle. A perfect model puts every dot on the dashed line. Predictions stop at 125, so dots for engines with more life left sit below the line.</p>} />
        <PredVsActual r={r} test={test} best={best} />
      </Section>

      <Section label="eb">
        <Split className="mb-8" a={<h2 id="eb" className="t-h2">Where the errors are</h2>}
          b={<p className="t-lede">The tree models are most accurate for engines with 30 to 60 cycles left, and least accurate for engines with 100 or more. Linear Regression is clearly worse than both tree models for engines in their last 30 cycles, where a wrong call matters most.</p>} />
        <Bands r={r} />
        <h3 className="t-h3 mb-3.5 mt-12">Ten hardest engines</h3>
        <p className="mb-3.5 text-[.875rem] text-ink2">Ranked by average error across the three models. Positive error means the model was too optimistic.</p>
        <div className="tbl-wrap tbl-text"><DataTable cols={["Engine", "Last cycle", "Actual left", ...MODELS.map((m) => `${SHORT[m]} error`)]} rows={r.worst.map((w) => [`Engine ${w.unit}`, w.last_cycle, w.true_RUL, ...MODELS.map((m) => sg(w["err_" + m], 1))])} /></div>
      </Section>

      <Section alt label="ab"><Ablation r={r} /></Section>
    </>
  );
}
