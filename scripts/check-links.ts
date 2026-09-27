import { access, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { projectRoot } from "./paths.ts";

const dist = resolve(projectRoot, "dist");

async function htmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory()
          ? htmlFiles(path)
          : Promise.resolve(extname(entry.name) === ".html" ? [path] : []);
      })
    )
  ).flat();
}

const files = await htmlFiles(dist);
const missing = new Set<string>();
for (const file of files) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = match[1].split("#")[0].split("?")[0];
    if (href.startsWith("//") || href === "/") continue;
    const target = href.endsWith("/")
      ? resolve(dist, `.${href}`, "index.html")
      : resolve(dist, `.${href}`);
    try {
      await access(target);
    } catch {
      missing.add(href);
    }
  }
}

if (missing.size > 0) {
  throw new Error(`Broken internal links:\n${[...missing].sort().join("\n")}`);
}
process.stdout.write(`Validated internal links in ${files.length} HTML files.\n`);
