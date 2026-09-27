import { loadSourceRegistry } from "./source-registry.ts";

const registry = await loadSourceRegistry();
process.stdout.write(`Validated ${registry.sources.length} official sources.\n`);
