import { readFile, rm } from "node:fs/promises";
import { backendArgument, exportContract } from "./contracts.ts";
import { readJson, sha256 } from "./files.ts";
import { contractPath, contractSourcesPath } from "./paths.ts";

type ContractSources = {
  dataApi: { repository: string; commit: string; sha256: string };
  sdk: { package: string; version: string };
};

const backend = backendArgument(process.argv.slice(2));
const [exported, sources, snapshot] = await Promise.all([
  exportContract(backend),
  readJson<ContractSources>(contractSourcesPath),
  readFile(contractPath, "utf8")
]);
try {
  if (exported.commit !== sources.dataApi.commit) {
    throw new Error(`Backend commit is ${exported.commit}, expected ${sources.dataApi.commit}.`);
  }
  if (exported.content !== snapshot) {
    throw new Error("Versioned OpenAPI differs from the pinned backend export.");
  }
  if (sha256(snapshot) !== sources.dataApi.sha256 || exported.hash !== sources.dataApi.sha256) {
    throw new Error("OpenAPI SHA-256 differs from contracts/sources.json.");
  }
  process.stdout.write(`Verified Data API ${exported.commit}.\n`);
} finally {
  await rm(exported.directory, { recursive: true, force: true });
}
