import logoLightUrl from "../../assets/the-collection-logo.webp";
import logoDarkUrl from "../../assets/the-collection-logo-dark.webp";

type WordmarkSize = "hero" | "panel" | "mini" | "foot";
type WordmarkTone = "light" | "dark";

// The Collection — the client's own lockup: the script "The" over a condensed
// Didone "COLLECTION". MONOCHROME (pure white / pure black) — the old artwork had
// a gold "COLLECTION" and is gone with the rest of the gold.
//
// `tone` names the ARTWORK: "light" = white artwork, for dark surfaces (hero,
// footer, drawer, over-hero header); "dark" = black artwork, for light surfaces.
// The site is now fully dark, so "light" is used nearly everywhere — the scrolled
// header is the one place the tone flips.
//
// RASTER, deliberately: this is the client's own artwork (brand/the-collection-logo-original.webp),
// trimmed to its ink and re-tinted per tone. It replaced a potrace TRACE of a
// low-res PNG, which had dilated the copperplate hairlines into uniform slabs.
// Tracing again would reintroduce exactly that: the hairlines are ~1px at source
// width, and no autotracer keeps them. 1081x637 of ink (1.69:1) against a 116px
// largest render (the hero clamp) leaves ~1.8x headroom at DPR 3, so the raster
// never limits us. Set a HEIGHT and let the width follow.
// A true vector needs the client's original AI/EPS/PDF — not another trace.
const HEIGHTS: Record<WordmarkSize, string> = {
  hero: "clamp(4.5rem, 11vw, 7.25rem)",
  panel: "3.6rem",
  mini: "2.1rem",
  foot: "2.1rem",
};

interface WordmarkProps {
  size?: WordmarkSize;
  tone?: WordmarkTone;
  className?: string;
}

export function Wordmark({ size = "mini", tone = "dark", className = "" }: WordmarkProps) {
  const src = tone === "dark" ? logoDarkUrl : logoLightUrl;
  return (
    <span className={`inline-flex select-none ${className}`}>
      <img
        src={src}
        alt="The Collection"
        style={{ height: HEIGHTS[size], width: "auto", display: "block" }}
      />
    </span>
  );
}
