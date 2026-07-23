import { navItems, type ViewKey } from "./nav-items";

interface Props {
  active: ViewKey;
  onSelect: (key: ViewKey) => void;
  counts: Partial<Record<ViewKey, number>>;
  urgent?: Partial<Record<ViewKey, boolean>>;
  /** Nav destinations for this role (partners get inventory only). */
  items?: typeof navItems;
}

export function BottomNav({ active, onSelect, counts, urgent, items = navItems }: Props) {
  // The bar is sized for six tabs at phone width. Items flagged desktopOnly
  // (Partners) stay in the sidebar rather than shrinking every other tab.
  const tabs = items.filter((i) => !i.desktopOnly);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-noir text-cream border-t border-white/10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ key, Icon, label, short }) => {
          const isActive = active === key;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative flex flex-col items-center justify-center gap-1 px-0.5 min-h-[3.25rem] ${
                isActive ? "text-cream" : "text-cream/55"
              }`}
            >
              {isActive && <span className="absolute top-0 w-8 h-0.5 bg-accent-on-dark rounded-b" />}
              <Icon size={19} strokeWidth={1.75} />
              <span className="whitespace-nowrap leading-none" style={{ fontSize: "0.62rem", letterSpacing: "0.02em" }}>
                {short ?? label}
              </span>
              {count !== undefined && count > 0 && (
                <span
                  className={`absolute top-1.5 right-1/4 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full ${urgent?.[key] ? "bg-signal-red text-cream" : "bg-platinum-soft text-noir"}`}
                  style={{ fontSize: "0.6rem", fontWeight: 600 }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
