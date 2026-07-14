import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router";
import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";
import { Landing } from "./components/pages/landing";
import { Collection } from "./components/pages/collection";
import { CarDetail } from "./components/pages/car-detail";
import { Privacy, Terms } from "./components/pages/legal";
import { NotFound } from "./components/pages/not-found";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-page)] text-[var(--text-primary)]">
      <ScrollToTop />
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/collection/:id" element={<CarDetail />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
