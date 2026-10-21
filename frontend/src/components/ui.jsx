import { useEffect, useRef, useState } from "react";
import { GLYPH, MODELS, MODEL_VAR, STATUS_LABEL } from "../lib/constants";

/* ---------- loading placeholders ---------- */
export const Skeleton = ({ className = "", style, onPage }) => (
  <div className={`skeleton ${onPage ? "on-page" : ""} ${className}`} style={style} aria-hidden="true" />
);
export const ChartSkeleton = ({ height = 340 }) => (
  <div role="status" aria-label="Loading chart" style={{ height }} className="relative">
    <Skeleton className="absolute inset-0" />
    <span className="absolute inset-0 grid place-items-center text-[.85rem] text-ink3">Loading chart…</span>
  </div>
);
export const TableSkeleton = ({ rows = 6 }) => (
  <div role="status" aria-label="Loading table" className="grid gap-2 p-1">
    {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9" />)}
  </div>
);

/* ---------- image with a shimmer until it has loaded ---------- */
export function LazyImage({ src, alt, className = "", imgClassName = "", style }) {
  const [state, setState] = useState("loading");
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el && el.complete && el.naturalWidth) setState("loaded"); }, [src]);
  return (
    <div className={`overflow-hidden ${/\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative"} ${className}`} style={style}>
      {state === "loading" && <Skeleton className="absolute inset-0 !rounded-none" />}
      {state === "error" ? (
        <div className="absolute inset-0 grid place-items-center text-[.85rem] text-ink3" role="img" aria-label={alt}>Image unavailable</div>
      ) : (
        <img
          ref={ref} src={src} alt={alt} loading="lazy" decoding="async"
          onLoad={() => setState("loaded")} onError={() => setState("error")}
          className={`h-full w-full object-cover transition-opacity duration-500 ${state === "loaded" ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        />
      )}
    </div>
  );
}

/* ---------- empty and error states ---------- */
export function StateBox({ kind = "empty", title, body, onRetry }) {
  const err = kind === "error";
  return (
    <div role={err ? "alert" : "status"} className={`rounded-[3px] border border-dashed px-6 py-10 text-center text-ink2 ${err ? "border-critical text-ink" : "border-line"}`}>
      <strong className="mb-1.5 block font-body text-[1.05rem] font-semibold text-ink">{title}</strong>
      {body}
      {onRetry && <div className="mt-3.5"><button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button></div>}
    </div>
  );
}
export const Loading = ({ title = "Loading", body = "One moment." }) => (
  <div role="status" className="grid gap-3 rounded-[3px] border border-dashed border-line px-6 py-10 text-center text-ink2">
    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-link" aria-hidden="true" />
    <div><strong className="block font-semibold text-ink">{title}</strong>{body}</div>
  </div>
);

/* ---------- status icon and badge ---------- */
export function StatusIcon({ status }) {
  const p = { viewBox: "0 0 16 16", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (status === "healthy") return <svg {...p}><circle cx="8" cy="8" r="6.5" /><path d="M5 8.2l2.1 2.1L11 6.2" /></svg>;
  if (status === "warning") return <svg {...p}><path d="M8 1.8L15 14H1z" strokeLinejoin="round" /><path d="M8 6.5v3.4M8 11.8v.4" /></svg>;
  return <svg {...p}><path d="M5 1.5h6L14.5 5v6L11 14.5H5L1.5 11V5z" strokeLinejoin="round" /><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" /></svg>;
}
export const Badge = ({ status }) => <span className={`badge st-${status}`}><StatusIcon status={status} />{STATUS_LABEL[status]}</span>;

/* ---------- chart keys ---------- */
export const Key = ({ items }) => (
  <div className="key">{items.map(([c, t, sq]) => <span key={t}><i className={sq ? "sq" : ""} style={{ background: c }} />{t}</span>)}</div>
);
export const ModelKey = () => (
  <div className="key">{MODELS.map((m) => <span key={m}><b style={{ color: MODEL_VAR[m], fontSize: ".95rem", lineHeight: 1 }}>{GLYPH[m]}</b>{m}</span>)}</div>
);

/* ---------- simple text table ---------- */
export function DataTable({ cols, rows, hl }) {
  return (
    <div className="tbl-text">
      <table>
        <thead><tr>{cols.map((c, i) => <th key={i} scope="col" className={i ? "n" : ""}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri} className={ri === hl ? "hl" : ""}>{r.map((v, i) => <td key={i} className={i ? "n" : ""}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ---------- small layout helpers ---------- */
export const Section = ({ children, className = "", tight, alt, id, label }) => (
  <section id={id} aria-labelledby={label} className={`relative ${tight ? "py-[clamp(40px,6vw,72px)]" : "py-[clamp(64px,9vw,128px)]"} ${alt ? "alt-bg bg-navy" : ""} ${className}`}>
    <div className="wrap">{children}</div>
  </section>
);
export const PageHead = ({ title, children }) => (
  <header className="grid-bg relative overflow-hidden border-b border-soft bg-page [padding-block:clamp(48px,7vw,96px)_clamp(28px,4vw,48px)]">
    <div className="wrap">
      <h1 className="t-display !text-[clamp(2.4rem,5vw,4.6rem)]">{title}</h1>
      <p className="t-lede mt-[18px]">{children}</p>
    </div>
  </header>
);
/* 12-column split used for a heading on the left and text on the right */
export const Split = ({ a, b, rev, className = "" }) => (
  <div className={`grid grid-cols-1 gap-[clamp(24px,5vw,72px)] lg:grid-cols-12 ${className}`}>
    <div className={`min-w-0 lg:col-span-5 ${rev ? "lg:order-2 lg:col-start-8" : ""}`}>{a}</div>
    <div className={`min-w-0 lg:col-span-7 ${rev ? "lg:order-1" : ""}`}>{b}</div>
  </div>
);
export const Stats = ({ items, padded }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 ${padded ? "border border-line bg-panel" : ""}`}>
    {items.map(([v, l], i) => (
      <div key={l} className={`border-soft py-[22px] pr-6 max-md:odd:border-r md:border-r md:last:border-r-0 max-md:[&:nth-child(n+3)]:border-t ${padded ? "pl-6" : i % 2 === 0 ? "pl-0" : "pl-6"} ${!padded ? "md:pl-6 md:first:pl-0" : ""}`}>
        <span className="block font-display text-[clamp(1.6rem,3vw,2.5rem)] font-bold leading-none [font-stretch:112%] tracking-[-.01em]">{v}</span>
        <span className="mt-1.5 block text-[.85rem] text-ink3">{l}</span>
      </div>
    ))}
  </div>
);
