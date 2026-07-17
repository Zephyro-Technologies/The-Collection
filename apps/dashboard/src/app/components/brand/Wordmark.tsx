import logoLightUrl from "../../../assets/the-collection-logo.webp";
import logoDarkUrl from "../../../assets/the-collection-logo-dark.webp";

interface WordmarkProps {
  /** Names the ARTWORK, not the surface — read it as "the light artwork":
   *  "light" = white artwork → sits on a DARK surface (sidebar, sign-in).
   *  "dark"  = black artwork → sits on a LIGHT surface (mobile top bar). */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

// The Collection — the client's own lockup: the script "The" over a condensed
// Didone "COLLECTION". MONOCHROME (pure white / pure black), matching the
// silver-and-black palette — the old artwork had a gold "COLLECTION" and is gone.
//
// RASTER, deliberately: this is the client's own artwork (brand/the-collection-logo-original.webp),
// trimmed to its ink and re-tinted per variant. It replaced a potrace TRACE of a
// low-res PNG, which had dilated the copperplate hairlines into uniform slabs.
// Tracing again would reintroduce exactly that. 1081x637 of ink (1.70:1) against a
// 70px largest render (lg) leaves ample headroom at DPR 3.
// Set a HEIGHT and let the width follow.
const HEIGHTS: Record<NonNullable<WordmarkProps["size"]>, number> = {
  sm: 28,
  md: 46,
  lg: 70,
};

export function Wordmark({ variant = "dark", size = "md", className = "" }: WordmarkProps) {
  const src = variant === "dark" ? logoDarkUrl : logoLightUrl;
  return (
    <span className={`inline-flex ${className}`}>
      <img
        src={src}
        alt="The Collection"
        style={{ height: HEIGHTS[size], width: "auto", display: "block" }}
      />
    </span>
  );
}
