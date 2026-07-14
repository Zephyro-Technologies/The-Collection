import logoLightUrl from "../../assets/the-collection-logo.svg";
import logoDarkUrl from "../../assets/the-collection-logo-dark.svg";

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
// VECTOR: the client supplied only PNG, so the lockup was traced (potrace) from
// their artwork into SVG — crisp at every size. viewBox 954x565 (1.69:1).
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
