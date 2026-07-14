import { Wordmark } from "../brand/Wordmark";
import { navItems, type ViewKey } from "./nav-items";

interface Props {
  active: ViewKey;
  onSelect: (key: ViewKey) => void;
  counts: Partial<Record<ViewKey, number>>;
  urgent?: Partial<Record<ViewKey, boolean>>;
  /** Nav destinations for this role (partners get inventory only). */
  items?: typeof navItems;
}

export function Sidebar({ active, onSelect, counts, urgent, items = navItems }: Props) {
  return (
    <aside className="hidden md:flex flex-col bg-noir text-cream w-60 lg:w-64 shrink-0 h-screen sticky top-0">
      <div className="px-6 pt-8 pb-10 flex justify-center">
        <Wordmark variant="light" size="md" />
      </div>

      <nav className="flex-1 px-3">
        {items.map(({ key, label, Icon }) => {
          const isActive = active === key;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors text-left ${
                isActive
                  ? "bg-white/10 text-cream"
                  : "text-cream/70 hover:bg-white/5 hover:text-cream"
              }`}
            >
              {isActive && <span className="absolute left-0 w-0.5 h-6 bg-accent-on-dark rounded-r" style={{ marginLeft: "-12px" }} />}
              <Icon size={18} strokeWidth={1.75} />
              <span style={{ fontSize: "0.88rem", letterSpacing: "0.02em" }}>{label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full ${urgent?.[key] ? "bg-signal-red text-cream" : "bg-platinum-soft text-noir"}`}
                  style={{ fontSize: "0.65rem", fontWeight: 600 }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
