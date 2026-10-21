import { useEffect, useRef } from "react";
import { Chart, applyDefaults } from "../lib/chart";
import { tokens, useTheme } from "../lib/theme";

/* Builds a Chart.js chart from build(tokens). Rebuilds when the theme or the build function changes.
   Callers pass a memoised build function. */
export default function ChartCanvas({ build, height = 340, label, className = "" }) {
  const ref = useRef(null);
  const { theme } = useTheme();
  useEffect(() => {
    const t = tokens();
    applyDefaults(t);
    const chart = new Chart(ref.current, build(t));
    return () => chart.destroy();
  }, [build, theme]);
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  );
}
