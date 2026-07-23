import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { AccessToggle } from "./AccessToggle";
import { PasswordField } from "./PasswordField";
import { MIN_PASSWORD_LENGTH } from "./password";
import type { CreatePartnerInput } from "@collection/shared";

interface Props {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePartnerInput) => void;
}

const empty = () => ({
  name: "",
  email: "",
  password: "",
  canViewMaster: false,
  canViewPartners: false,
});

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
      canViewPartners: form.canViewPartners,
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

          <div className="grid gap-2.5">
            <AccessToggle
              boxed
              title="Can view The Collection&rsquo;s inventory"
              description="Read-only. They can see your stock but never edit, publish or feature it."
              checked={form.canViewMaster}
              onChange={(canViewMaster) => set({ canViewMaster })}
            />
            <AccessToggle
              boxed
              title="Can view other partners&rsquo; inventory"
              description="Read-only, and one-directional — this does not let other partners see them. Competing showrooms will be able to see each other's stock."
              checked={form.canViewPartners}
              onChange={(canViewPartners) => set({ canViewPartners })}
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
