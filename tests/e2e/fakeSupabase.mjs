// A tiny stand-in for Supabase's REST API (PostgREST), backed by a real Postgres engine (PGlite).
// It lets the REAL Next.js API handlers (and the real SQL functions) run in tests without a Supabase account.
// Supports only what the app uses: POST /rest/v1/rpc/<fn>, and single-table GET with eq./in. filters, order and limit.
import http from "node:http";

const ident = /^[a-z_][a-z0-9_]*$/;

const pgArray = (a) => `{${a.map((x) => (x === null ? "NULL" : `"${String(x).replace(/(["\\])/g, "\\$1")}"`)).join(",")}}`;
const toParam = (v) => (Array.isArray(v) ? pgArray(v) : v !== null && typeof v === "object" ? JSON.stringify(v) : v);

export function startFakeSupabase(db, port) {
  const server = http.createServer(async (req, res) => {
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    try {
      const url = new URL(req.url, "http://x");
      const chunks = []; for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();

      // ---- RPC
      const rpc = /^\/rest\/v1\/rpc\/([a-z_0-9]+)$/.exec(url.pathname);
      if (rpc && req.method === "POST") {
        const args = raw ? JSON.parse(raw) : {};
        const keys = Object.keys(args);
        if (!keys.every((k) => ident.test(k))) return send(400, { message: "bad arg name" });
        const sql = `select public.${rpc[1]}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`;
        try {
          const r = await db.query(sql, keys.map((k) => toParam(args[k])));
          return send(200, r.rows[0].r);
        } catch (e) {
          return send(400, { code: e.code, message: e.message, details: e.detail ?? null, hint: null });
        }
      }

      // ---- table reads
      const t = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
      if (t && (req.method === "GET" || req.method === "HEAD")) {
        const table = t[1];
        const where = [], params = [];
        let order = "", limit = "";
        for (const [k, v] of url.searchParams) {
          if (["select", "limit", "offset", "order"].includes(k)) continue;
          if (!ident.test(k)) return send(400, { message: "bad column" });
          const eq = /^eq\.(.*)$/.exec(v), inn = /^in\.\((.*)\)$/.exec(v);
          if (eq) { params.push(eq[1]); where.push(`${k}::text = $${params.length}`); }
          else if (inn) { const vals = inn[1].split(",").map((x) => x.replace(/^"|"$/g, "")); params.push(pgArray(vals)); where.push(`${k}::text = any($${params.length}::text[])`); }
        }
        const ord = url.searchParams.get("order");
        if (ord) order = " order by " + ord.split(",").map((o) => { const [c, d] = o.split("."); if (!ident.test(c)) throw new Error("bad order"); return `${c} ${d === "asc" ? "asc" : "desc"}`; }).join(", ");
        if (url.searchParams.get("limit")) limit = ` limit ${parseInt(url.searchParams.get("limit"), 10)}`;
        const sql = `select * from public.${table}${where.length ? " where " + where.join(" and ") : ""}${order}${limit}`;
        const r = await db.query(sql, params);
        const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
        if (wantsObject) return r.rows.length === 1 ? send(200, r.rows[0]) : send(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
        return send(200, r.rows, { "Content-Range": `0-${Math.max(0, r.rows.length - 1)}/${r.rows.length}` });
      }
      return send(404, { message: `fake supabase: unsupported ${req.method} ${url.pathname}` });
    } catch (e) {
      return send(500, { message: String(e.message || e) });
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
