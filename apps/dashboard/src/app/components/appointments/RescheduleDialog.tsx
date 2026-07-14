import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";

interface Props {
  open: boolean;
  currentAt?: string;
  onCancel: () => void;
  onConfirm: (iso: string) => void;
}

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 19; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export function RescheduleDialog({ open, currentAt, onCancel, onConfirm }: Props) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("11:00");

  useEffect(() => {
    if (!open) return;
    const d = currentAt ? new Date(currentAt) : new Date();
    setDate(d);
    setTime(`${String(d.getHours()).padStart(2, "0")}:${d.getMinutes() < 30 ? "00" : "30"}`);
  }, [open, currentAt]);

  const submit = () => {
    if (!date) return;
    const [h, m] = time.split(":").map(Number);
    const next = new Date(date);
    next.setHours(h, m, 0, 0);
    onConfirm(next.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="editorial">Reschedule viewing</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <div className="rounded-md border border-border p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().toDateString())}
            />
          </div>
          <div className="mt-4">
            <div className="eyebrow mb-2">Time</div>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t} value={t}>{fmtTime(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button className="bg-noir text-white hover:bg-noir-700" onClick={submit} disabled={!date}>
            Confirm new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
