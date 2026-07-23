interface Props {
  /** Optional: omit for a screen whose title needs no kicker above it. The
   *  accent rule stays either way — it is the brand mark on every screen. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, subtitle, action }: Props) {
  return (
    <header className="flex items-end justify-between gap-6 mb-6">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <div className="accent-rule mb-3" />
        <h1>{title}</h1>
        {subtitle && <p className="text-ink-60 mt-1.5" style={{ fontSize: "0.9rem" }}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
