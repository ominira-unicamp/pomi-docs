import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readJson } from "./files.ts";
import { sourceRegistryPath, sourceSchemaPath } from "./paths.ts";

export type OfficialSource = {
  id: string;
  priority: "P0" | "P1" | "P2";
  authority: "normative" | "registry" | "operational" | "complementary";
  title: string;
  issuer: string;
  url: string;
  landingUrl?: string;
  publishedAt?: string;
  effectiveAt?: string;
  lastVerifiedAt: string;
  type: string;
  concepts: string[];
  cadence: string;
  access: string;
  licenseNote: string;
  provenanceNote: string;
  familyId?: string;
  context?: {
    catalogYear?: number;
    coursePrefix?: string;
    programCode?: string;
    academicPeriod?: string;
  };
  references?: Array<{
    label: string;
    section?: string;
    articles?: string[];
  }>;
  temporalScope?: {
    type:
      | "consolidated-regulation"
      | "annual-series"
      | "catalog-edition"
      | "academic-period"
      | "current-state"
      | "irregular";
    dimensions: string[];
  };
};

export type SourceFamily = Pick<
  OfficialSource,
  "id" | "priority" | "authority" | "title" | "issuer" | "url" | "lastVerifiedAt" | "concepts" | "provenanceNote"
>;

export type OfficialSourceRegistry = {
  schemaVersion: 3;
  families: SourceFamily[];
  sources: OfficialSource[];
};

export type ResolvedSource = SourceFamily & {
  references?: OfficialSource["references"];
  instance?: OfficialSource;
};

export function resolveSource(
  registry: OfficialSourceRegistry,
  id: string
): ResolvedSource | undefined {
  const family = registry.families.find((candidate) => candidate.id === id);
  if (family) return family;
  const instance = registry.sources.find((candidate) => candidate.id === id);
  if (!instance) return undefined;
  const parent = instance.familyId
    ? registry.families.find((candidate) => candidate.id === instance.familyId)
    : undefined;
  return parent ? { ...parent, instance } : { ...instance, instance };
}

export async function loadSourceRegistry(): Promise<OfficialSourceRegistry> {
  const [registry, schema] = await Promise.all([
    readJson<OfficialSourceRegistry>(sourceRegistryPath),
    readJson<object>(sourceSchemaPath)
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(registry)) {
    throw new Error(ajv.errorsText(validate.errors, { separator: "\n" }));
  }

  const ids = new Set<string>();
  for (const family of registry.families) {
    if (ids.has(family.id)) throw new Error(`Duplicate official source: ${family.id}`);
    ids.add(family.id);
  }
  for (const source of registry.sources) {
    if (ids.has(source.id)) {
      throw new Error(`Duplicate official source: ${source.id}`);
    }
    ids.add(source.id);
    if (source.familyId && !registry.families.some(({ id }) => id === source.familyId)) {
      throw new Error(`Unknown source family ${source.familyId} for ${source.id}`);
    }
    const hostname = new URL(source.url).hostname;
    if (hostname !== "unicamp.br" && !hostname.endsWith(".unicamp.br")) {
      throw new Error(`Official source is outside Unicamp domains: ${source.id}`);
    }
  }

  return registry;
}
