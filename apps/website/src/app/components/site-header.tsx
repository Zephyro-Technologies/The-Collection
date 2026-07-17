import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Wordmark } from "./wordmark";
import { generalWhatsapp } from "../../config/contact";

const NAV = [
  { label: "The Collection", to: "/collection" },
];

export function SiteHeader() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Transparent + light text only while resting over the landing hero.
  const overHero = isLanding && !scrolled;
  const solid = !overHero;

  const linkColor = overHero ? "color-mix(in srgb, var(--text-primary) 86%, transparent)" : "var(--text-body)";

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 transition-all duration-500"
        style={{
          backgroundColor: solid ? "color-mix(in srgb, var(--surface-page) 86%, transparent)" : "transparent",
          backdropFilter: solid ? "saturate(180%) blur(12px)" : "none",
          borderBottom: solid ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        {/* Header-local scrim. The wordmark is white and always white over the hero,
            so its legibility is entirely a function of what the photo puts behind it.
            The new hero has lit ceiling lamps in the top corners — exactly where the
            mark and ENQUIRE sit — and on a short (landscape) window the object-cover
            crop drops those lamps right under the header (measured: the mark landed
            on a lamp at ~0.85 luminance). The shared hero scrim can't fix this: its
            onyx pool is centred under the middle column and its vertical wash is
            weakest at the very top corners, and darkening either enough to cover the
            header would tar the whole top of the photo.

            A scrim that BELONGS to the header is independent of the photograph and of
            the crop, and it is a thin strip at the frame's top edge — well above the
            centrepiece wordmark (~40% down) — so it costs nothing compositionally.
            Only while the header rests transparent over the hero; once it goes solid
            on scroll it has its own background and this fades out to avoid doubling. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 transition-opacity duration-500"
          style={{
            opacity: overHero ? 1 : 0,
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--onyx) 85%, transparent) 0%, color-mix(in srgb, var(--onyx) 55%, transparent) 45%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" aria-label="The Collection — home" className="shrink-0">
            <Wordmark size="mini" tone="light" />
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-[0.78rem] uppercase tracking-[0.14em] transition-colors hover:text-[var(--accent)]"
                style={{ color: linkColor }}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={generalWhatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              className="border px-5 py-2.5 text-[0.72rem] uppercase tracking-[0.14em] transition-colors"
              style={{
                borderColor: overHero ? "color-mix(in srgb, var(--text-primary) 50%, transparent)" : "var(--text-muted)",
                color: "var(--text-primary)",
              }}
            >
              Enquire
            </a>
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-5 md:hidden">
            <a
              href={generalWhatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.72rem] uppercase tracking-[0.14em]"
              style={{ color: "var(--text-primary)" }}
            >
              Enquire
            </a>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button aria-label="Open menu" className="p-1" style={{ color: "var(--text-primary)" }}>
                  <Menu className="size-6" strokeWidth={1.4} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[var(--surface-page)] border-none w-[82%] max-w-sm p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex h-full flex-col px-8 pt-10 pb-10">
                  <Wordmark size="mini" tone="light" />
                  <nav className="mt-14 flex flex-col gap-7">
                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="text-[var(--text-primary)] text-[1.1rem]"
                      style={{ fontFamily: "var(--typeface-serif)" }}
                    >
                      Home
                    </Link>
                    {NAV.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className="text-[var(--text-primary)] text-[1.1rem]"
                        style={{ fontFamily: "var(--typeface-serif)" }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
