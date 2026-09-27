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

export type OfficialSourceRegistry = {
  schemaVersion: 2;
  sources: OfficialSource[];
};

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
  for (const source of registry.sources) {
    if (ids.has(source.id)) {
      throw new Error(`Duplicate official source: ${source.id}`);
    }
    ids.add(source.id);
    const hostname = new URL(source.url).hostname;
    if (hostname !== "unicamp.br" && !hostname.endsWith(".unicamp.br")) {
      throw new Error(`Official source is outside Unicamp domains: ${source.id}`);
    }
  }

  if (registry.sources.length !== 24) {
    throw new Error(`Expected 24 V0.1 sources, received ${registry.sources.length}`);
  }
  return registry;
}
