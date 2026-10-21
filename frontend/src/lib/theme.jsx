import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext({ theme: "dark", toggle: () => {} });
export const useTheme = () => useContext(Ctx);

const read = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read);
  const apply = useCallback((t) => {
    document.documentElement.setAttribute("data-theme", t);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "light" ? "#f6f4ee" : "#090d16");
    try { localStorage.setItem("aero-theme", t); } catch (_) { /* private mode: the choice just is not remembered */ }
    setTheme(t);
  }, []);
  const toggle = useCallback(() => apply(read() === "light" ? "dark" : "light"), [apply]);
  useEffect(() => { setTheme(read()); }, []);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* the live colour values of the current theme, for canvas charts that cannot read CSS variables */
export function tokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (k) => cs.getPropertyValue(k).trim();
  return {
    page: g("--page"), panel: g("--panel"), panel2: g("--panel2"), line: g("--line"), soft: g("--soft"),
    ink: g("--ink"), ink2: g("--ink2"), ink3: g("--ink3"), link: g("--link"), cyan: g("--cyan"),
    healthy: g("--healthy"), warning: g("--warning"), critical: g("--critical"),
    mLR: g("--m-lr"), mRF: g("--m-rf"), mXGB: g("--m-xgb"), data1: g("--data1"), data2: g("--data2"),
    heatNeg: g("--heat-neg"), heatMid: g("--heat-mid"), heatPos: g("--heat-pos"), heatStrong: g("--heat-strong"),
  };
}
