import logoLightUrl from "../../../assets/the-collection-logo.svg";
import logoDarkUrl from "../../../assets/the-collection-logo-dark.svg";

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
// VECTOR: the client supplied only PNG, so the lockup was traced (potrace) from
// their artwork into SVG — crisp at every size. viewBox 954x565 (1.69:1).
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
