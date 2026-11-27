import { createServer } from "node:http";
import { createStore } from "./notes.js";

function send(res, status, value) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("invalid JSON"), { status: 400 }); }
}

export function createApp(store = createStore()) {
  return createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      if (req.method === "GET" && pathname === "/health") return send(res, 200, { ok: true });
      if (req.method === "GET" && pathname === "/notes") return send(res, 200, store.list());
      if (req.method === "POST" && pathname === "/notes") return send(res, 201, store.add(await readJson(req)));
      const m = pathname.match(/^\/notes\/(\d+)$/);
      if (req.method === "GET" && m) {
        const note = store.get(Number(m[1]));
        return note ? send(res, 200, note) : send(res, 404, { error: "not found" });
      }
      send(res, 404, { error: "not found" });
    } catch (err) {
      send(res, err.status ?? 500, { error: err.status ? err.message : "internal error" });
    }
  });
}
