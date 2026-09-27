import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";
import { generateDomainManifest } from "./domain-manifest.ts";
import { readJson } from "./files.ts";
import { projectRoot, contractSourcesPath } from "./paths.ts";
import { loadSourceRegistry } from "./source-registry.ts";
import { loadDataProvenance } from "./provenance.ts";
import { loadDomainSemantics } from "./semantics.ts";
import { validateKnowledgeBase } from "./validate-knowledge.ts";

type Frontmatter = {
  concepts?: string[];
  operations?: string[];
  officialSources?: string[];
};

type ContractSources = {
  sdk: { package: string; version: string };
};

async function contentFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory()
          ? contentFiles(path)
          : Promise.resolve(/\.mdx?$/.test(entry.name) ? [path] : []);
      })
    )
  ).flat();
}

const [manifest, registry, provenance, semantics, contractSources, packageJson] = await Promise.all([
  generateDomainManifest(),
  loadSourceRegistry(),
  loadDataProvenance(),
  loadDomainSemantics(),
  readJson<ContractSources>(contractSourcesPath),
  readJson<{ dependencies?: Record<string, string> }>(resolve(projectRoot, "package.json"))
]);
validateKnowledgeBase(manifest, registry, provenance, semantics);
const sourceIds = new Map([
  ...registry.families.map((source) => [source.id, source] as const),
  ...registry.sources.map((source) => [source.id, source] as const)
]);
const conceptNames = new Set(Object.keys(manifest.concepts));
const operationIds = new Set(
  Object.values(manifest.concepts).flatMap((concept) =>
    concept.operations.map((operation) => operation.operationId)
  )
);
const files = await contentFiles(resolve(projectRoot, "src/content/docs"));

for (const file of files) {
  const relative = file.slice(projectRoot.length + 1);
  const parsed = matter(await readFile(file, "utf8"));
  const data = parsed.data as Frontmatter;
  for (const concept of data.concepts ?? []) {
    if (!conceptNames.has(concept)) throw new Error(`${relative}: unknown concept ${concept}`);
  }
  for (const operation of data.operations ?? []) {
    if (!operationIds.has(operation)) {
      throw new Error(`${relative}: unknown operation ${operation}`);
    }
  }
  for (const sourceId of data.officialSources ?? []) {
    if (!sourceIds.has(sourceId)) throw new Error(`${relative}: unknown source ${sourceId}`);
  }
  const inlineSources = [...parsed.content.matchAll(/<SourceRef\s+[^>]*id=["']([^"']+)["']/g)].map(
    (match) => match[1]
  );
  for (const sourceId of inlineSources) {
    if (!sourceIds.has(sourceId)) throw new Error(`${relative}: unknown inline source ${sourceId}`);
    if (!(data.officialSources ?? []).includes(sourceId)) {
      throw new Error(`${relative}: inline source ${sourceId} is missing from officialSources`);
    }
  }
  if (relative.includes("src/content/docs/domain/") && (data.concepts?.length ?? 0) > 0) {
    const sources = (data.officialSources ?? []).map((id) => sourceIds.get(id));
    if (!sources.some((source) => source?.priority === "P0")) {
      throw new Error(`${relative}: domain pages require at least one P0 source`);
    }
  }
}

const installedSdk = packageJson.dependencies?.[contractSources.sdk.package];
if (installedSdk !== contractSources.sdk.version) {
  throw new Error(
    `SDK dependency is ${installedSdk ?? "missing"}, expected ${contractSources.sdk.version}`
  );
}

process.stdout.write(`Validated ${files.length} documentation pages.\n`);
