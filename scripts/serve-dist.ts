import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { projectRoot } from "./paths.ts";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const requestedPath = resolve(projectRoot, "dist", `.${pathname}`);
  const candidate = (await stat(requestedPath).catch(() => undefined))?.isDirectory()
    ? resolve(requestedPath, "index.html")
    : requestedPath;
  const metadata = await stat(candidate).catch(() => undefined);
  if (!metadata?.isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": contentTypes[extname(candidate)] ?? "application/octet-stream" });
  createReadStream(candidate).pipe(response);
}).listen(4321, "127.0.0.1", () => process.stdout.write("Preview ready at http://127.0.0.1:4321\n"));
