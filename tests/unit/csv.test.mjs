import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../../src/server/csv.ts";

test("quotes commas, quotes and newlines; leaves numbers and plain text alone", () => {
  const out = toCsv(["a", "b"], [["x, y", 'say "hi"'], ["line1\nline2", 12.5], [null, -3]]);
  assert.equal(out, 'a,b\r\n"x, y","say ""hi"""\r\n"line1\nline2",12.5\r\n,-3\r\n');
});

test("neutralises spreadsheet formula injection in user-controlled text", () => {
  const out = toCsv(["name"], [["=HYPERLINK(\"http://evil\")"], ["+cmd|' /C calc'!A0"], ["@SUM(1)"], ["-2+3"], ["-5"], ["Ann"]]);
  const lines = out.trim().split("\r\n").slice(1);
  assert.ok(lines[0].startsWith(`"'=`));
  assert.ok(lines[1].startsWith(`"'+`) || lines[1].startsWith(`'+`));
  assert.ok(lines[2].startsWith(`'@`));
  assert.ok(lines[3].startsWith(`'-2+3`));
  assert.equal(lines[4], "-5");   // real negative numbers stay numeric
  assert.equal(lines[5], "Ann");
});
