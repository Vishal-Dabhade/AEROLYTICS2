import { Link } from "react-router-dom";
import { PageHead, Section } from "../components/ui";

export default function NotFound() {
  return (
    <>
      <PageHead title="Page not found">That address does not match a page in AEROLYTICS.</PageHead>
      <Section tight><div className="flex flex-wrap gap-3.5"><Link className="btn btn-lime" to="/">Go to the home page</Link><Link className="btn btn-ghost" to="/predict">Open the prediction lab</Link></div></Section>
    </>
  );
}
