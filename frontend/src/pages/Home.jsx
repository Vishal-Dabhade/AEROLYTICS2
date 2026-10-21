import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, config, useAsync } from "../lib/api";
import { MODELS } from "../lib/constants";
import { n } from "../lib/format";
import { axis, modelColor, valueLabels } from "../lib/chart";
import ChartCanvas from "../components/ChartCanvas";
import EngineSection from "../components/EngineSection";
import HeroEngine from "../components/HeroEngine";
import PredBars from "../components/PredBars";
import { ChartSkeleton, LazyImage, Section, Skeleton, StateBox, Stats } from "../components/ui";

/* Optional hero photograph. Drop a file named hero.jpg, hero.png or hero.webp into frontend/src/assets and rebuild:
   it replaces the illustrated fan, keeps the 125-tick ring, and shows a loading shimmer until it has loaded. */
const photos = import.meta.glob("../assets/hero.{jpg,jpeg,png,webp}", { eager: true, query: "?url", import: "default" });
const HERO_PHOTO = Object.values(photos)[0];

function Chapter({ num, title, lede, children, first }) {
  return (
    <article className={`grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:gap-14 ${first ? "pb-[clamp(48px,7vw,96px)]" : "border-t border-line py-[clamp(48px,7vw,96px)]"}`}>
      <div><div className="chapter-n" aria-hidden="true">{num}</div></div>
      <div className="min-w-0">
        <h2 className="t-h2">{title}</h2>
        <p className="t-lede mt-[18px]">{lede}</p>
        {children}
      </div>
    </article>
  );
}

function TestErrorChart({ rows }) {
  const build = useCallback((t) => ({
    type: "bar",
    data: { labels: rows.map((x) => x.model), datasets: [{ data: rows.map((x) => x.test_RMSE), backgroundColor: rows.map((x) => modelColor(t, x.model)), borderRadius: 2, barThickness: 26 }] },
    options: { indexAxis: "y", layout: { padding: { right: 48 } }, scales: { x: axis(t, "RMSE (cycles)", { beginAtZero: true }), y: { grid: { display: false }, border: { color: t.line }, ticks: { color: t.ink, font: { size: 13 } } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${n(c.parsed.x, 2)} cycles` } } } },
    plugins: [valueLabels(t, (v) => n(v, 2), true)],
  }), [rows]);
  return <ChartCanvas build={build} height={260} label="Bar chart of test RMSE for the three models" />;
}

function Demo() {
  const { data, error, reload } = useAsync(async () => {
    const [cfg, ex] = await Promise.all([config(), api("/api/examples")]);
    const e = ex.find((x) => x.id === "critical") || ex[0];
    const r = await api("/api/predict", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inputs: e.inputs }) });
    return { cfg, e, r };
  }, []);
  if (error) return <StateBox kind="error" title="The prediction service did not respond" body={error.message} onRetry={reload} />;
  if (!data) return <Skeleton className="h-[150px]" />;
  return (
    <div aria-live="polite">
      <div className="panel-h"><h3>Test engine {data.e.unit}, last recorded cycle</h3><span className="text-[.875rem] text-ink2">True remaining life: <strong className="num text-ink">{data.e.true_rul}</strong> cycles</span></div>
      <PredBars preds={data.r.predictions} cfg={data.cfg} />
      <p className="chart-note">The three models disagree by a few cycles, which is normal. Treat the range as the estimate.</p>
    </div>
  );
}

export default function Home() {
  const sum = useAsync(() => api("/api/dataset/summary"), []);
  const res = useAsync(() => api("/api/results"), []);
  const cfg = useAsync(() => config(), []);
  const S = sum.data;
  const rows = useMemo(() => (res.data ? [...res.data.test].sort((a, b) => a.test_RMSE - b.test_RMSE) : null), [res.data]);
  const stat = (k, d) => (S ? n(S[k]) : d);

  return (
    <>
      {/* hero */}
      <section className="grid-bg relative flex min-h-[calc(100vh-68px)] flex-col overflow-hidden border-b border-soft bg-page" aria-labelledby="h1">
        <div className="wrap relative flex flex-1 items-center [padding-block:clamp(40px,6vw,88px)]">
          <div className="relative z-[2] max-w-[46rem]">
            <h1 id="h1" className="t-display mb-7 !text-[clamp(2.4rem,11vw,3.4rem)] sm:!text-[clamp(2.8rem,6.2vw,6rem)]">Know the engine before it fails.</h1>
            <p className="t-lede">Every engine wears down a little on every flight. AEROLYTICS reads a turbofan's sensor data and estimates how many flight cycles it has left, so maintenance can be planned before a fault becomes a failure.</p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <Link className="btn btn-ghost" to="/dataset">Explore the data</Link>
              <Link className="btn btn-lime" to="/predict">Run a prediction</Link>
            </div>
            <p className="mt-10 max-w-[44ch] border-l-2 border-link pl-3.5 text-[.85rem] leading-normal text-ink3">The ring around the fan has 125 ticks, one for each cycle of remaining life the models are trained to tell apart.</p>
          </div>
          <div className="pointer-events-none absolute -bottom-[6%] -right-[30%] z-[1] aspect-square w-[130vw] opacity-50 md:bottom-auto md:right-[calc(-1*clamp(80px,14vw,240px))] md:top-1/2 md:w-[min(940px,92vw)] md:-translate-y-1/2 md:opacity-100 max-md:light:hidden">
            <div className="relative h-full w-full">
              <HeroEngine mode={HERO_PHOTO ? "ring" : "full"} />
              {HERO_PHOTO && <LazyImage src={HERO_PHOTO} alt="" className="absolute left-[9.8%] top-[9.8%] h-[80.4%] w-[80.4%] rounded-full" />}
            </div>
          </div>
        </div>
        {/* light theme: eased fade of the dark engine behind the copy. It is a direct child of the section,
            so it spans the full hero width and lines up with the fan at every screen size. */}
        <div aria-hidden="true" className="hero-fade pointer-events-none absolute inset-0 z-[1] hidden light:block max-md:light:hidden" />
        <div className="relative z-[2] border-t border-line bg-bar">
          <div className="wrap">
            <Stats items={[[stat("train_engines", "100"), "training engines, each run to failure"], [stat("test_engines", "100"), "test engines, stopped before failure"], [stat("train_rows", "20,631"), "training rows of sensor readings"], [stat("test_rows", "13,096"), "test rows of sensor readings"]]} />
          </div>
        </div>
      </section>

      <Section label="chapters">
        <Chapter first num="1" title="Understand the engine data" lede={S ? `Each of the ${S.train_engines} training engines is simulated from healthy to failure, lasting between ${S.train_life.min} and ${S.train_life.max} cycles. Fourteen of its 21 sensors change as it wears, and they sit at specific points along the gas path.` : "Each training engine is simulated from healthy to failure. Fourteen of its 21 sensors change as it wears, and they sit at specific points along the gas path."}>
          <Link className="link mt-6 inline-block" to="/dataset">Open the dataset explorer</Link>
        </Chapter>
        <div className="-mt-[clamp(48px,7vw,96px)] mb-[clamp(48px,7vw,96px)]">
          <div className="panel panel-pad mb-3.5 mt-2 overflow-x-auto"><div className="min-w-[980px]">{cfg.data ? <EngineSection meta={cfg.data.sensor_meta.sensors} /> : cfg.error ? <EngineSection /> : <Skeleton className="h-[420px]" />}</div></div>
          <p className="chart-note !mt-0">Each label is a sensor from the dataset. The accent colour marks the three inputs the models rely on most. Select a label to open that sensor in the explorer.</p>
        </div>

        <Chapter num="2" title="Explore the machine-learning models" lede={rows ? `Linear Regression, Random Forest and XGBoost were trained on the same prepared data and scored on 100 engines they had never seen. ${rows[0].model} has the lowest error, ${n(rows[0].test_RMSE, 2)} cycles RMSE.` : "Linear Regression, Random Forest and XGBoost were each trained on the same prepared data and scored on 100 engines they had never seen."}>
          <div className="panel panel-pad mb-5 mt-8">
            <div className="panel-h"><h3>Test error on 100 unseen engines</h3><span className="text-[.875rem] text-ink2">RMSE in cycles, lower is better</span></div>
            {res.error ? <StateBox kind="error" title="The results could not be loaded" body={res.error.message} onRetry={res.reload} /> : rows ? <TestErrorChart rows={rows} /> : <ChartSkeleton height={260} />}
          </div>
          <p className="m-0 flex flex-wrap gap-7"><Link className="link" to="/models">See how the models were built</Link><Link className="link" to="/results">See the full results</Link></p>
        </Chapter>

        <Chapter num="3" title="Predict remaining useful life" lede="Give the models a set of sensor readings and they return an estimate for each, with a health status. This one is a real test engine, run through the live prediction service.">
          <div className="panel panel-pad mb-5 mt-8"><Demo /></div>
          <Link className="link" to="/predict">Open the prediction lab</Link>
        </Chapter>
      </Section>

      <Section alt label="mh">
        <h2 id="mh" className="t-h2 max-w-[20ch]">How the estimate is made honest</h2>
        <ol className="steps cols mt-12">
          <li><div><h3>Prepare the data</h3><p>Eight columns that never change are dropped. The rest are scaled, and each sensor gets a three-cycle rolling average.</p></div></li>
          <li><div><h3>Cap the target at 125</h3><p>While an engine is healthy its sensors barely move, so training only asks the models to tell apart the last 125 cycles of life.</p></div></li>
          <li><div><h3>Validate by engine</h3><p>Cross-validation holds out whole engines, so the models never see part of an engine they are scored on.</p></div></li>
          <li><div><h3>Test once</h3><p>The final score uses 100 unseen engines and their actual remaining life, with the cap applied only to training.</p></div></li>
        </ol>
        <p className="mt-10"><Link className="link" to="/about">Read the full method and its limits</Link></p>
      </Section>

      <section className="relative overflow-hidden border-t border-line bg-navy [padding-block:clamp(72px,10vw,150px)]" aria-label="Run a prediction">
        <div className="wrap grid grid-cols-1 items-end gap-8">
          <h2 className="t-display max-w-[14ch] !text-[clamp(2.2rem,5vw,4.6rem)]">See how much life an engine has left.</h2>
          <div><Link className="btn btn-lime" to="/predict">Run a prediction</Link></div>
        </div>
      </section>
    </>
  );
}