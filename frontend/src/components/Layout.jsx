import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { subscribePending } from "../lib/api";
import { useTheme } from "../lib/theme";

export function Mark({ className = "h-[26px] w-[26px]" }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={`flex-none ${className}`}>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d="M16 15 C14.2 11 14.4 7 16 3.6 C17.8 7 17.8 11 17 15Z" transform={`rotate(${i * 45} 16 16)`} fill="var(--link)" />)}
      <circle cx="16" cy="16" r="3" fill="var(--page)" />
    </svg>
  );
}
const Brand = () => (
  <Link to="/" aria-label="AEROLYTICS home" className="flex items-center gap-2.5 font-display text-[1.05rem] font-extrabold tracking-[.02em] no-underline [font-stretch:125%]">
    <Mark /><span>AEROLYTICS</span>
  </Link>
);

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const light = theme === "light";
  return (
    <button type="button" onClick={toggle} aria-label={light ? "Switch to dark theme" : "Switch to light theme"} title={light ? "Switch to dark theme" : "Switch to light theme"}
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[2px] border border-line bg-transparent text-ink transition-colors hover:border-ink3">
      {light ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M16.5 11.6A7 7 0 118.4 3.5a5.6 5.6 0 008.1 8.1z" strokeLinejoin="round" /></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="3.6" /><path d="M10 1.8v2.2M10 16v2.2M1.8 10H4M16 10h2.2M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6" strokeLinecap="round" /></svg>
      )}
    </button>
  );
}

/* thin bar across the top while the app waits on the server for more than a moment */
function TopBar() {
  const [show, setShow] = useState(false);
  const timer = useRef();
  useEffect(() => subscribePending((n) => {
    clearTimeout(timer.current);
    if (n > 0) timer.current = setTimeout(() => setShow(true), 220);
    else setShow(false);
  }), []);
  return (
    <div className={`pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px] overflow-hidden transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`} role="progressbar" aria-hidden={!show} aria-label="Loading">
      <div className="topbar-run h-full w-full bg-lime" />
    </div>
  );
}

const NAV = [["/", "Home"], ["/dataset", "Dataset"], ["/models", "Models"], ["/results", "Results"]];

function Nav() {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && open) { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [open]);
  const link = "block py-3.5 md:py-2.5 md:px-3.5 border-b border-soft md:border-b-2 md:border-transparent text-ink2 font-medium text-[.95rem] no-underline transition-colors hover:text-ink aria-[current=page]:text-ink md:aria-[current=page]:border-link";
  return (
    <header className="sticky top-0 z-50 border-b border-soft bg-nav backdrop-blur-md">
      <div className="wrap relative flex h-[68px] items-center gap-3 md:gap-8">
        <Brand />
        <div className="ml-auto flex items-center gap-2 md:order-3 md:ml-0">
          <ThemeToggle />
          <button ref={btn} type="button" aria-expanded={open} aria-controls="menu" aria-label="Menu" onClick={() => setOpen((o) => !o)}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[2px] border border-line bg-transparent text-ink md:hidden">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" stroke="currentColor" strokeWidth="1.8"><path d="M2 5h16M2 10h16M2 15h16" /></svg>
          </button>
        </div>
        <ul id="menu" className={`m-0 list-none flex-col items-stretch bg-page px-[var(--g)] pb-5 pt-2 max-md:absolute max-md:inset-x-0 max-md:top-[68px] max-md:border-b max-md:border-line md:order-2 md:ml-auto md:flex md:flex-row md:items-center md:gap-1 md:bg-transparent md:p-0 ${open ? "flex" : "hidden md:flex"}`} style={{ "--g": "clamp(16px,4vw,48px)" }}>
          {NAV.map(([h, t]) => <li key={h}><NavLink to={h} end={h === "/"} className={link}>{t}</NavLink></li>)}
          <li><NavLink to="/predict" className="mt-3.5 block rounded-[2px] bg-lime px-[18px] py-2.5 text-center text-[.95rem] font-semibold text-on-lime no-underline shadow-[inset_0_0_0_1px_var(--lime-edge)] hover:bg-lime-hover aria-[current=page]:outline-2 aria-[current=page]:outline-offset-2 aria-[current=page]:outline-ink aria-[current=page]:outline md:ml-3 md:mt-0">Run a prediction</NavLink></li>
        </ul>
      </div>
    </header>
  );
}

function Footer() {
  const col = "grid list-none gap-2 p-0 m-0 [&_a]:text-ink2 [&_a]:no-underline [&_a:hover]:text-ink [&_a:hover]:underline";
  return (
    <footer className="mt-0 border-t border-line bg-page pb-9 pt-12">
      <div className="wrap">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr_1fr]">
          <div className="min-w-0"><Brand /><p className="mt-3.5 max-w-[42ch] text-[.875rem] text-ink2">Remaining useful life prediction for turbofan engines, built on the NASA C-MAPSS FD001 dataset.</p></div>
          <div className="min-w-0"><h4 className="mb-3 font-body text-[.9rem] font-semibold tracking-normal text-ink2">Explore</h4><ul className={col}><li><Link to="/dataset">Dataset explorer</Link></li><li><Link to="/models">Model lab</Link></li><li><Link to="/results">Results</Link></li><li><Link to="/predict">Prediction lab</Link></li></ul></div>
          <div className="min-w-0"><h4 className="mb-3 font-body text-[.9rem] font-semibold tracking-normal text-ink2">Project</h4><ul className={col}><li><Link to="/about">About and method</Link></li><li><a href="/api/docs">API reference</a></li></ul></div>
        </div>
        <p className="mb-0 mt-9 max-w-[80ch] border-t border-soft pt-5 text-[.85rem] text-ink3">The data is simulated. Predictions are estimates of remaining cycles and do not guarantee when an engine will fail. This project is a study of the method and is not a certified maintenance tool.</p>
      </div>
    </footer>
  );
}

/* scroll to the top on a new page, or to the #hash target when there is one */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) { const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 120); return () => clearTimeout(t); }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles = { "/": "AEROLYTICS - Know the engine before it fails", "/predict": "Prediction lab - AEROLYTICS", "/dataset": "Dataset explorer - AEROLYTICS", "/models": "Model lab - AEROLYTICS", "/results": "Results - AEROLYTICS", "/about": "About and method - AEROLYTICS" };
    document.title = titles[pathname.replace(/\/$/, "") || "/"] || "Page not found - AEROLYTICS";
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a className="skip" href="#main">Skip to content</a>
      <TopBar />
      <Nav />
      <ScrollManager />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
