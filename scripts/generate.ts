import { readJson, writeJsonAtomic } from "./files.ts";
import { generateDomainManifest } from "./domain-manifest.ts";
import { contractPath, manifestPath, scalarOpenApiPath } from "./paths.ts";
import { prepareScalarOpenApi } from "./scalar-openapi.ts";

const dataApiUrl = process.env.PUBLIC_POMI_DATA_API_URL ?? "https://data.pomi.ominira.dev";
const [manifest, openApi] = await Promise.all([
  generateDomainManifest(),
  readJson<Record<string, unknown>>(contractPath)
]);
const scalarOpenApi = prepareScalarOpenApi(openApi, dataApiUrl);

await Promise.all([
  writeJsonAtomic(manifestPath, manifest),
  writeJsonAtomic(scalarOpenApiPath, scalarOpenApi)
]);
