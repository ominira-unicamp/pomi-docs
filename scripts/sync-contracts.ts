import { rm } from "node:fs/promises";
import { backendArgument, exportContract } from "./contracts.ts";
import { readJson, writeJsonAtomic, writeTextAtomic } from "./files.ts";
import { contractPath, contractSourcesPath } from "./paths.ts";

type ContractSources = {
  dataApi: { repository: string; commit: string; sha256: string };
  sdk: { package: string; version: string };
};

const backend = backendArgument(process.argv.slice(2));
const exported = await exportContract(backend);
try {
  const sources = await readJson<ContractSources>(contractSourcesPath);
  sources.dataApi.commit = exported.commit;
  sources.dataApi.sha256 = exported.hash;
  await Promise.all([
    writeTextAtomic(contractPath, exported.content),
    writeJsonAtomic(contractSourcesPath, sources)
  ]);
  process.stdout.write(`Synchronized Data API ${exported.commit}.\n`);
} finally {
  await rm(exported.directory, { recursive: true, force: true });
}
