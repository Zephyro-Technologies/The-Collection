import { useState } from "react";
import { Wordmark } from "../brand/Wordmark";
import { Button } from "../ui/button";
import { signIn } from "@collection/shared";

// Real Supabase email + password sign-in. On success, the app-level auth
// listener swaps to the dashboard — this component just authenticates and
// surfaces errors. Accounts are created manually by The Collection in Supabase.
export function SignIn() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pass) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), pass);
      // success → onAuthStateChange in App renders the dashboard (this unmounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-noir text-cream flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <Wordmark variant="light" size="lg" />
            <div className="mt-8 h-px w-8 bg-accent-on-dark" />
            <p className="editorial-italic mt-6 text-center text-cream/80" style={{ fontSize: "1rem" }}>
              Acquired, never simply bought.
            </p>
          </div>

          <label className="block">
            <span className="eyebrow" style={{ color: "rgba(255,255,255,0.55)" }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1.5 w-full bg-white/5 border border-white/15 focus:border-accent-on-dark rounded-md px-3 py-2.5 outline-none text-cream placeholder:text-cream/30"
              style={{ fontSize: "0.9rem" }}
              placeholder="you@thecollection.pk"
            />
          </label>

          <label className="block mt-4">
            <span className="eyebrow" style={{ color: "rgba(255,255,255,0.55)" }}>Password</span>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full bg-white/5 border border-white/15 focus:border-accent-on-dark rounded-md px-3 py-2.5 outline-none text-cream placeholder:text-cream/30"
              style={{ fontSize: "0.9rem" }}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mt-4 text-center" style={{ fontSize: "0.8rem", color: "var(--signal-red)" }} role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 bg-cream text-noir hover:bg-white disabled:opacity-60"
            style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.8rem" }}
          >
            {submitting ? "Signing in…" : "Enter"}
          </Button>

          <p className="text-center text-cream/40 mt-6" style={{ fontSize: "0.72rem" }}>
            By appointment · Single owner access.
          </p>
        </form>
      </div>

      <div className="pb-8 text-center">
        <div className="eyebrow" style={{ color: "rgba(255,255,255,0.4)" }}>
          High-Value Motorcars · Islamabad
        </div>
      </div>
    </div>
  );
}
