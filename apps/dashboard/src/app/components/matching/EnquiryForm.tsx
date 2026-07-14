import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import type { Enquiry, EnquiryInput, EnquiryType, EnquiryChannel } from "@collection/shared";
import { channelLabel, ENQUIRY_CHANNELS } from "./channel";

interface Props {
  open: boolean;
  type: EnquiryType;
  /** When set, the form edits this enquiry instead of creating a new one. */
  editing?: Enquiry | null;
  onClose: () => void;
  onSubmit: (input: EnquiryInput) => void;
}


interface FormState {
  customerName: string; customerPhone: string; channel: string;
  make: string; model: string; variant: string; year: string; color: string;
  mileage: string; docs: boolean; price: string; notes: string;
}
// New inquiries default to Walk-in + docs ON (most common: an in-person client
// with full papers). Both are editable.
const empty = (): FormState => ({
  customerName: "", customerPhone: "", channel: "walk_in",
  make: "", model: "", variant: "", year: "", color: "",
  mileage: "", docs: true, price: "", notes: "",
});

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function EnquiryForm({ open, type, editing, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(empty());
  const isBuying = type === "buying";

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerName: editing.customerName,
        customerPhone: editing.customerPhone,
        channel: editing.channel ?? "",
        make: editing.make,
        model: editing.model,
        variant: editing.variant ?? "",
        year: editing.year != null ? String(editing.year) : "",
        color: editing.color ?? "",
        mileage: (isBuying ? editing.mileageMaxKm : editing.mileageKm) != null
          ? String(isBuying ? editing.mileageMaxKm : editing.mileageKm) : "",
        docs: editing.docsComplete === true,
        price: editing.price != null ? String(editing.price) : "",
        notes: editing.notes ?? "",
      });
    } else {
      setForm(empty());
    }
  }, [open, editing, isBuying]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.make.trim() || !form.model.trim()) return;
    const mileage = numOrNull(form.mileage);
    const input: EnquiryInput = {
      type,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      channel: (form.channel || null) as EnquiryChannel | null,
      make: form.make,
      model: form.model,
      variant: form.variant,
      year: numOrNull(form.year),
      color: form.color,
      // buying: docs REQUIRES(true)/any(null); selling: HAS(true)/hasn't(false)
      docsComplete: isBuying ? (form.docs ? true : null) : form.docs,
      price: numOrNull(form.price),
      notes: form.notes,
      ...(isBuying ? { mileageMaxKm: mileage } : { mileageKm: mileage }),
    };
    onSubmit(input);
  };

  const title = editing ? `Edit ${type} inquiry` : isBuying ? "New buying inquiry" : "New selling inquiry";
  const canSubmit = form.customerName.trim() && form.customerPhone.trim() && form.make.trim() && form.model.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="editorial">{title}</DialogTitle>
          <p className="text-ink-60 mt-1" style={{ fontSize: "0.82rem" }}>
            {isBuying ? "Someone wanting to buy — the criteria to match against stock and sellers." : "Someone offering a car to the dealership — a car out in the market."}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2 eyebrow text-ink-40">Customer</div>
          <div><Label className="mb-1.5 block">Name</Label><Input value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} placeholder="Hassan Raza" /></div>
          <div><Label className="mb-1.5 block">Phone</Label><Input value={form.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} placeholder="+92 300 1234567" /></div>
          <div className="col-span-2">
            <Label className="mb-1.5 block">Channel</Label>
            <Select value={form.channel || undefined} onValueChange={(v) => set({ channel: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{ENQUIRY_CHANNELS.map((c) => <SelectItem key={c} value={c}>{channelLabel(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="col-span-2 eyebrow text-ink-40 mt-1">{isBuying ? "Desired car" : "The car"}</div>
          <div><Label className="mb-1.5 block">Make</Label><Input value={form.make} onChange={(e) => set({ make: e.target.value })} placeholder="Porsche" /></div>
          <div><Label className="mb-1.5 block">Model</Label><Input value={form.model} onChange={(e) => set({ model: e.target.value })} placeholder="911" /></div>
          <div className="col-span-2"><Label className="mb-1.5 block">Variant <span className="text-ink-40">(optional)</span></Label><Input value={form.variant} onChange={(e) => set({ variant: e.target.value })} placeholder="GT3 Touring" /></div>
          <div><Label className="mb-1.5 block">{isBuying ? "Min year" : "Year"}</Label><Input type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} placeholder="2021" /></div>
          <div><Label className="mb-1.5 block">Colour <span className="text-ink-40">(optional)</span></Label><Input value={form.color} onChange={(e) => set({ color: e.target.value })} placeholder="GT Silver" /></div>
          <div><Label className="mb-1.5 block">{isBuying ? "Max mileage (km)" : "Mileage (km)"}</Label><Input type="number" value={form.mileage} onChange={(e) => set({ mileage: e.target.value })} placeholder={isBuying ? "20000" : "8400"} /></div>
          <div><Label className="mb-1.5 block">{isBuying ? "Budget (PKR)" : "Asking price (PKR)"}</Label><Input type="number" value={form.price} onChange={(e) => set({ price: e.target.value })} /></div>
          <div className="col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <Label className="cursor-default" style={{ fontSize: "0.85rem" }}>
              {isBuying ? "Requires complete original documents" : "Has complete original documents"}
            </Label>
            <Switch checked={form.docs} onCheckedChange={(v) => set({ docs: v })} />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block">Notes <span className="text-ink-40">(optional)</span></Label>
            <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Condition, urgency, context…" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-noir text-white hover:bg-noir-700" onClick={submit} disabled={!canSubmit}>
            {editing ? "Save changes" : "Create inquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
