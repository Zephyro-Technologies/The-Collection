import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Sidebar } from "./components/shell/Sidebar";
import { BottomNav } from "./components/shell/BottomNav";
import { TopBar } from "./components/shell/TopBar";
import { SignIn } from "./components/screens/SignIn";
import { Home } from "./components/screens/Home";
import { Conversations } from "./components/screens/Conversations";
import { Tickets } from "./components/screens/Tickets";
import { Appointments } from "./components/screens/Appointments";
import { Matching } from "./components/screens/Matching";
import { Inventory } from "./components/screens/Inventory";
import { CustomerProfileSheet } from "./components/customer/CustomerProfileSheet";
import { CarDetailSheet } from "./components/inventory/CarDetailSheet";
import { NotificationsSheet } from "./components/shell/NotificationsSheet";
import { Wordmark } from "./components/brand/Wordmark";
import { navItems, type ViewKey } from "./components/shell/nav-items";
import type { GlobalSearchHit } from "./components/shell/GlobalSearch";
import {
  conversations as seedConv,
  tickets as seedTickets,
  appointments as seedAppts,
  cars as mockCars,
  customers,
  type Conversation,
  type Ticket,
  type Appointment,
  windowClosingSoon,
} from "./data/mock";
import * as inventory from "@collection/shared";
import {
  getSession,
  onAuthStateChange,
  authContextFromSession,
  signOut,
  listShowrooms,
  getShowroomById,
  listNotifications,
  markNotificationRead,
  markAllRead,
  subscribeNotifications,
  listEnquiries,
  createEnquiry,
  updateEnquiry,
  updateEnquiryStatus,
  renewEnquiry,
  deleteEnquiry,
  subscribeEnquiries,
  isEnquiryActive,
} from "@collection/shared";
import type { Car, CarStatus, Showroom, Notification, Enquiry, EnquiryInput } from "@collection/shared";
import type { Session } from "@supabase/supabase-js";

export default function App() {
  // --- Auth (real Supabase session) --------------------------------------
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    getSession().then((s) => { if (alive) { setSession(s); setAuthChecked(true); } });
    const unsub = onAuthStateChange((s) => { setSession(s); setAuthChecked(true); });
    return () => { alive = false; unsub(); };
  }, []);

  const auth = authContextFromSession(session);
  const isAdmin = auth?.isAdmin ?? false;
  // A photographer manages The Collection's inventory CONTENT only: they may add
  // cars + edit details, but not publish/feature (admin-only), not change status,
  // and not delete. The DB (0014/0019) enforces this; these flags hide the UI.
  const isPhotographer = auth?.role === "photographer";
  const myShowroomId = auth?.showroomId;

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not sign out."); }
  };

  // --- Admin showroom context (a working context; UI convenience over RLS) --
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [activeShowroomId, setActiveShowroomId] = useState<string | "all" | null>(null);
  // The signed-in user's OWN showroom (for the top-bar identity). Fetched by id so
  // it resolves for a partner too, whose `showrooms` list is never loaded.
  const [myShowroom, setMyShowroom] = useState<Showroom | null>(null);

  useEffect(() => {
    if (!isAdmin) { setShowrooms([]); setActiveShowroomId(null); return; }
    listShowrooms().then(setShowrooms).catch(() => {});
    let saved: string | null = null;
    try { saved = localStorage.getItem("tc:activeShowroom"); } catch { /* ignore */ }
    setActiveShowroomId(saved ?? myShowroomId ?? "all");
  }, [isAdmin, myShowroomId]);

  useEffect(() => {
    if (isAdmin && activeShowroomId) {
      try { localStorage.setItem("tc:activeShowroom", activeShowroomId); } catch { /* ignore */ }
    }
  }, [isAdmin, activeShowroomId]);

  useEffect(() => {
    if (!myShowroomId) { setMyShowroom(null); return; }
    let alive = true;
    getShowroomById(myShowroomId).then((s) => { if (alive) setMyShowroom(s); }).catch(() => {});
    return () => { alive = false; };
  }, [myShowroomId]);

  // --- Notifications: real "partner added a car" feed, admin-only + live -----
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadNotifCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  useEffect(() => {
    if (!isAdmin) { setNotifications([]); return; }
    let alive = true;
    const load = () => {
      listNotifications().then((n) => { if (alive) setNotifications(n); }).catch(() => {});
    };
    load();
    // Live: re-fetch on any insert/update to the notifications table. RLS scopes
    // the realtime stream to the admin. Cleaned up on unmount / sign-out.
    const unsub = subscribeNotifications(load);
    return () => { alive = false; unsub(); };
  }, [isAdmin]);

  const handleMarkNotifRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try { await markNotificationRead(id); } catch { /* realtime will reconcile */ }
  };
  const handleMarkAllNotifsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await markAllRead(); } catch { /* realtime will reconcile */ }
  };

  // --- Enquiries + Matching: admin-only, live -------------------------------
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [enquiriesError, setEnquiriesError] = useState<string | null>(null);

  const loadEnquiries = useCallback(() => {
    listEnquiries()
      .then((e) => { setEnquiries(e); setEnquiriesError(null); })
      .catch((e) => setEnquiriesError(e instanceof Error ? e.message : "Failed to load inquiries."))
      .finally(() => setEnquiriesLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) { setEnquiries([]); return; }
    let alive = true;
    setEnquiriesLoading(true);
    const load = () => { if (alive) loadEnquiries(); };
    load();
    // Live across admins: re-fetch on any enquiries change. RLS scopes the stream.
    const unsub = subscribeEnquiries(load);
    return () => { alive = false; unsub(); };
  }, [isAdmin, loadEnquiries]);

  const handleCreateEnquiry = async (input: EnquiryInput) => {
    try { await createEnquiry(input); loadEnquiries(); toast.success("Inquiry created."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not create inquiry."); }
  };
  const handleUpdateEnquiry = async (id: string, input: EnquiryInput) => {
    try { await updateEnquiry(id, input); loadEnquiries(); toast.success("Inquiry saved."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save inquiry."); }
  };
  const handleEnquiryStatus = async (id: string, status: "fulfilled" | "dismissed" | "archived", fulfilled?: { source: "inventory"; refId: string }) => {
    try { await updateEnquiryStatus(id, status, fulfilled); loadEnquiries(); toast.success(`Inquiry ${status}.`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not update inquiry."); }
  };
  const handleRenewEnquiry = async (id: string) => {
    try { await renewEnquiry(id); loadEnquiries(); toast.success("Inquiry renewed for another month."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not renew inquiry."); }
  };
  const handleDeleteEnquiry = async (id: string) => {
    try { await deleteEnquiry(id); loadEnquiries(); toast.success("Inquiry deleted."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete inquiry."); }
  };

  const activeEnquiryCount = useMemo(() => enquiries.filter(isEnquiryActive).length, [enquiries]);
  const newEnquiriesToday = useMemo(() => {
    const t = new Date().toDateString();
    return enquiries.filter((e) => new Date(e.createdAt).toDateString() === t).length;
  }, [enquiries]);

  // Effective active context (falls back to own showroom until state resolves).
  const effectiveActive: string | "all" | undefined = isAdmin
    ? (activeShowroomId ?? myShowroomId ?? "all")
    : undefined;

  // Fetch scope: the admin fetches ALL cars (needed for cross-screen car lookups
  // and the "All" overview) and the Inventory screen filters by context
  // client-side; a partner fetches only their own. Phase B: this is UI scoping —
  // RLS is still permissive; Phase C makes it the real boundary.
  const fetchShowroomId = isAdmin ? undefined : myShowroomId;

  // Where a NEW car is stamped: the admin's active context, or the partner's own.
  // null = cannot add (admin in the "All" overview — must pick a showroom first).
  const writeShowroomId = isAdmin
    ? (effectiveActive && effectiveActive !== "all" ? effectiveActive : null)
    : myShowroomId ?? null;

  const [view, setView] = useState<ViewKey>("home");
  const [search] = useState("");
  const [openConvId, setOpenConvId] = useState<string | null>(null);
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [openCarId, setOpenCarId] = useState<string | null>(null);
  const [editCarId, setEditCarId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>(seedConv);
  const [tickets, setTickets] = useState<Ticket[]>(seedTickets);
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppts);

  // Inventory is the one section backed by a real database (Supabase). The rest
  // of the app still runs on in-memory seed data until the bot session lands.
  const [cars, setCars] = useState<Car[]>([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState<string | null>(null);
  // Whether the one-time seed→live carId remap has run. A ref (not state) so the
  // fetch callback below doesn't have to list it as a dependency.
  const seedRemappedRef = useRef(false);

  // Seed conversations/appointments reference the mock car ids (car1…), but live
  // inventory has Supabase UUIDs — so their carId lookups miss. Remap the seed
  // refs to the live ids by matching make+model (robust to whatever UUIDs the DB
  // assigned). Runs once on first load; no-op for ids that aren't mock ids.
  // Stable identity (only stable setters + module const inside) so it never
  // re-triggers the fetch/subscribe effects.
  const remapSeedCarIds = useCallback((liveCars: Car[]) => {
    const key = (make: string, model: string) => `${make}|${model}`.toLowerCase();
    const liveIdByModel = new Map(liveCars.map((c) => [key(c.make, c.model), c.id]));
    const mockById = new Map(mockCars.map((c) => [c.id, c]));
    const toLiveId = (carId?: string) => {
      if (!carId) return carId;
      const mc = mockById.get(carId);
      if (!mc) return carId; // already a live id / unknown — leave as-is
      return liveIdByModel.get(key(mc.make, mc.model)) ?? carId;
    };
    setConversations((prev) => prev.map((c) => (c.carId ? { ...c, carId: toLiveId(c.carId) } : c)));
    setAppointments((prev) => prev.map((a) => ({ ...a, carId: toLiveId(a.carId) ?? a.carId })));
  }, []);

  // Single inventory fetch, bound to the CURRENT scope (admin → all showrooms;
  // partner → own). useCallback keyed on the scope so its identity is stable
  // across renders and changes ONLY when the scope changes — that's what lets the
  // effects below have honest dependencies with no stale-closure pinning. `silent`
  // is the post-mutation / realtime path: no loading flash, errors surface as a
  // toast rather than replacing the list.
  const loadCars = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) { setCarsLoading(true); setCarsError(null); }
    try {
      const live = await inventory.listInventory(fetchShowroomId ? { showroomId: fetchShowroomId } : undefined);
      setCars(live);
      // Seed remap is a Collection-only concern (the seed conversations/tickets/
      // etc. are the admin's) — run it once, admin only.
      if (isAdmin && !seedRemappedRef.current) { remapSeedCarIds(live); seedRemappedRef.current = true; }
      if (silent) setCarsError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load inventory.";
      if (silent) toast.error(msg); else setCarsError(msg);
    } finally {
      if (!silent) setCarsLoading(false);
    }
  }, [fetchShowroomId, isAdmin, remapSeedCarIds]);

  // Silent re-pull after a mutation (and the realtime path) — reflects what's
  // actually in Supabase (full photos array, server-set fields), no loading flash.
  const refreshCars = useCallback(() => loadCars({ silent: true }), [loadCars]);

  // Load inventory when signed in, and re-load if the signed-in user OR their
  // fetch scope changes. Honest deps (loadCars carries the scope) — no eslint
  // suppression, no closure pinned to the first run.
  useEffect(() => {
    if (!auth) return;
    loadCars();
  }, [auth?.userId, loadCars]);

  // Live inventory: subscribe once per signed-in user so any INSERT/UPDATE/DELETE
  // (by anyone) re-pulls the current scope. RLS scopes the stream — a partner only
  // receives their own rows; the admin receives every showroom's. Calling the
  // refresh via a ref keeps the subscription off the render loop, so switching
  // context never resubscribes (no duplicate/leaked channels); cleanup on unmount.
  const refreshCarsRef = useRef(refreshCars);
  useEffect(() => { refreshCarsRef.current = refreshCars; }, [refreshCars]);
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = inventory.subscribeInventory(() => { refreshCarsRef.current(); });
    return unsubscribe;
  }, [auth?.userId]);

  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const todayAppts = useMemo(() => appointments.filter((a) => isToday(a.at) && a.status === "scheduled"), [appointments]);
  const openTickets = useMemo(() => tickets.filter((t) => t.status === "open"), [tickets]);
  const needsHumanCount = useMemo(() => conversations.filter((c) => c.status === "needs_human").length, [conversations]);

  // "Urgent" means act-now: the reply window is closing or already overdue.
  // (Merely-aged tickets are surfaced by the Tickets screen's aging dots, not by
  // a red badge — a red badge should mean "N need you now", not "N are open".)
  const urgentTicketCount = useMemo(
    () => openTickets.filter((t) => windowClosingSoon(t.windowClosesAt)).length,
    [openTickets],
  );
  const hasUrgentTickets = urgentTicketCount > 0;

  const counts: Partial<Record<ViewKey, number>> = {
    home: todayAppts.length + openTickets.length + newEnquiriesToday || undefined,
    conversations: needsHumanCount || undefined,
    // Red badge shows the urgent count; otherwise the neutral total.
    tickets: (hasUrgentTickets ? urgentTicketCount : openTickets.length) || undefined,
    appointments: todayAppts.length || undefined,
    matching: activeEnquiryCount || undefined,
  };
  const urgent: Partial<Record<ViewKey, boolean>> = { tickets: hasUrgentTickets };

  // Conversation actions
  const reply = (cid: string, text: string) =>
    setConversations((prev) => prev.map((c) =>
      c.id === cid
        ? {
            ...c,
            handler: "human",
            status: "needs_human",
            lastAt: new Date().toISOString(),
            messages: [...c.messages, { id: `m${Date.now()}`, from: "human", text, at: new Date().toISOString() }],
          }
        : c
    ));
  const takeOver = (cid: string) =>
    setConversations((prev) => prev.map((c) => c.id === cid ? { ...c, handler: "human", status: "needs_human" } : c));
  const handBack = (cid: string) =>
    setConversations((prev) => prev.map((c) => c.id === cid ? { ...c, handler: "bot", status: "bot" } : c));
  const resolveConv = (cid: string) =>
    setConversations((prev) => prev.map((c) => c.id === cid ? { ...c, status: "resolved" } : c));

  const resolveTicket = (tid: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== tid));
  };

  const addCar = async (c: Omit<Car, "id" | "addedAt" | "showroomId">) => {
    if (!writeShowroomId) { toast.error("Select a showroom before adding a car."); return; }
    try {
      const newCar = await inventory.addCar(c, writeShowroomId);
      await refreshCars();
      // Matching against active buying enquiries is handled server-side: the
      // 0011 inventory trigger notifies the admin when new stock matches.
      toast.success(`${newCar.make} ${newCar.model} added to the collection.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add car.");
    }
  };

  const updateCar = async (id: string, patch: Omit<Car, "id" | "addedAt" | "showroomId">) => {
    const prev = cars.find((c) => c.id === id);
    try {
      await inventory.updateCar(id, patch);
      // Now that the removal is persisted, delete the Storage objects for photos
      // that are no longer on the car (only our own uploads; external URLs skipped).
      // Fire-and-forget so a delete hiccup never fails the save (harmless orphan).
      if (prev) {
        const kept = new Set(patch.photos ?? []);
        for (const url of prev.photos ?? []) {
          if (!kept.has(url) && inventory.isCarImageStorageUrl(url)) {
            void inventory.deleteCarImage(url).catch((err) => console.warn("[storage] removed-photo delete failed:", err));
          }
        }
      }
      await refreshCars();
      toast.success("Changes saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save changes.");
    }
  };

  const changeCarStatus = async (id: string, status: CarStatus) => {
    try {
      await inventory.changeCarStatus(id, status);
      await refreshCars();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status.");
    }
  };

  const deleteCar = async (id: string) => {
    const prev = cars.find((c) => c.id === id);
    try {
      await inventory.deleteCar(id);
      // Clean up the deleted car's uploaded images (our own Storage URLs only).
      for (const url of prev?.photos ?? []) {
        if (inventory.isCarImageStorageUrl(url)) {
          void inventory.deleteCarImage(url).catch((err) => console.warn("[storage] car-delete image cleanup failed:", err));
        }
      }
      await refreshCars();
      toast.success("Car removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove car.");
    }
  };

  // Cross-navigation helpers
  const openConversation = (id: string) => {
    setOpenConvId(id);
    setView("conversations");
  };

  const handleSearch = (hit: GlobalSearchHit) => {
    if (hit.kind === "conversation") openConversation(hit.id);
    else if (hit.kind === "customer") setOpenCustomerId(hit.id);
    else if (hit.kind === "car") setView("inventory");
  };

  // Checking the persisted session — hold on a neutral splash (no login flash).
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-noir text-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-80">
          <Wordmark variant="light" size="md" />
          <div className="accent-rule" />
        </div>
      </div>
    );
  }
  if (!session) return <SignIn />;

  // Allowlist: only a recognized, fully-configured account reaches the dashboard
  // — admin, or a partner/photographer WITH a showroom. Anything else (unknown/
  // typo'd role, or a scoped role missing a showroom) is treated as not-set-up, so
  // no misconfiguration can fall through to the all-showrooms fetch path.
  const configured =
    auth?.role === "admin" ||
    ((auth?.role === "partner" || auth?.role === "photographer") && !!myShowroomId);
  if (!configured) {
    return (
      <div className="min-h-screen bg-noir text-cream flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <Wordmark variant="light" size="md" />
          <div className="accent-rule mx-auto mt-6 mb-5" />
          <p className="text-cream/80" style={{ fontSize: "0.92rem", lineHeight: 1.6 }}>
            This account isn’t fully set up yet. Please contact The Collection to have your showroom access configured.
          </p>
          <button onClick={handleSignOut} className="mt-6 text-cream/60 hover:text-cream underline" style={{ fontSize: "0.8rem" }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const navList = isAdmin ? navItems : navItems.filter((n) => n.key === "inventory");
  const shownView: ViewKey = isAdmin ? view : "inventory";

  return (
    <div className="min-h-screen bg-alabaster text-noir flex">
      <Sidebar
        active={shownView}
        onSelect={setView}
        counts={isAdmin ? counts : {}}
        urgent={isAdmin ? urgent : {}}
        items={navList}
      />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopBar
          isAdmin={isAdmin}
          showroomName={myShowroom?.name}
          role={auth?.role}
          userEmail={auth?.email}
          onSignOut={handleSignOut}
          customers={customers}
          cars={cars}
          conversations={conversations}
          notifCount={unreadNotifCount}
          notifUrgent={false}
          onSearchSelect={handleSearch}
          onOpenNotifications={() => setNotifOpen(true)}
        />
        <main className="flex-1 min-h-0 flex flex-col">
          {shownView === "home" && (
            <Home
              today={todayAppts}
              openTickets={openTickets}
              newEnquiriesToday={newEnquiriesToday}
              activeEnquiries={activeEnquiryCount}
              botHandledToday={384}
              customers={customers}
              cars={cars}
              onNavigate={setView}
              onOpenThread={openConversation}
              onOpenCustomer={setOpenCustomerId}
              ticketsUrgent={hasUrgentTickets}
            />
          )}
          {shownView === "conversations" && (
            <Conversations
              conversations={conversations}
              customers={customers}
              cars={cars}
              appointments={appointments}
              search={search}
              openId={openConvId}
              onOpenChange={setOpenConvId}
              onReply={reply}
              onTakeOver={takeOver}
              onHandBack={handBack}
              onResolve={resolveConv}
              onOpenCustomer={setOpenCustomerId}
            />
          )}
          {shownView === "tickets" && (
            <Tickets
              tickets={openTickets}
              conversations={conversations}
              customers={customers}
              cars={cars}
              onReply={reply}
              onResolveTicket={resolveTicket}
              onTakeOver={takeOver}
              onHandBack={handBack}
              onOpenThread={openConversation}
              onOpenCustomer={setOpenCustomerId}
            />
          )}
          {shownView === "appointments" && (
            <Appointments
              appointments={appointments}
              customers={customers}
              cars={cars}
              conversations={conversations}
              onComplete={(id) => setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "completed" } : a))}
              onNoShow={(id) => setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "no_show" } : a))}
              onReschedule={(id, iso) => setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, at: iso, reminderSent: false } : a))}
              onOpenThread={openConversation}
              onOpenCustomer={setOpenCustomerId}
            />
          )}
          {shownView === "matching" && isAdmin && (
            <Matching
              enquiries={enquiries}
              cars={cars}
              loading={enquiriesLoading}
              error={enquiriesError}
              onReload={loadEnquiries}
              onCreate={handleCreateEnquiry}
              onUpdate={handleUpdateEnquiry}
              onStatus={handleEnquiryStatus}
              onRenew={handleRenewEnquiry}
              onDelete={handleDeleteEnquiry}
              onOpenCar={setOpenCarId}
            />
          )}
          {shownView === "inventory" && (
            <Inventory
              cars={cars}
              loading={carsLoading}
              error={carsError}
              onReload={() => loadCars()}
              onAdd={addCar}
              onUpdate={updateCar}
              onDelete={deleteCar}
              onOpenCar={setOpenCarId}
              editRequestId={editCarId}
              onEditHandled={() => setEditCarId(null)}
              isAdmin={isAdmin}
              showrooms={showrooms}
              activeShowroomId={isAdmin ? effectiveActive : undefined}
              onChangeShowroom={isAdmin ? setActiveShowroomId : undefined}
              uploadShowroomId={writeShowroomId ?? undefined}
              canPublish={isAdmin}
              canManageStatus={!isPhotographer}
              canDelete={!isPhotographer}
            />
          )}
        </main>
      </div>
      <BottomNav active={shownView} onSelect={setView} counts={isAdmin ? counts : {}} urgent={isAdmin ? urgent : {}} items={navList} />

      <CarDetailSheet
        car={openCarId ? cars.find((c) => c.id === openCarId) ?? null : null}
        // Read-only in the "All" overview, and for a car outside the active
        // context — e.g. a partner's car opened from a Matching result. You manage
        // a car only from within its own showroom context.
        readOnly={isAdmin && (effectiveActive === "all" || (openCarId ? cars.find((c) => c.id === openCarId)?.showroomId !== effectiveActive : false))}
        canManageStatus={!isPhotographer}
        canDelete={!isPhotographer}
        onClose={() => setOpenCarId(null)}
        onEdit={(id) => { setOpenCarId(null); setEditCarId(id); }}
        onStatusChange={changeCarStatus}
        onDelete={(id) => { deleteCar(id); setOpenCarId(null); }}
      />

      {isAdmin && (
        <CustomerProfileSheet
          customerId={openCustomerId}
          customers={customers}
          conversations={conversations}
          cars={cars}
          appointments={appointments}
          onClose={() => setOpenCustomerId(null)}
          onOpenConversation={openConversation}
        />
      )}

      {isAdmin && (
        <NotificationsSheet
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          notifications={notifications}
          onMarkRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllNotifsRead}
          onNavigate={setView}
        />
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
