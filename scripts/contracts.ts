import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { sha256 } from "./files.ts";

export function backendArgument(arguments_: string[]): string {
  const { values } = parseArgs({
    args: arguments_,
    options: { backend: { type: "string" } },
    strict: true
  });
  if (!values.backend) throw new Error("Pass --backend <path>.");
  return resolve(process.cwd(), values.backend);
}

export function run(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
  });
}

export async function exportContract(backend: string): Promise<{
  directory: string;
  output: string;
  content: string;
  hash: string;
  commit: string;
}> {
  const directory = await mkdtemp(join(tmpdir(), "pomi-docs-contract-"));
  const output = join(directory, "data-openapi.json");
  try {
    const commit = await run("git", ["rev-parse", "HEAD"], backend);
    await run(
      "npm",
      ["run", "openapi:export", "--workspace", "@pomi/data", "--", "--output", output],
      backend
    );
    const content = await readFile(output, "utf8");
    return { directory, output, content, hash: sha256(content), commit };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
