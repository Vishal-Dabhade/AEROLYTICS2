import { Link } from "react-router-dom";
import { PageHead, Section, Split } from "../components/ui";

const TOC = [["problem", "The problem"], ["data", "The dataset"], ["prep", "Data preparation"], ["cap", "The capped target"], ["cv", "Validation by engine"], ["final", "Model selection and final test"], ["limits", "Limitations"]];
const H3 = ({ id, children, first }) => <h3 id={id} className={`t-h3 scroll-mt-24 ${first ? "!mt-0" : ""}`}>{children}</h3>;

export default function About() {
  return (
    <>
      <PageHead title="About and method">What problem this solves, what data it uses, how the models were built, and where the estimates stop being trustworthy.</PageHead>
      <Section tight>
        <Split
          a={<nav aria-label="On this page" className="lg:sticky lg:top-[92px]"><ul className="finds !max-w-none">{TOC.map(([id, t]) => <li key={id}><a className="link" href={`#${id}`}>{t}</a></li>)}</ul></nav>}
          b={<div className="prose">
            <H3 id="problem" first>The problem</H3>
            <p>An engine's remaining useful life (RUL) is how many more flight cycles it can run before it fails or must be taken out of service. If maintenance happens too early, useful life is thrown away. If it happens too late, a fault can become a failure. Predictive maintenance tries to estimate RUL from the sensor data an engine already produces, so that work can be scheduled at the right time.</p>
            <p>This project predicts RUL from one reading or from a history of readings, using three standard models: Linear Regression, Random Forest and XGBoost.</p>
            <H3 id="data">The dataset</H3>
            <p>The data is NASA's C-MAPSS turbofan degradation simulation, subset <strong>FD001</strong>. It has <strong>100 training engines</strong> recorded from a healthy state until they fail (20,631 rows), and <strong>100 test engines</strong> whose records stop before failure (13,096 rows). A separate file gives the true remaining life of each test engine at its last recorded cycle.</p>
            <p>Each row is one flight cycle of one engine, with three operating settings and 21 sensor readings. FD001 has a single operating condition and a single fault type, which makes it the simplest of the four C-MAPSS subsets. <Link className="link" to="/dataset">Explore it in the dataset explorer.</Link></p>
            <H3 id="prep">Data preparation</H3>
            <p>Eight columns never change in FD001 (setting_3 and sensors 1, 5, 6, 10, 16, 18 and 19), so they carry no information and were dropped. That leaves two settings and 14 sensors. Each sensor also gets a rolling average of its last three cycles, which smooths random noise and gives a single row a little memory. The cycle number is also an input. All inputs were scaled using the training data only.</p>
            <H3 id="cap">The capped target</H3>
            <p>While an engine is healthy, its sensors look almost the same whether it has 300 cycles left or 150. Asking the models to separate those cases only teaches them noise. So for <strong>training</strong>, remaining life above 125 cycles is set to 125. The <strong>test scores are always computed against the actual remaining life</strong>, never the capped value. The cost is that predictions never exceed 125, which the app shows as 125+.</p>
            <H3 id="cv">Validation by engine</H3>
            <p>Neighbouring cycles of one engine look almost identical. If they were split randomly between training and validation, the models would be tested on near copies of what they trained on and look better than they are. So cross-validation uses five folds that hold out <strong>whole engines</strong>. Every design choice, including the cap, the rolling window, the cycle number and the tuning settings, was decided with these validation scores.</p>
            <H3 id="final">Model selection and final test</H3>
            <p>After the choices were fixed, the three models were retrained on all 100 training engines and scored once on the 100 test engines, using each engine's last recorded cycle and its actual remaining life. Random Forest had the lowest error, with XGBoost close behind and Linear Regression clearly behind. <Link className="link" to="/results">See the full results</Link> and <Link className="link" to="/models">how the models were built</Link>.</p>
            <H3 id="limits">Limitations</H3>
            <p><strong>The data is simulated.</strong> Real engines have different noise, missing data, many operating conditions and several ways of failing. FD001 covers one condition and one fault, so these models should not be expected to carry over to other cases without retraining.</p>
            <p><strong>The estimates are rough.</strong> On unseen test engines the best model is off by about 14 cycles on average and by 19 in RMSE terms, and a few engines are off by more than 40. Treat each prediction as a range, not a date.</p>
            <p><strong>The cycle number is an input.</strong> It improved validation error, but it means the models partly use an engine's age, not only its condition.</p>
            <p><strong>Single readings are approximate.</strong> The models were built around a three-cycle rolling average. A single manual entry uses its own value as that average, so it can differ a little from the exact calculation. Upload three or more cycles for the exact result.</p>
            <p><strong>Edited readings are not forecasts.</strong> The sliders can combine values that no real engine would produce. Those results show how the model reacts to numbers, not what an engine will do.</p>
            <p><strong>Small test set.</strong> One hundred engines is enough to rank the models, but small differences between Random Forest and XGBoost should not be over-read.</p>
            <p>This is a study of the method. It is not a certified maintenance tool and should not be used to make safety decisions.</p>
          </div>} />
      </Section>
    </>
  );
}
