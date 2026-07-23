import { useState } from "react";
import { Plus, MoreHorizontal, KeyRound, Trash2, RotateCw, Store, Car as CarIcon } from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "../ui/alert-dialog";
import { PartnerForm } from "../partners/PartnerForm";
import { PasswordField } from "../partners/PasswordField";
import { MIN_PASSWORD_LENGTH } from "../partners/password";
import type { Partner, CreatePartnerInput } from "@collection/shared";

interface Props {
  partners: Partner[];
  loading?: boolean;
  error?: string | null;
  onReload: () => void;
  onCreate: (input: CreatePartnerInput) => void;
  onSetVisibility: (showroomId: string, canViewMaster: boolean) => void;
  onResetPassword: (userId: string, password: string) => void;
  /** force = the showroom still holds cars and the operator confirmed anyway. */
  onRemove: (showroomId: string, force: boolean) => void;
  /** Set while a mutation is in flight, so the form can show progress. */
  busy?: boolean;
}

export function Partners({
  partners, loading, error, onReload,
  onCreate, onSetVisibility, onResetPassword, onRemove, busy = false,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [resetFor, setResetFor] = useState<{ userId: string; email: string } | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Partner | null>(null);

  const submitReset = () => {
    if (!resetFor || resetPw.length < MIN_PASSWORD_LENGTH) return;
    onResetPassword(resetFor.userId, resetPw);
    setResetFor(null);
    setResetPw("");
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-8 py-6">
      <SectionHeader
        eyebrow="Showrooms"
        title="Partners"
        subtitle="Partner showrooms, their sign-in, and what they are allowed to see."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-1.5" /> Add partner
          </Button>
        }
      />

      {loading && <p className="text-ink-40" style={{ fontSize: "0.9rem" }}>Loading partners…</p>}

      {!loading && error && (
        <div className="rounded-lg border border-card-border bg-white p-6 text-center">
          <p className="text-ink-60" style={{ fontSize: "0.9rem" }}>{error}</p>
          <Button variant="outline" className="mt-4" onClick={onReload}>
            <RotateCw size={15} className="mr-1.5" /> Try again
          </Button>
        </div>
      )}

      {!loading && !error && partners.length === 0 && (
        <div className="rounded-lg border border-card-border bg-white p-10 text-center">
          <Store size={22} className="mx-auto text-ink-40" strokeWidth={1.5} />
          <h3 className="mt-3">No partner showrooms yet</h3>
          <p className="text-ink-40 mt-1.5" style={{ fontSize: "0.85rem" }}>
            Add one and The Collection sets their sign-in for them.
          </p>
          <Button className="mt-5" onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-1.5" /> Add partner
          </Button>
        </div>
      )}

      {!loading && !error && partners.length > 0 && (
        <div className="grid gap-3">
          {partners.map((p) => (
            <div key={p.id} className="rounded-lg border border-card-border bg-white p-4 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate">{p.name}</h3>
                  <div className="text-ink-40 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: "0.78rem" }}>
                    <span>/{p.slug}</span>
                    <span className="inline-flex items-center gap-1">
                      <CarIcon size={12} /> {p.carCount} {p.carCount === 1 ? "car" : "cars"}
                    </span>
                    {!p.isActive && <span className="text-signal-amber">Inactive</span>}
                  </div>
                  <div className="mt-2" style={{ fontSize: "0.85rem" }}>
                    {p.accounts.length === 0 ? (
                      <span className="text-signal-amber">No login provisioned</span>
                    ) : (
                      p.accounts.map((a) => (
                        <div key={a.id} className="text-ink-60 truncate">{a.email}</div>
                      ))
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  {/* Styled directly rather than `asChild` + <Button>: Button is a
                      plain function component (no forwardRef) and this app runs
                      React 18, where a function component cannot receive a ref — so
                      Radix's Slot cannot wire the trigger and the menu never opens.
                      This is the same idiom Matching uses. */}
                  <DropdownMenuTrigger
                    className="shrink-0 p-1.5 rounded-md text-ink-40 hover:text-noir hover:bg-platinum-soft transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={`Actions for ${p.name}`}
                  >
                    <MoreHorizontal size={18} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={p.accounts.length === 0}
                      onClick={() => {
                        const a = p.accounts[0];
                        if (a) { setResetPw(""); setResetFor({ userId: a.id, email: a.email }); }
                      }}
                    >
                      <KeyRound size={14} className="mr-2" /> Reset password
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-signal-red focus:text-signal-red"
                      onClick={() => setRemoveTarget(p)}
                    >
                      <Trash2 size={14} className="mr-2" /> Remove partner
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 pt-3 border-t border-card-border flex items-center justify-between gap-4">
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    Can view The Collection&rsquo;s inventory
                  </div>
                  <p className="text-ink-40 mt-0.5" style={{ fontSize: "0.75rem" }}>
                    Read-only — they can never edit, publish or feature your cars.
                  </p>
                </div>
                <Switch
                  checked={p.canViewMaster}
                  onCheckedChange={(v) => onSetVisibility(p.id, v)}
                  aria-label={`Let ${p.name} view The Collection's inventory`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <PartnerForm
        open={addOpen}
        busy={busy}
        onClose={() => setAddOpen(false)}
        onSubmit={(input) => { onCreate(input); setAddOpen(false); }}
      />

      {/* Reset password */}
      <Dialog open={!!resetFor} onOpenChange={(o) => { if (!o) { setResetFor(null); setResetPw(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Sets a new password for {resetFor?.email}. They are not notified — pass it on yourself.
            </DialogDescription>
          </DialogHeader>
          <PasswordField value={resetPw} onChange={setResetPw} label="New password" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResetFor(null); setResetPw(""); }}>Cancel</Button>
            <Button onClick={submitReset} disabled={resetPw.length < MIN_PASSWORD_LENGTH || busy}>
              Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove partner */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && removeTarget.carCount > 0 ? (
                <>
                  This permanently deletes <strong>{removeTarget.carCount} car
                  {removeTarget.carCount === 1 ? "" : "s"}</strong> and their uploaded photos,
                  along with the showroom and its sign-in. This cannot be undone.
                </>
              ) : (
                <>
                  This deletes the showroom and its sign-in. It holds no cars, so nothing
                  else is removed. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-signal-red text-cream hover:bg-signal-red/90"
              onClick={() => {
                if (removeTarget) onRemove(removeTarget.id, removeTarget.carCount > 0);
                setRemoveTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
