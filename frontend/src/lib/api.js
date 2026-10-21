import { useCallback, useEffect, useRef, useState } from "react";

/* ---- tiny store counting in-flight requests; the top loading bar listens to it ---- */
let pending = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f(pending));
export const subscribePending = (f) => { subs.add(f); f(pending); return () => subs.delete(f); };

export async function api(path, opts) {
  pending++; emit();
  try {
    let res;
    try { res = await fetch(path, opts); }
    catch (e) { throw new Error("Cannot reach the server. Check that the app is running, then try again."); }
    if (!res.ok) {
      let msg = `The server returned an error (${res.status}).`;
      try {
        const d = await res.json();
        if (typeof d.detail === "string") msg = d.detail;
        else if (Array.isArray(d.detail) && d.detail[0]) msg = d.detail.map((x) => x.msg).join(" ");
      } catch (_) { /* keep the generic message */ }
      throw new Error(msg);
    }
    return await res.json();
  } finally { pending--; emit(); }
}

let cfgP;
export const config = () => (cfgP = cfgP || api("/api/config").catch((e) => { cfgP = null; throw e; }));

/* run an async function when deps change. Keeps the previous data while the next request loads. */
export function useAsync(fn, deps) {
  const [s, set] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn); fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    set((p) => ({ ...p, loading: true, error: null }));
    Promise.resolve().then(() => fnRef.current()).then(
      (d) => alive && set({ loading: false, data: d, error: null }),
      (e) => alive && set({ loading: false, data: null, error: e }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...s, reload };
}

export const useGet = (path) => useAsync(() => api(path), [path]);
