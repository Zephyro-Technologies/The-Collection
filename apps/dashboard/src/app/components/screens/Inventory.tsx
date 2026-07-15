import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, X, LayoutGrid, LayoutList, Upload, AlertCircle } from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import { StatusPill } from "../common/StatusPill";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Car, CarStatus, Showroom } from "@collection/shared";
import { uploadCarImage, deleteCarImage, isAllowedImageType, randomId, ALLOWED_IMAGE_LABEL } from "@collection/shared";
import { ShowroomBar } from "../inventory/ShowroomBar";
import { PhotoStrip } from "../inventory/PhotoStrip";
import { formatCurrency } from "../../data/mock";

interface Props {
  cars: Car[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onAdd: (car: Omit<Car, "id" | "addedAt" | "showroomId">) => void;
  onUpdate: (id: string, patch: Omit<Car, "id" | "addedAt" | "showroomId">) => void;
  onDelete?: (id: string) => void;
  onOpenCar?: (id: string) => void;
  // The app-level CarDetailSheet asks the screen to open its edit dialog via
  // this id (the form state lives here, not at app level).
  editRequestId?: string | null;
  onEditHandled?: () => void;
  // Admin multi-showroom context (undefined for partners — single context).
  isAdmin?: boolean;
  showrooms?: Showroom[];
  activeShowroomId?: string | "all";
  onChangeShowroom?: (id: string | "all") => void;
  // The showroom new photo uploads are stamped into: the admin's active context,
  // or the partner's own showroom. Undefined ⇒ no upload target (admin in "All").
  uploadShowroomId?: string;
  // Per-role capabilities. Publish/feature is admin-only; a photographer may not
  // change status or delete. The DB (0014/0019) enforces all three regardless —
  // these just hide the controls (and, for publish/feature, keep them out of the
  // write payload so a routine non-admin edit never trips the guard).
  canPublish?: boolean;
  canManageStatus?: boolean;
  canDelete?: boolean;
}

const STATUSES: CarStatus[] = ["available", "reserved", "sold"];
const defaultImage = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80";

type FormState = Omit<Car, "id" | "addedAt" | "showroomId">;
const emptyForm = (): FormState => ({
  make: "", model: "", variant: "", year: new Date().getFullYear(),
  mileageKm: 0, colour: "", price: 0, currency: "PKR", status: "available",
  image: "", photos: [], description: "", docsComplete: true,
});

export function Inventory({ cars, loading, error, onReload, onAdd, onUpdate, onDelete, onOpenCar, editRequestId, onEditHandled, isAdmin = false, showrooms = [], activeShowroomId, onChangeShowroom, uploadShowroomId, canPublish = false, canManageStatus = true, canDelete = true }: Props) {
  const [filter, setFilter] = useState<CarStatus | "all">("all");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  // In-flight / failed uploads shown above the thumbnail list.
  const [uploads, setUploads] = useState<{ id: string; name: string; error?: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0); // unique ids for the upload rows (no crypto needed)
  // One folder per car so all its photos group together: the car id when editing,
  // or a fresh uuid per add-session (set when the dialog opens).
  const carFolderRef = useRef<string>("");
  // URLs uploaded during THIS open session but not yet saved. Removing one — or
  // cancelling the dialog — deletes it immediately (it isn't referenced by any
  // saved car). Photos that were ALREADY saved are NOT deleted here; App deletes
  // those only after a successful save (so cancelling never breaks a live car).
  const sessionUploadsRef = useRef<Set<string>>(new Set());

  // Admin context: the "All" overview is read-only; owner badges show which
  // showroom each car belongs to. Partners always have a single (own) context.
  const isAll = isAdmin && activeShowroomId === "all";
  const canAdd = !isAll;
  const showOwner = isAdmin && isAll;
  const showroomName = (id: string) => showrooms.find((s) => s.id === id)?.name ?? "—";

  // Seed the form ONCE when the dialog opens for a given target (add vs. a
  // specific car). Intentionally NOT keyed on `cars`: re-seeding on every live
  // inventory refetch would wipe unsaved edits — including a photo the user just
  // uploaded into form state but hasn't saved yet.
  useEffect(() => {
    if (!open) return;
    setUploads([]);
    setDragOver(false);
    sessionUploadsRef.current = new Set();
    carFolderRef.current = editingId ?? randomId();
    if (editingId) {
      const c = cars.find((x) => x.id === editingId);
      if (c) {
        const { id: _i, addedAt: _a, showroomId: _s, ...rest } = c;
        // Older cars may only have `image` set — seed the gallery from it.
        const photos = rest.photos?.length ? rest.photos : rest.image ? [rest.image] : [];
        // Every car is priced in PKR — normalise any legacy non-PKR rows.
        setForm({ ...rest, photos, currency: "PKR" });
      }
    } else {
      setForm(emptyForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  // The detail sheet (app level) requests an edit by id; open the form for it.
  useEffect(() => {
    if (!editRequestId) return;
    if (isAll) { onEditHandled?.(); return; } // the "All" overview is read-only
    setEditingId(editRequestId);
    setOpen(true);
    onEditHandled?.();
  }, [editRequestId, onEditHandled, isAll]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cars
      // Admin, specific context → only that showroom's cars (client-side; the
      // admin fetches all). "All" and partners are already correctly scoped.
      .filter((c) => (isAdmin && activeShowroomId && activeShowroomId !== "all" ? c.showroomId === activeShowroomId : true))
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .filter((c) => !s || `${c.make} ${c.model} ${c.variant} ${c.colour}`.toLowerCase().includes(s));
  }, [cars, filter, q, isAdmin, activeShowroomId]);

  const submit = () => {
    if (!form.make || !form.model) return;
    if (uploadsInFlight()) return; // guard: don't save while a photo is still uploading
    // First photo is the cover/thumbnail; drop blank rows. `image` stays in sync
    // with photos[0] so cards and car lookups elsewhere keep working.
    const photos = (form.photos ?? []).map((p) => p.trim()).filter(Boolean);
    // Always PKR — the dashboard is single-currency.
    const payload = { ...form, photos, image: photos[0] || defaultImage, currency: "PKR" };
    // Publish/feature are admin-only. A non-admin form never sends them, so the
    // columns are omitted from the write and the DB keeps its values — the guard
    // trigger then has nothing to reject on a routine edit.
    if (!canPublish) {
      delete payload.published;
      delete payload.featured;
    }
    if (editingId) onUpdate(editingId, payload);
    else onAdd(payload);
    // These uploads are now saved — do NOT clean them up on close.
    sessionUploadsRef.current = new Set();
    setOpen(false);
    setEditingId(null);
  };
  const uploadsInFlight = () => uploads.some((u) => !u.error);

  // --- photo gallery editing (file uploads to Supabase Storage) ---
  const photos = form.photos ?? [];
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — matches the bucket limit

  // Upload each picked/dropped file to the owning showroom's Storage path, then
  // push its public URL into photos[]. Runs sequentially so photos[] order tracks
  // selection order; a failure on one file is shown inline and never blocks the
  // others (already-uploaded URLs stay in the list).
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!uploadShowroomId) { toast.error("Select a showroom before uploading photos."); return; }
    for (const file of Array.from(fileList)) {
      if (!isAllowedImageType(file)) { toast.error(`"${file.name}" isn't a supported image (${ALLOWED_IMAGE_LABEL}).`); continue; }
      if (file.size > MAX_UPLOAD_BYTES) { toast.error(`"${file.name}" is over 10 MB.`); continue; }
      const id = String(uploadSeq.current++);
      setUploads((u) => [...u, { id, name: file.name }]);
      try {
        const url = await uploadCarImage(file, uploadShowroomId, carFolderRef.current || undefined);
        sessionUploadsRef.current.add(url);
        setForm((f) => ({ ...f, photos: [...(f.photos ?? []), url] }));
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : "Upload failed" } : x)));
      }
    }
  };

  const dismissUpload = (id: string) => setUploads((u) => u.filter((x) => x.id !== id));

  // Removing a photo drops it from photos[]. If it's an image uploaded THIS
  // session (not yet saved to any car), delete the Storage object immediately —
  // it's safe, nothing references it. If it was ALREADY saved, we do NOT delete
  // it here: App deletes removed photos only after a successful save, so removing
  // then cancelling never leaves a live car pointing at a deleted object.
  // Fire-and-forget: a failed delete must never block editing (harmless orphan).
  // By URL (not index) and useCallback-stable, so the memoized PhotoStrip doesn't
  // re-render on unrelated form edits. Functional setForm + a ref keep deps empty.
  const removePhoto = useCallback((url: string) => {
    setForm((f) => ({ ...f, photos: (f.photos ?? []).filter((u) => u !== url) }));
    if (url && sessionUploadsRef.current.has(url)) {
      sessionUploadsRef.current.delete(url);
      void deleteCarImage(url).catch((err) => console.warn("[storage] photo delete failed (orphan left):", err));
    }
  }, []);

  // The full new order after a drag-reorder (from PhotoStrip). Stable, same reason.
  const setPhotosOrder = useCallback((next: string[]) => {
    setForm((f) => ({ ...f, photos: next }));
  }, []);

  // Delete any images uploaded this session but never saved (they'd be orphans).
  const cleanupSessionUploads = () => {
    for (const url of sessionUploadsRef.current) {
      void deleteCarImage(url).catch((err) => console.warn("[storage] cancelled-upload cleanup failed:", err));
    }
    sessionUploadsRef.current = new Set();
  };

  // Close without saving: clean up this session's unsaved uploads. Saved photos
  // are untouched (App deletes removed saved photos only on a successful save).
  const closeForm = () => {
    cleanupSessionUploads();
    setOpen(false);
    setEditingId(null);
  };

  const openAdd = () => { if (!canAdd) return; setEditingId(null); setOpen(true); };
  const openEdit = (id: string) => { if (isAll) return; setEditingId(id); setOpen(true); };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full min-w-0">
      <SectionHeader
        eyebrow="The Collection"
        title="Inventory"
        subtitle="A considered selection, not an inventory."
        action={
          <Button
            className="bg-noir text-white hover:bg-noir-700 disabled:opacity-40"
            onClick={openAdd}
            disabled={!canAdd}
            title={canAdd ? undefined : "Select a showroom to add a car"}
          >
            <Plus size={15} className="mr-1.5" />Add a car
          </Button>
        }
      />

      {isAdmin && onChangeShowroom && activeShowroomId !== undefined && (
        <ShowroomBar
          showrooms={showrooms}
          activeShowroomId={activeShowroomId}
          onChange={onChangeShowroom}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-40" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search make, model, colour…"
            className="w-full bg-input-background rounded-md pl-9 pr-3 py-2 outline-none focus:bg-white border border-transparent focus:border-noir/40"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full border ${filter === s ? "bg-noir text-white border-noir" : "border-border text-ink-60 hover:border-accent/40"}`}
              style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden shrink-0 sm:ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${viewMode === "grid" ? "bg-noir text-white" : "text-ink-60 hover:bg-platinum-soft"}`}
            style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            <LayoutGrid size={13} />Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${viewMode === "list" ? "bg-noir text-white" : "text-ink-60 hover:bg-platinum-soft"}`}
            style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            <LayoutList size={13} />List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-40">
          <Loader2 className="animate-spin" size={22} />
          <p>Loading the collection…</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed border-signal-red/40 p-12 text-center">
          <p className="text-signal-red mb-4">{error}</p>
          {onReload && (
            <Button variant="ghost" className="border border-border" onClick={onReload}>
              Try again
            </Button>
          )}
        </div>
      ) : cars.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="accent-rule mx-auto mb-3" />
          <p className="text-ink-60 mb-4">{isAll ? "No cars in any showroom yet." : "The collection is empty."}</p>
          <Button
            className="bg-noir text-white hover:bg-noir-700 disabled:opacity-40"
            onClick={openAdd}
            disabled={!canAdd}
            title={canAdd ? undefined : "Select a showroom to add a car"}
          >
            <Plus size={15} className="mr-1.5" />Add the first car
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="accent-rule mx-auto mb-3" />
          <p className="text-ink-60">No cars match this view.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((car) => (
            <article
              key={car.id}
              onClick={() => onOpenCar?.(car.id)}
              className="group rounded-lg overflow-hidden border border-card-border bg-white shadow-[var(--shadow-card)] cursor-pointer hover:border-accent/40 hover:shadow-md transition-all"
            >
              <div className="aspect-[16/11] bg-platinum-soft overflow-hidden relative">
                <ImageWithFallback
                  src={car.image}
                  alt={`${car.make} ${car.model}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {showOwner && (
                  <span
                    className="absolute top-3 left-3 rounded-full bg-noir/85 text-cream px-2.5 py-1"
                    style={{ fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}
                  >
                    {showroomName(car.showroomId)}
                  </span>
                )}
                {!isAll && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(car.id); }}
                    className="absolute top-3 right-3 p-2 rounded-md bg-white/90 text-noir hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Edit car"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow mb-1">{car.year}</div>
                    <h3 style={{ fontFamily: "var(--typeface-sans)", fontSize: "1.02rem", fontWeight: 500, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                      {car.make} {car.model}
                    </h3>
                    <div className="text-ink-60 mt-0.5" style={{ fontSize: "0.82rem" }}>{car.variant}</div>
                  </div>
                  <StatusPill tone={car.status as "available" | "reserved" | "sold"} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-noir" style={{ fontSize: "1rem", fontWeight: 500 }}>{formatCurrency(car.price, car.currency)}</div>
                  <div className="text-ink-40" style={{ fontSize: "0.75rem" }}>{car.colour} · {car.mileageKm.toLocaleString()} km</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-card-border bg-white shadow-[var(--shadow-card)] divide-y divide-border/60 overflow-hidden">
          {filtered.map((car) => (
            <div
              key={car.id}
              onClick={() => onOpenCar?.(car.id)}
              className="group flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 cursor-pointer hover:bg-platinum-soft/40 transition-colors"
            >
              <div className="w-16 h-12 sm:w-20 sm:h-14 shrink-0 rounded-md overflow-hidden bg-platinum-soft">
                <ImageWithFallback src={car.image} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="eyebrow shrink-0">{car.year}</span>
                    <span className="font-medium truncate" style={{ fontSize: "0.92rem" }}>{car.make} {car.model}</span>
                    <span className="hidden sm:inline text-ink-40 truncate" style={{ fontSize: "0.82rem" }}>{car.variant}</span>
                    {showOwner && (
                      <span
                        className="shrink-0 rounded-full bg-platinum-soft text-ink-60 px-2 py-0.5"
                        style={{ fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}
                      >
                        {showroomName(car.showroomId)}
                      </span>
                    )}
                  </div>
                  <div className="text-ink-40 truncate mt-0.5" style={{ fontSize: "0.75rem" }}>
                    {car.variant && <span className="sm:hidden">{car.variant} · </span>}{car.colour} · {car.mileageKm.toLocaleString()} km
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="font-medium text-noir whitespace-nowrap" style={{ fontSize: "0.9rem" }}>{formatCurrency(car.price, car.currency)}</span>
                  <StatusPill tone={car.status as "available" | "reserved" | "sold"} />
                </div>
              </div>
              {!isAll && (
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(car.id); }}
                  className="hidden sm:flex shrink-0 p-2 rounded-md text-ink-40 hover:text-noir hover:bg-platinum-soft opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Edit car"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (o) { setOpen(true); } else { closeForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="editorial">{editingId ? "Edit car" : "Add a car"}</DialogTitle>
            {!editingId && isAdmin && activeShowroomId && activeShowroomId !== "all" && (
              <p className="text-ink-60 mt-1" style={{ fontSize: "0.82rem" }}>
                Adding to <span className="text-noir" style={{ fontWeight: 500 }}>{showroomName(activeShowroomId)}</span>
              </p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-1"><Label className="mb-1.5 block">Make</Label><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Porsche" /></div>
            <div className="col-span-1"><Label className="mb-1.5 block">Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="911" /></div>
            <div className="col-span-2"><Label className="mb-1.5 block">Variant</Label><Input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} placeholder="GT3 Touring" /></div>
            <div><Label className="mb-1.5 block">Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Mileage (km)</Label><Input type="number" value={form.mileageKm} onChange={(e) => setForm({ ...form, mileageKm: +e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Colour</Label><Input value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} placeholder="GT Silver" /></div>
            <div>
              <Label className="mb-1.5 block">Price (PKR)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="mb-1.5 block">Status</Label>
              {canManageStatus ? (
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CarStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                // Photographer: status is admin-only. Shown read-only for context;
                // new cars are added as available.
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-ink-60" style={{ fontSize: "0.85rem" }}>
                  <span style={{ textTransform: "capitalize" }}>{form.status}</span>
                  <span className="text-ink-40" style={{ fontSize: "0.72rem" }}>Set by The Collection</span>
                </div>
              )}
            </div>
            <div className="col-span-2 flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <div className="min-w-0">
                <Label className="cursor-default block" style={{ fontSize: "0.85rem" }}>Complete original documents</Label>
                <p className="text-ink-40 mt-0.5" style={{ fontSize: "0.72rem" }}>On for the dealership's own stock. Turn off for a car without full papers.</p>
              </div>
              <Switch checked={form.docsComplete ?? true} onCheckedChange={(v) => setForm({ ...form, docsComplete: v })} />
            </div>
            {canPublish && (
              // Admin only — the public-website controls. Hidden from partner and
              // photographer forms; the DB guard (0014) enforces it regardless.
              <div className="col-span-2 flex flex-col gap-3 rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="cursor-default block" style={{ fontSize: "0.85rem" }}>Published</Label>
                    <p className="text-ink-40 mt-0.5" style={{ fontSize: "0.72rem" }}>Show this car on The Collection's public website.</p>
                  </div>
                  <Switch
                    checked={form.published ?? false}
                    onCheckedChange={(v) => setForm({ ...form, published: v, featured: v ? form.featured : false })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="cursor-default block" style={{ fontSize: "0.85rem" }}>Featured</Label>
                    <p className="text-ink-40 mt-0.5" style={{ fontSize: "0.72rem" }}>Show in the website's Featured strip. Requires Published.</p>
                  </div>
                  <Switch
                    checked={form.featured ?? false}
                    disabled={!(form.published ?? false)}
                    onCheckedChange={(v) => setForm({ ...form, featured: v })}
                  />
                </div>
              </div>
            )}
            <div className="col-span-2">
              <Label className="mb-1.5 block">Description</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Specification, history, condition…"
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <Label className="mb-1.5 block">Photos</Label>
              <p className="text-ink-40 mb-2" style={{ fontSize: "0.72rem" }}>
                Upload images from your device. The first is the cover. {ALLOWED_IMAGE_LABEL}, up to 10&nbsp;MB each.
              </p>

              {/* Picker / drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); if (uploadShowroomId) setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => uploadShowroomId && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && uploadShowroomId) { e.preventDefault(); fileInputRef.current?.click(); } }}
                aria-disabled={!uploadShowroomId}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                  !uploadShowroomId
                    ? "border-border opacity-60 cursor-not-allowed"
                    : dragOver
                    ? "border-accent bg-accent/5 cursor-pointer"
                    : "border-border hover:border-accent/40 cursor-pointer"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  multiple
                  className="hidden"
                  disabled={!uploadShowroomId}
                  onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ""; }}
                />
                <Upload size={18} className="text-ink-40" />
                <span className="text-ink-60" style={{ fontSize: "0.82rem" }}>
                  {uploadShowroomId ? "Drop images here, or click to browse" : "Select a showroom before uploading"}
                </span>
              </div>

              {/* In-flight / failed uploads */}
              {uploads.map((u) => (
                <div key={u.id} className="mt-2 flex items-center gap-2 rounded-md border border-border px-2.5 py-2" style={{ fontSize: "0.8rem" }}>
                  {u.error ? <AlertCircle size={14} className="shrink-0 text-signal-red" /> : <Loader2 size={14} className="shrink-0 animate-spin text-ink-40" />}
                  <span className="flex-1 truncate text-ink-60">{u.name}</span>
                  <span className={u.error ? "text-signal-red" : "text-ink-40"} style={{ fontSize: "0.72rem" }}>
                    {u.error ? u.error : "Uploading…"}
                  </span>
                  {u.error && (
                    <button type="button" onClick={() => dismissUpload(u.id)} aria-label="Dismiss" className="p-1 rounded text-ink-40 hover:text-noir"><X size={13} /></button>
                  )}
                </div>
              ))}

              {/* Uploaded thumbnails — cover (first) / drag-to-reorder / remove.
                  Capped height + overflow so a long list scrolls and lazy image
                  loading only decodes the visible rows. */}
              <div className="mt-2 max-h-[248px] overflow-y-auto pr-0.5">
                {photos.length === 0 && uploads.length === 0 ? (
                  <p className="text-ink-40" style={{ fontSize: "0.8rem" }}>No photos yet.</p>
                ) : (
                  <PhotoStrip photos={photos} onReorder={setPhotosOrder} onRemove={removePhoto} />
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 sm:justify-between">
            {editingId && onDelete && canDelete ? (
              <Button
                variant="ghost"
                className="text-signal-red hover:text-signal-red hover:bg-signal-red/5"
                onClick={() => { const id = editingId; cleanupSessionUploads(); setOpen(false); setEditingId(null); onDelete(id); }}
              >
                <Trash2 size={14} className="mr-1.5" />Delete
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              {uploadsInFlight() && <span className="text-ink-40" style={{ fontSize: "0.72rem" }}>Uploading…</span>}
              <Button variant="ghost" onClick={closeForm}>Cancel</Button>
              <Button className="bg-noir text-white hover:bg-noir-700" onClick={submit} disabled={uploadsInFlight()}>
                {editingId ? "Save changes" : "Add to collection"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
