import { MODELS, MODEL_VAR, STATUS_LABEL } from "../lib/constants";
import { n } from "../lib/format";
import { StatusIcon } from "./ui";

/* one bar per model on a shared 0..cap scale, with the critical and warning thresholds marked */
export default function PredBars({ preds, cfg }) {
  const cap = cfg.cap, t = cfg.status_thresholds, pc = (v) => (Math.min(v, cap) / cap) * 100;
  const row = "grid items-center gap-x-3.5 gap-y-1 border-t border-soft py-[13px] first:border-t-0 grid-cols-[1fr_5.5rem] sm:grid-cols-[minmax(7rem,9.5rem)_1fr_minmax(6.5rem,8rem)]";
  return (
    <div>
      {MODELS.map((m) => {
        const p = preds[m]; if (!p) return null;
        const val = p.at_cap ? `${cap}+` : n(p.rul, 1);
        return (
          <div key={m} className={row}>
            <div className="flex items-center gap-[9px] text-[.95rem] font-medium"><i className="inline-block h-2.5 w-2.5 flex-none rounded-[2px]" style={{ background: MODEL_VAR[m] }} />{m}</div>
            <div className="relative order-3 col-span-full h-2.5 rounded-[1px] bg-line sm:order-none sm:col-span-1" role="img" aria-label={`${m}: ${val} cycles, ${STATUS_LABEL[p.status]}`}>
              <div className="fill absolute inset-y-0 left-0 rounded-[1px]" style={{ width: `${pc(p.rul)}%`, background: MODEL_VAR[m] }} />
              <span className="absolute -inset-y-1 w-px bg-ink3 opacity-70" style={{ left: `${pc(t.critical_below)}%` }} />
              <span className="absolute -inset-y-1 w-px bg-ink3 opacity-70" style={{ left: `${pc(t.warning_below)}%` }} />
            </div>
            <div className={`num flex items-center justify-end gap-2 text-[1.05rem] font-medium st-${p.status}`}>{val}<span className="h-[15px] w-[15px]"><StatusIcon status={p.status} /></span></div>
          </div>
        );
      })}
      <div className="mt-1 hidden grid-cols-[minmax(7rem,9.5rem)_1fr_minmax(6.5rem,8rem)] gap-3.5 text-[.78rem] text-ink3 sm:grid" aria-hidden="true">
        <span />
        <span className="relative h-[1.2em]">
          {[[0, "0"], [pc(t.critical_below), t.critical_below], [pc(t.warning_below), t.warning_below], [100, `${cap}+`]].map(([l, v]) => <b key={v} className="num absolute -translate-x-1/2 font-normal" style={{ left: `${l}%` }}>{v}</b>)}
        </span>
        <span />
      </div>
    </div>
  );
}
