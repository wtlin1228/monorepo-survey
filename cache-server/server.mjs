#!/usr/bin/env node
// A from-scratch remote build cache: a dumb content-addressed blob store over HTTP.
//
//   GET /v1/artifacts/<key>        -> blob | 404          (open read)
//   PUT /v1/artifacts/<key>        -> 201                 (requires write token)
//
// Keys are cache-key hashes computed by scripts/cached-run.mjs. The server
// knows nothing about tasks or packages — that's the point: all intelligence
// lives in the key computation on the client.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT ?? 4874;
const TOKEN = process.env.CACHE_WRITE_TOKEN ?? "local-ci-token";
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "storage");
fs.mkdirSync(DIR, { recursive: true });

const KEY_RE = /^[a-f0-9]{64}(\.tar\.gz|\.json)?$/;

const server = http.createServer((req, res) => {
  const match = req.url.match(/^\/v1\/artifacts\/([^/]+)$/);
  if (req.url === "/v1/ping") {
    res.writeHead(200).end("ok");
    return;
  }
  if (!match || !KEY_RE.test(match[1])) {
    res.writeHead(400).end("bad request");
    return;
  }
  const file = path.join(DIR, match[1]);

  if (req.method === "GET") {
    if (!fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
    return;
  }

  if (req.method === "PUT") {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401).end("write token required");
      return;
    }
    const tmp = `${file}.tmp-${process.pid}`;
    const out = fs.createWriteStream(tmp);
    req.pipe(out);
    out.on("finish", () => {
      fs.renameSync(tmp, file);
      res.writeHead(201).end();
    });
    out.on("error", () => {
      fs.rmSync(tmp, { force: true });
      res.writeHead(500).end();
    });
    return;
  }

  res.writeHead(405).end();
});

// Builds can take many seconds between a client's cache lookup and its upload
// on the same pooled connection; the 5s default would close it in between.
server.keepAliveTimeout = 120_000;

server.listen(PORT, () => console.log(`remote cache listening on http://localhost:${PORT}`));
