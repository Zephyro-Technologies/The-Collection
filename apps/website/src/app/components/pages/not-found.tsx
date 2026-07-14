import { Link } from "react-router";
import { useDocumentTitle } from "../../hooks/use-document-title";

export function NotFound() {
  useDocumentTitle("Not found · The Collection");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-page)] px-6 text-center">
      <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">404</span>
      <h1
        className="mt-5"
        style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.015em" }}
      >
        This page could not be found
      </h1>
      <p className="mt-4 max-w-md text-[var(--text-body)]" style={{ lineHeight: 1.7 }}>
        The page you were looking for may have moved, or never existed. The collection, however, is
        just here.
      </p>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <Link
          to="/collection"
          className="border border-[var(--text-muted)] px-7 py-3.5 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--surface-page)]"
        >
          View the collection
        </Link>
        <Link
          to="/"
          className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
