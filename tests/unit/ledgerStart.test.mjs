import { test } from "node:test";
import assert from "node:assert/strict";
import { ledgerStart, clampFrom, DEFAULT_LEDGER_START } from "../../src/server/ledgerStart.ts";

test("defaults to 25 May 2026 (UTC) and can be overridden or switched off", () => {
  assert.equal(ledgerStart(undefined)?.toISOString(), "2026-05-25T00:00:00.000Z");
  assert.equal(DEFAULT_LEDGER_START, "2026-05-25");
  assert.equal(ledgerStart("2026-07-01")?.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(ledgerStart("off"), null);
  assert.equal(ledgerStart("garbage"), null);
});

test("an earlier or missing 'from' is raised to the start; a later one is kept", () => {
  const s = ledgerStart("2026-05-25");
  assert.equal(clampFrom(null, s), "2026-05-25T00:00:00.000Z");
  assert.equal(clampFrom("2026-01-01T00:00:00.000Z", s), "2026-05-25T00:00:00.000Z");
  assert.equal(clampFrom("2026-06-10T00:00:00.000Z", s), "2026-06-10T00:00:00.000Z");
  assert.equal(clampFrom("2026-01-01T00:00:00.000Z", null), "2026-01-01T00:00:00.000Z");
});
