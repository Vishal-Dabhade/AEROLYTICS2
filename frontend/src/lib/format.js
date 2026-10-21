export const n = (v, d = 0) => (v == null || Number.isNaN(v) ? "n/a" : Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
export const sg = (v, d = 2) => (v > 0 ? "+" : v < 0 ? "-" : "") + Math.abs(v).toFixed(d);
export const sNum = (id) => parseInt(String(id).split("_")[1], 10);
export const decimals = (step) => (step >= 1 ? 0 : String(step).split(".")[1].length);
