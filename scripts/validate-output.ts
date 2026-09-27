import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { projectRoot } from "./paths.ts";

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? files(path) : Promise.resolve([path]);
      })
    )
  ).flat();
}

const outputFiles = await files(resolve(projectRoot, "dist"));
for (const file of outputFiles) {
  const extension = extname(file);
  if (![".html", ".js", ".css"].includes(extension)) continue;
  const content = await readFile(file, "utf8");
  if (extension === ".html" && /(?:src|href)="https?:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)/.test(content)) {
    throw new Error(`${file}: production output references a public CDN`);
  }
  if (extension === ".html" && !/<html[^>]+lang="pt-BR"/.test(content)) {
    throw new Error(`${file}: expected html lang=\"pt-BR\"`);
  }
}

process.stdout.write(`Validated locale and local assets in ${outputFiles.length} output files.\n`);
