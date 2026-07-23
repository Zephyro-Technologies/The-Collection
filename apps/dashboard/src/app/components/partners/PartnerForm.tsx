import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { PasswordField } from "./PasswordField";
import { MIN_PASSWORD_LENGTH } from "./password";
import type { CreatePartnerInput } from "@collection/shared";

interface Props {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePartnerInput) => void;
}

const empty = () => ({ name: "", email: "", password: "", canViewMaster: false });

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function PartnerForm({ open, busy = false, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(empty());

  useEffect(() => { if (open) setForm(empty()); }, [open]);

  const set = (patch: Partial<ReturnType<typeof empty>>) => setForm((f) => ({ ...f, ...patch }));

  const valid =
    form.name.trim().length > 0 &&
    isEmail(form.email) &&
    form.password.length >= MIN_PASSWORD_LENGTH;

  const submit = () => {
    if (!valid || busy) return;
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      canViewMaster: form.canViewMaster,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a partner showroom</DialogTitle>
          <DialogDescription>
            Creates the showroom and its login together. The partner signs in with the
            email and password you set here.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="partner-name">Showroom name</Label>
            <Input
              id="partner-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Vehicles in Veranda"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="partner-email">Partner email</Label>
            <Input
              id="partner-email"
              type="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="partner@example.pk"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-ink-40" style={{ fontSize: "0.75rem" }}>
              This becomes their sign-in. It is confirmed automatically — there is no invite email.
            </p>
          </div>

          <PasswordField value={form.password} onChange={(password) => set({ password })} />

          <div className="flex items-start justify-between gap-4 rounded-lg border border-card-border p-3">
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Can view The Collection&rsquo;s inventory
              </div>
              <p className="text-ink-40 mt-0.5" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                Read-only. They can see your stock but never edit, publish or feature it.
                You can change this at any time.
              </p>
            </div>
            <Switch
              checked={form.canViewMaster}
              onCheckedChange={(canViewMaster) => set({ canViewMaster })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || busy}>
            {busy ? "Creating…" : "Create partner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
