import { test } from "node:test";
import assert from "node:assert/strict";
import { niceScale, delta, compact, compactMoney, money, ageLabel } from "../../src/components/Dashboard/analytics/viz.ts";

test("niceScale picks round tops and evenly spaced ticks", () => {
  assert.deepEqual(niceScale(0).ticks, [0, 1]);
  assert.deepEqual(niceScale(97), { max: 100, ticks: [0, 25, 50, 75, 100] });
  const s = niceScale(3420);
  assert.deepEqual(s, { max: 4000, ticks: [0, 1000, 2000, 3000, 4000] });
  const steps = s.ticks.slice(1).map((t, i) => t - s.ticks[i]);
  assert.ok(steps.every((x) => x === steps[0]), "ticks evenly spaced");
  for (const m of [0.4, 7, 13, 999, 12000, 5e6, 1234567]) assert.ok(niceScale(m).max >= m, `max covers ${m}`);
});

test("delta compares with the previous period without dividing by zero", () => {
  assert.deepEqual(delta(150, 100), { text: "50%", dir: "up" });
  assert.deepEqual(delta(50, 100), { text: "50%", dir: "down" });
  assert.deepEqual(delta(100, 100), { text: "0%", dir: "flat" });
  assert.deepEqual(delta(0, 0), { text: "no change", dir: "flat" });
  assert.deepEqual(delta(25, 0), { text: "new", dir: "up" });
  assert.deepEqual(delta(0, 40), { text: "100%", dir: "down" });
  assert.equal(delta(1234, 100).text, "1134%");
  assert.equal(delta(-50, -100).dir, "up"); // a smaller loss is an improvement
});

test("compact number formats", () => {
  assert.equal(compact(950), "950");
  assert.equal(compact(1000), "1K");
  assert.equal(compact(1250), "1.3K");
  assert.equal(compact(1_250_000), "1.3M");
  assert.equal(compactMoney(-2500), "-$2.5K");
  assert.equal(money(1234.5), "$1,235");
  assert.equal(money(null), "—");
});

test("ageLabel", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  assert.equal(ageLabel("2026-10-14T11:40:00Z", now), "under 1h");
  assert.equal(ageLabel("2026-10-14T00:00:00Z", now), "12h");
  assert.equal(ageLabel("2026-10-10T08:00:00Z", now), "4d 4h");
  assert.equal(ageLabel(null, now), "—");
});
