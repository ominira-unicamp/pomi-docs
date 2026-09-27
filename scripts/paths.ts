import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));

export const projectRoot = resolve(scriptsDirectory, "..");
export const contractPath = resolve(projectRoot, "contracts/data-openapi.json");
export const contractSourcesPath = resolve(projectRoot, "contracts/sources.json");
export const sourceRegistryPath = resolve(projectRoot, "sources/unicamp.json");
export const sourceSchemaPath = resolve(projectRoot, "sources/schema.json");
export const provenancePath = resolve(projectRoot, "provenance/data-api.json");
export const provenanceSchemaPath = resolve(projectRoot, "provenance/schema.json");
export const semanticsPath = resolve(projectRoot, "semantics/data-api.json");
export const semanticsSchemaPath = resolve(projectRoot, "semantics/schema.json");
export const generatedDirectory = resolve(projectRoot, ".cache/generated");
export const manifestPath = resolve(generatedDirectory, "data-domain-manifest.json");
export const scalarOpenApiPath = resolve(
  projectRoot,
  "public/generated/data-openapi.json"
);
