import { useEffect, useState } from "react";
import { listInventory, MASTER_SHOWROOM_ID, type Car } from "./cars";

export type LoadState = "loading" | "error" | "ready";

/**
 * Loads the live inventory the public website is allowed to show, once, with a
 * retry. The real boundary is RLS: the anon key only ever reads The Collection's
 * PUBLISHED cars (migration 0015). The explicit `showroomId` scope here is
 * belt-and-braces — it re-asserts "The Collection only" on the client so a partner
 * car can never surface even if that policy regressed. Status is NOT filtered:
 * published available, reserved and sold all show (the caller orders/filters).
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
    listInventory({ showroomId: MASTER_SHOWROOM_ID })
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
