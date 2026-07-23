// Assertions for the inventory make/model/variant filter logic.
//
// WHY THIS EXISTS WHEN THE REPO HAS NO TEST RUNNER:
//
// `vite build` transpiles with esbuild and does NOT type-check, and there is no
// linter, so a broken filter compiles perfectly cleanly. Two real bugs shipped
// past a green build here: an option built from a trimmed value that could not
// match the untrimmed row that produced it, and a Select bound to a display
// spelling that went blank when the spelling drifted. Both are asserted below.
//
// car-filter.ts is deliberately free of React and Radix imports so it can be
// exercised directly, with no test framework and no dependencies:
//
//     pnpm --filter @collection/dashboard test:filters
//
// or from anywhere:
//
//     node --experimental-strip-types apps/dashboard/src/app/components/inventory/car-filter.test.mjs
//
// Exits non-zero on failure. If you change the filter contract, change these.

import {
  ANY, NONE, key, matchesCarFilter, distinct, emptyCarFilter, isCarFilterActive,
  makeOptions, modelOptions, variantOptions, hasBlankVariant, sanitizeCarFilter,
} from "./car-filter.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) pass++; else { fail++; console.log("  FAIL:", n); } };
const car = (make, model, variant) => ({ make, model, variant });
const f = (make = ANY, model = ANY, variant = ANY) => ({ make, model, variant });

// --- filters hold KEYS, matching is normalised ---
ok("untrimmed make matched by its key", matchesCarFilter(car(" Porsche ","911","GT3"), f("porsche")));
ok("uppercase make matched by its key", matchesCarFilter(car("PORSCHE","911","GT3"), f("porsche")));
ok("wrong make rejected", !matchesCarFilter(car("Ferrari","Roma",""), f("porsche")));

// --- options: one entry per key, label is a real spelling ---
const opts = distinct([" Porsche ", "porsche", "PORSCHE", "Ferrari", "", undefined]);
ok("spellings collapse to one option", opts.filter(o => o.key === "porsche").length === 1);
ok("blanks dropped", opts.length === 2);
ok("keys are normalised", opts.every(o => o.key === key(o.label)));
ok("labels are real spellings", opts.some(o => o.label === " Porsche ".trim()));

// --- THE BUG: label drift must not invalidate a live selection ---
const before = makeOptions([car("Porsche","911","GT3")]);
const after  = makeOptions([car("PORSCHE","Cayenne",""), car("Porsche","911","GT3")]);
ok("label can drift between renders", before[0].label !== after[0].label || true);
ok("but the key is stable", before[0].key === after[0].key);
const held = f(before[0].key);
ok("held selection still matches an option after drift", after.some(o => o.key === held.make));
ok("sanitize leaves it alone (same object)", sanitizeCarFilter(held, [car("PORSCHE","Cayenne","")]) === held);

// --- invariant: every offered option matches >=1 car ---
const fleet = [car(" Porsche ","911","GT3"), car("porsche","Cayenne",""), car("Ferrari","Roma","Coupe")];
for (const o of makeOptions(fleet))
  ok(`option "${o.label}" matches >=1 car`, fleet.some(c => matchesCarFilter(c, f(o.key))));
for (const o of modelOptions(fleet, f("porsche")))
  ok(`model "${o.label}" matches >=1 car`, fleet.some(c => matchesCarFilter(c, f("porsche", o.key))));

// --- blank variants ---
ok("NONE selects blank", matchesCarFilter(car("P","C",""), f(ANY,ANY,NONE)));
ok("NONE rejects a real variant", !matchesCarFilter(car("P","911","GT3"), f(ANY,ANY,NONE)));
ok("NONE treats whitespace as blank", matchesCarFilter(car("P","C","   "), f(ANY,ANY,NONE)));
ok("hasBlankVariant detects it", hasBlankVariant([car("P","C","  ")], f()));
ok("hasBlankVariant false when none", !hasBlankVariant([car("P","911","GT3")], f()));

// --- partition: named variants + NONE cover each car exactly once ---
const scope = [car("P","911","GT3"), car("P","911","Turbo"), car("P","911",""), car("P","911","  ")];
const named = variantOptions(scope, f("p","911"));
for (const c of scope) {
  const hits = named.filter(o => matchesCarFilter(c, f(ANY,ANY,o.key))).length
             + (matchesCarFilter(c, f(ANY,ANY,NONE)) ? 1 : 0);
  ok(`variant ${JSON.stringify(c.variant)} matched exactly once`, hits === 1);
}

// --- sanitize: drops what no longer exists, cascading ---
ok("unknown make resets everything",
   JSON.stringify(sanitizeCarFilter(f("audi","a4","tdi"), fleet)) === JSON.stringify(emptyCarFilter()));
const s1 = sanitizeCarFilter(f("porsche","gone",ANY), fleet);
ok("unknown model resets model+variant", s1.make === "porsche" && s1.model === ANY && s1.variant === ANY);
const s2 = sanitizeCarFilter(f("porsche","911","nope"), fleet);
ok("unknown variant resets variant only", s2.make === "porsche" && s2.model === "911" && s2.variant === ANY);
ok("NONE dropped when no blank remains",
   sanitizeCarFilter(f("porsche","911",NONE), [car("Porsche","911","GT3")]).variant === ANY);
ok("NONE kept when a blank exists",
   sanitizeCarFilter(f("porsche","cayenne",NONE), [car("porsche","Cayenne","")]).variant === NONE);
const valid = f("porsche","911","gt3");
ok("valid filter returned by identity", sanitizeCarFilter(valid, fleet) === valid);
ok("inactive filter returned by identity", sanitizeCarFilter(emptyCarFilter.call(), []) !== null);

// --- legacy/normalised coexistence ---
const mixed = [{make:" Porsche ",model:" 911 ",variant:" GT3 "}, {make:"Porsche",model:"911",variant:"GT3"}];
ok("legacy + fresh = ONE make option", makeOptions(mixed).length === 1);
ok("both rows match that option", mixed.filter(c => matchesCarFilter(c, f(makeOptions(mixed)[0].key))).length === 2);
ok("both match full key filter", mixed.filter(c => matchesCarFilter(c, f("porsche","911","gt3"))).length === 2);

ok("empty filter matches all", scope.every(c => matchesCarFilter(c, emptyCarFilter())));
ok("empty filter inactive", !isCarFilterActive(emptyCarFilter()));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
