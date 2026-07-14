import { useEffect, useState } from "react";
import { listInventory, type Car } from "./cars";

export type LoadState = "loading" | "error" | "ready";

/**
 * Loads the full live inventory from Supabase (via @collection/shared) once,
 * with a retry. Every car is returned — available, reserved, and sold — so the
 * caller decides visibility and ordering.
 */
export function useInventory() {
  const [cars, setCars] = useState<Car[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState("loading");
    // A hung request should surface the calm error state, not skeletons forever.
    const timer = setTimeout(() => {
      if (alive) setState("error");
    }, 12000);
    listInventory()
      .then((c) => {
        if (alive) {
          clearTimeout(timer);
          setCars(c);
          setState("ready");
        }
      })
      .catch(() => {
        if (alive) {
          clearTimeout(timer);
          setState("error");
        }
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [nonce]);

  return { cars, state, retry: () => setNonce((n) => n + 1) };
}
