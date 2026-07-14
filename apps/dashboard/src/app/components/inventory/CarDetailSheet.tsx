import { Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Button } from "../ui/button";
import { StatusPill } from "../common/StatusPill";
import { CarGallery } from "./CarGallery";
import type { Car, CarStatus } from "@collection/shared";
import { formatCurrency } from "../../data/mock";

const STATUSES: CarStatus[] = ["available", "reserved", "sold"];

interface Props {
  car: Car | null;
  /** In the admin "All showrooms" overview the sheet is view-only. */
  readOnly?: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: CarStatus) => void;
  onDelete: (id: string) => void;
}

/**
 * App-level detail view for a single car, following the CustomerProfileSheet /
 * NotificationsSheet pattern. Additive to the inventory card — the card keeps
 * its own inline status toggle.
 */
export function CarDetailSheet({ car, readOnly = false, onClose, onEdit, onStatusChange, onDelete }: Props) {
  if (!car) {
    return (
      <Sheet open={false} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const photos = car.photos?.length ? car.photos : car.image ? [car.image] : [];
  const specs: [string, string][] = [
    ["Make", car.make],
    ["Model", car.model],
    ["Variant", car.variant || "—"],
    ["Year", String(car.year)],
    ["Mileage", `${car.mileageKm.toLocaleString()} km`],
    ["Colour", car.colour || "—"],
  ];

  return (
    <Sheet open={!!car} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b border-border">
          <div className="eyebrow mb-2">The Collection</div>
          <SheetTitle className="editorial" style={{ fontSize: "1.5rem" }}>
            {car.year} {car.make} {car.model}
          </SheetTitle>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-ink-60" style={{ fontSize: "0.9rem" }}>{car.variant}</span>
            <StatusPill tone={car.status as "available" | "reserved" | "sold"} />
          </div>
        </SheetHeader>

        <div className="p-6 border-b border-border">
          <CarGallery photos={photos} alt={`${car.make} ${car.model}`} />
        </div>

        <section className="p-6 border-b border-border">
          <div className="text-noir mb-4" style={{ fontSize: "1.5rem", fontWeight: 500 }}>
            {formatCurrency(car.price, car.currency)}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {specs.map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow mb-0.5">{k}</dt>
                <dd className="text-noir" style={{ fontSize: "0.9rem" }}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {car.description && (
          <section className="p-6 border-b border-border">
            <div className="eyebrow mb-2">Description</div>
            <p className="text-ink-60" style={{ fontSize: "0.92rem", lineHeight: 1.6 }}>
              {car.description}
            </p>
          </section>
        )}

        {!readOnly && (
        <section className="p-6 space-y-3">
          <div>
            <div className="eyebrow mb-2">Status</div>
            <div className="flex items-center gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(car.id, s)}
                  className={`flex-1 py-1.5 rounded border ${car.status === s ? "bg-noir text-white border-noir" : "border-border text-ink-60 hover:border-accent/40"}`}
                  style={{ fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 bg-noir text-white hover:bg-noir-700" onClick={() => onEdit(car.id)}>
              <Pencil size={14} className="mr-1.5" />Edit
            </Button>
            <Button
              variant="ghost"
              className="text-signal-red hover:text-signal-red hover:bg-signal-red/5 border border-border"
              onClick={() => onDelete(car.id)}
            >
              <Trash2 size={14} className="mr-1.5" />Delete
            </Button>
          </div>
        </section>
        )}
      </SheetContent>
    </Sheet>
  );
}
