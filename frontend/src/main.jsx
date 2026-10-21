import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { ThemeProvider } from "./lib/theme";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import { Loading } from "./components/ui";

/* every page except Home is its own chunk, so the first load stays small */
const Predict = lazy(() => import("./pages/Predict"));
const Dataset = lazy(() => import("./pages/Dataset"));
const Models = lazy(() => import("./pages/Models"));
const Results = lazy(() => import("./pages/Results"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

const fallback = <div className="wrap py-24"><Loading title="Loading the page" /></div>;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={fallback}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="predict" element={<Predict />} />
              <Route path="dataset" element={<Dataset />} />
              <Route path="models" element={<Models />} />
              <Route path="results" element={<Results />} />
              <Route path="about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);

// remove the first-paint splash once React has drawn
requestAnimationFrame(() => {
  const s = document.getElementById("splash");
  if (s) { s.classList.add("done"); setTimeout(() => s.remove(), 400); }
});
