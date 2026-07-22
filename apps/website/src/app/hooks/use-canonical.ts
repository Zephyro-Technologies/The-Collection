import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * The public site is served on TWO domains — thecollectionisb.com.pk and
 * thecollectionisb.pk — from a single Cloudflare Worker. Identical content on
 * two hostnames competes with itself in search unless one is declared
 * authoritative, so every page emits exactly one canonical URL, always on the
 * .com.pk origin, whichever domain the visitor arrived on.
 *
 * WHY IN JAVASCRIPT: this is a client-rendered SPA — one index.html serves every
 * route — so a static <link rel="canonical"> in the HTML could only ever name
 * one URL, and would wrongly canonicalise every route to it. Google's guidance
 * is explicit that if the canonical cannot be set in the HTML source, you should
 * "leave it out and only set it with JavaScript" rather than emit a static one
 * and override it. index.html therefore deliberately carries NO canonical tag —
 * do not add one.
 *
 * Belt and braces: apps/website/public/_headers additionally sends a
 * `Link: <...>; rel="canonical"` HTTP header on the thecollectionisb.pk
 * hostnames, which needs no JavaScript at all. The two always agree.
 *
 * The .com.pk origin is also what robots.txt's Sitemap: line and every <loc> in
 * sitemap.xml point at — those three must not drift apart.
 */
export const CANONICAL_ORIGIN = "https://thecollectionisb.com.pk";

/** Absolute canonical URL for a route path, normalised (no trailing slash, no query). */
export function canonicalUrlFor(pathname: string): string {
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return CANONICAL_ORIGIN + path;
}

/**
 * Keeps <link rel="canonical"> and og:url pointing at this route's canonical URL.
 * Called once in the layout, so it covers every route including ones added later.
 */
export function useCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    const href = canonicalUrlFor(pathname);

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href;

    // og:url must agree with the canonical or a social scraper can attribute the
    // share to the wrong domain. (Scrapers generally do not run JS, so the value
    // baked into index.html is what most of them see — this corrects the ones
    // that do render, and keeps the two signals consistent for everything else.)
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = href;
  }, [pathname]);
}
