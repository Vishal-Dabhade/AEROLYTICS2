import { useCallback } from "react";
import { api, config, useAsync } from "../lib/api";
import { MODELS, MODEL_VAR } from "../lib/constants";
import { n } from "../lib/format";
import { axis, dotPlotConfig, modelColor, wrap } from "../lib/chart";
import ChartCanvas from "../components/ChartCanvas";
import { ChartSkeleton, DataTable, Key, ModelKey, PageHead, Section, Skeleton, Split, StateBox } from "../components/ui";

const EXP_LABEL = { "baseline cap125 W5 nocycle": "Starting point (cap 125, 5-cycle average)", "cap=110": "Cap 110", "cap=130": "Cap 130", "cap=150": "Cap 150", "window=10": "10-cycle average", "window=15": "15-cycle average", "with cycle": "Add the cycle number" };

function Profile({ m, what, why, params, test, best }) {
  return (
    <div className="panel panel-pad min-w-0">
      <div className="panel-h !mb-2.5"><h3 className="flex items-center gap-2.5"><i className="inline-block h-3 w-3 rounded-[2px]" style={{ background: MODEL_VAR[m] }} />{m}</h3></div>
      <p className="mb-3 text-[.875rem] text-ink2">{what}</p>
      <p className="mb-3.5 text-[.875rem]">{why}</p>
      <div className="num text-[.875rem] leading-[1.7] text-ink2">{params}</div>
      <p className="mb-0 mt-4 border-t border-soft pt-3 text-[.875rem]">Test RMSE <b className="num text-ink">{n(test[m].test_RMSE, 2)}</b> {m === best ? <span className="st-healthy text-[.875rem]">(lowest)</span> : null}</p>
    </div>
  );
}

function Experiments({ r }) {
  const finalRow = r.ablation[0];
  const rows = [...r.experiments.map((e) => ({ label: EXP_LABEL[e.experiment] || e.experiment, v: e })), { label: "Final: 3-cycle average and cycle number", v: finalRow }];
  const build = useCallback((t) => dotPlotConfig(t, rows.map((x) => wrap(x.label, 16)), Object.fromEntries(MODELS.map((m) => [m, rows.map((x) => x.v[m])])), "Cross-validated RMSE (cycles)", { y: { min: 14, max: 24 } }), [r]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="panel panel-pad">
      <div className="panel-h"><h3>Cross-validated RMSE by experiment</h3><span className="text-[.875rem] text-ink2">5-fold, split by engine</span></div>
      <ModelKey />
      <ChartCanvas build={build} height={420} label="Dot plot of cross-validated RMSE for each experiment and model" />
      <p className="chart-note">All experiments are scored against the same reference, remaining life capped at 125, so the cap values are comparable. A cap below 125 cannot reach that reference at the top end, which slightly penalises cap 110.</p>
      <details><summary>View as a table</summary><div className="tbl-wrap tbl-text mt-2.5"><DataTable cols={["Experiment", ...MODELS]} rows={rows.map((x) => [x.label, ...MODELS.map((m) => n(x.v[m], 2))])} hl={rows.length - 1} /></div></details>
    </div>
  );
}

function Importance({ r, cfg }) {
  const imp = [...r.importance].sort((a, b) => b.avg - a.avg);
  const name = (f) => (f === "cycle" ? "cycle" : cfg.sensor_meta.sensors[f] ? `${cfg.sensor_meta.sensors[f].symbol} (${f.replace("_", " ")})` : f);
  const build = useCallback((t) => ({
    type: "bar",
    data: { labels: imp.map((x) => name(x.feature)), datasets: ["Random Forest", "XGBoost"].map((m) => ({ label: m, data: imp.map((x) => x[m] * 100), backgroundColor: modelColor(t, m), borderRadius: 1, barPercentage: 0.9, categoryPercentage: 0.8 })) },
    options: { indexAxis: "y", scales: { x: axis(t, "Share of decisions (%)", { beginAtZero: true }), y: { grid: { display: false }, border: { color: t.line }, ticks: { color: t.ink, autoSkip: false } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${n(c.parsed.x, 1)}%` } } } },
  }), [r, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Split className="mb-9" a={<h2 id="fi" className="t-h2">What the models rely on</h2>}
        b={<p className="t-lede">{`${name(imp[0].feature)} and ${name(imp[1].feature)} carry more than half of the decisions in both tree models. The two operating settings are almost unused, which fits a dataset with a single operating condition.`}</p>} />
      <div className="panel panel-pad">
        <div className="panel-h"><h3>Share of decisions by input</h3><span className="text-[.875rem] text-ink2">Random Forest and XGBoost, rolling averages folded into their sensor</span></div>
        <Key items={["Random Forest", "XGBoost"].map((m) => [MODEL_VAR[m], m, true])} />
        <ChartCanvas build={build} height={560} label="Bar chart of feature importance by input for Random Forest and XGBoost" />
        <p className="chart-note">Importance shows what a model uses, not what physically causes failure. Sensors that move together share credit, so a low bar does not always mean a sensor is useless.</p>
      </div>
    </>
  );
}

export default function Models() {
  const { data, error, reload } = useAsync(() => Promise.all([api("/api/results"), config()]), []);
  const head = <PageHead title="Model lab">How the three models were prepared, compared and tuned, using only the training engines, before the test set was opened.</PageHead>;
  if (error) return <>{head}<Section tight><StateBox kind="error" title="The results could not be loaded" body={error.message} onRetry={reload} /></Section></>;
  if (!data) return (
    <>{head}
      <Section tight><div role="status" aria-label="Loading" className="grid gap-6 md:grid-cols-2"><Skeleton className="h-60" /><Skeleton className="h-60" /></div></Section>
      <Section alt><ChartSkeleton height={300} /></Section>
    </>
  );
  const [r, cfg] = data, c = r.config, rf = c.random_forest, xg = c.xgboost;
  const test = Object.fromEntries(r.test.map((t) => [t.model, t])), val = r.validation_rmse;
  const bestVal = MODELS.reduce((a, b) => (val[a] < val[b] ? a : b)), bestTest = r.best_model;
  const tune = (name) => r.tuning.filter((x) => x.model === name).sort((a, b) => a.cv_RMSE - b.cv_RMSE).map((x) => [x.params.replace(/,/g, ", ").replace(/=/g, " "), n(x.cv_RMSE, 2)]);
  const steps = [
    ["Prepare the data", "Eight columns that never change were dropped. Sensors were scaled using the training data only. Each sensor gets a 3-cycle rolling average, and the cycle number is an input."],
    ["Cap the training target", `Remaining life above ${c.cap} cycles is set to ${c.cap} for training. The test is still scored against the actual values.`],
    ["Compare baselines", "All three models were trained with default settings and checked with 5-fold cross-validation, always holding out whole engines."],
    ["Change one thing at a time", "Cap value, rolling window and the cycle number were each tested on their own against the starting point."],
    ["Tune the tree models", "Random Forest and XGBoost tried several depths and learning settings. The best validation score for each was kept."],
    ["Open the test set once", "The chosen setup was retrained on all 100 training engines and scored on the 100 test engines. No choice was changed afterwards."],
  ];
  return (
    <>
      {head}
      <Section tight label="vt">
        <h2 id="vt" className="t-h2">Validation and test are different exams</h2>
        <p className="t-lede mb-8 mt-3.5">Validation scores guided every choice and come from training engines held out during cross-validation. The test score comes from 100 engines the models never saw, and was run once at the end.</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="panel panel-pad min-w-0"><div className="panel-h"><h3>Validation</h3><span className="text-[.875rem] text-ink2">5-fold cross-validation, training engines held out</span></div>
            <DataTable cols={["Model", "RMSE (cycles)"]} rows={MODELS.map((m) => [m, n(val[m], 2)])} hl={MODELS.indexOf(bestVal)} />
            <p className="chart-note">Scored against remaining life capped at {r.cap}. Used to choose settings. Lower is better.</p></div>
          <div className="panel panel-pad min-w-0 !border-ink3"><div className="panel-h"><h3>Official test</h3><span className="text-[.875rem] text-ink2">100 unseen engines, actual remaining life</span></div>
            <DataTable cols={["Model", "RMSE", "MAE", "R²"]} rows={MODELS.map((m) => [m, n(test[m].test_RMSE, 2), n(test[m].test_MAE, 2), n(test[m].test_R2, 3)])} hl={MODELS.indexOf(bestTest)} />
            <p className="chart-note">Run once, on each engine's last recorded cycle. {bestTest} has the lowest error. Test error is higher than validation error, as expected.</p></div>
        </div>
      </Section>

      <Section alt label="wf">
        <h2 id="wf" className="t-h2">The workflow</h2>
        <ol className="steps mt-9 max-w-[900px]">{steps.map(([h, p]) => <li key={h}><div><h3>{h}</h3><p>{p}</p></div></li>)}</ol>
      </Section>

      <Section label="mp">
        <h2 id="mp" className="t-h2">The three models</h2>
        <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Profile m="Linear Regression" test={test} best={bestTest} what="A single weighted sum of the inputs." why="The baseline. It cannot bend, so it struggles when remaining life drops quickly near failure." params="No tuning settings." />
          <Profile m="Random Forest" test={test} best={bestTest} what="Many decision trees, each trained on a random sample, with their answers averaged." why="Handles curved relationships and is steady across folds. Best test score."
            params={<>trees {rf.n_estimators}<br />max depth {rf.max_depth}<br />min samples per leaf {rf.min_samples_leaf}<br />max features {rf.max_features}</>} />
          <Profile m="XGBoost" test={test} best={bestTest} what="Trees built one after another, each correcting the last one's errors." why="Close to Random Forest. Shallow trees and a low learning rate worked best."
            params={<>trees {xg.n_estimators}<br />max depth {xg.max_depth}<br />learning rate {xg.learning_rate}<br />subsample {xg.subsample}, columns {xg.colsample_bytree}<br />min child weight {xg.min_child_weight}</>} />
        </div>
      </Section>

      <Section alt label="ex">
        <Split className="mb-9" a={<h2 id="ex" className="t-h2">What changed the validation error</h2>}
          b={<p className="t-lede">Each experiment changes one thing from the starting point. Lower is better. Adding the cycle number made the largest difference. The window sizes tested did not help, and a cap near 125 worked best.</p>} />
        <Experiments r={r} />
      </Section>

      <Section label="tn">
        <Split className="mb-9" a={<h2 id="tn" className="t-h2">Tuning</h2>}
          b={<p className="t-lede">With the features fixed, Random Forest and XGBoost each tried several settings. Linear Regression has none to tune. The best row for each is highlighted and is the one used in the final models.</p>} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="min-w-0"><h3 className="t-h3 mb-3.5">Random Forest</h3><div className="tbl-wrap"><DataTable cols={["Settings", "CV RMSE"]} rows={tune("Random Forest")} hl={0} /></div></div>
          <div className="min-w-0"><h3 className="t-h3 mb-3.5">XGBoost</h3><div className="tbl-wrap"><DataTable cols={["Settings", "CV RMSE"]} rows={tune("XGBoost")} hl={0} /></div></div>
        </div>
      </Section>

      <Section alt label="fi"><Importance r={r} cfg={cfg} /></Section>
    </>
  );
}
