// @collection/shared — the shared car data layer.
//
// Single source of truth for the car domain: the `Car` type (car.ts), the
// Supabase client (supabase.ts), and the inventory queries/mutations
// (inventory.ts). Consumed as TS SOURCE (no build step / no dist) so each
// consuming app's Vite compiles it and inlines that app's own
// import.meta.env.VITE_* — required for the Supabase credentials to resolve
// per-app.
export * from "./car";
export * from "./supabase";
export * from "./inventory";
export * from "./auth";
export * from "./showrooms";
export * from "./notifications";
export * from "./storage";
export * from "./enquiries";
export * from "./partners";
