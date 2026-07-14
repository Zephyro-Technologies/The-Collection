import { useEffect } from "react";

// Per-route <title>. The site is a client-rendered SPA, so titles are set here
// (index.html carries the site-level default + social/OG tags). Unknown routes
// redirect home, which sets the home title, so there is no need to restore.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
