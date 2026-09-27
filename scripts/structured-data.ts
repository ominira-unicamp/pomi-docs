import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readJson } from "./files.ts";

export async function readValidatedJson<T>(path: string, schemaPath: string): Promise<T> {
  const [value, schema] = await Promise.all([readJson<T>(path), readJson<object>(schemaPath)]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(value)) {
    throw new Error(ajv.errorsText(validate.errors, { separator: "\n" }));
  }
  return value;
}
