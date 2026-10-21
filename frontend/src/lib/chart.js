import { Chart, BarController, BarElement, LineController, LineElement, PointElement, ScatterController, LinearScale, CategoryScale, Tooltip, Legend } from "chart.js";
import { MODELS, MODEL_TOKEN, SHAPE } from "./constants";
import { n } from "./format";

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, ScatterController, LinearScale, CategoryScale, Tooltip, Legend);
export { Chart };

export const modelColor = (t, m) => t[MODEL_TOKEN[m]];

/* global defaults for the current theme. Called before each chart is built. */
export function applyDefaults(t) {
  const C = Chart.defaults;
  C.font.family = '"IBM Plex Sans",system-ui,sans-serif';
  C.font.size = 12;
  C.color = t.ink2;
  C.borderColor = t.soft;
  C.maintainAspectRatio = false;
  C.animation = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? false : { duration: 350 };
  C.plugins.legend.display = false;
  Object.assign(C.plugins.tooltip, { backgroundColor: t.panel2, borderColor: t.line, borderWidth: 1, titleColor: t.ink, bodyColor: t.ink, padding: 10, cornerRadius: 2, displayColors: true, boxPadding: 4 });
  C.elements.line.borderWidth = 2;
  C.elements.point.radius = 0;
  C.elements.point.hoverRadius = 5;
  C.datasets.line.tension = 0;
}

export const axis = (t, title, extra = {}) => ({
  title: title ? { display: true, text: title, color: t.ink2 } : { display: false },
  grid: { color: t.soft }, border: { color: t.line }, ticks: { color: t.ink3 }, ...extra,
});

/* value labels at the end of bars */
export const valueLabels = (t, fmt = (v) => v, horizontal = false) => ({
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart; ctx.save(); ctx.font = '500 12px "IBM Plex Mono",monospace'; ctx.fillStyle = t.ink;
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di); if (meta.hidden) return;
      meta.data.forEach((el, i) => {
        const v = ds.data[i]; if (v == null) return;
        if (horizontal) { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(fmt(v), el.x + 8, el.y); }
        else { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(fmt(v), el.x, el.y - 6); }
      });
    });
    ctx.restore();
  },
});

/* dot plot: categories on x, one marker per model; marker shapes back up the colours */
export const dotPlotConfig = (t, labels, byModel, yTitle, opts = {}) => ({
  type: "line",
  data: { labels, datasets: MODELS.map((m) => ({ label: m, data: byModel[m], showLine: false, pointStyle: SHAPE[m], pointRadius: 7, pointHoverRadius: 9, borderColor: modelColor(t, m), backgroundColor: modelColor(t, m) })) },
  options: {
    interaction: { mode: "index", intersect: false },
    scales: { x: axis(t, null, { ticks: { color: t.ink, maxRotation: 0, autoSkip: false } }), y: axis(t, yTitle, { ...(opts.y || {}) }) },
    plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${n(c.parsed.y, 2)}` } } },
  },
});

/* wrap a long label into lines for chart axes */
export const wrap = (text, len = 14) => {
  const w = String(text).split(" "), out = []; let cur = "";
  w.forEach((x) => { if ((cur + " " + x).trim().length > len) { out.push(cur); cur = x; } else cur = (cur + " " + x).trim(); });
  out.push(cur); return out;
};

/* "#rrggbb" + alpha -> rgba(), because canvas charts cannot take CSS colour functions everywhere */
export const alpha = (hex, a) => {
  const h = hex.replace("#", ""), v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`;
};
