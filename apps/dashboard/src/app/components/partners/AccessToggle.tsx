import { Switch } from "../ui/switch";

interface Props {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
  /** Boxed on the create form; bare in a list row that already has its own frame. */
  boxed?: boolean;
}

/**
 * One read-visibility axis. Used for both "can view The Collection's inventory"
 * (migration 0020) and "can view other partners' inventory" (0021), in the
 * create form and the partner list — one component so the two can never drift
 * into describing the same permission differently.
 */
export function AccessToggle({ title, description, checked, onChange, ariaLabel, boxed = false }: Props) {
  return (
    <div
      className={
        boxed
          ? "flex items-start justify-between gap-4 rounded-lg border border-card-border p-3"
          : "flex items-start justify-between gap-4"
      }
    >
      <div>
        <div style={{ fontSize: boxed ? "0.875rem" : "0.85rem", fontWeight: 500 }}>{title}</div>
        <p className="text-ink-40 mt-0.5" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={ariaLabel ?? title}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
