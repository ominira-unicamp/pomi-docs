import { semanticsPath, semanticsSchemaPath } from "./paths.ts";
import { readValidatedJson } from "./structured-data.ts";

export type SemanticValue = {
  label: string;
  description: string;
  sources: Array<{ sourceId: string; referenceLabel?: string }>;
};

export type DomainSemantics = {
  schemaVersion: 1;
  enums: Record<string, { nullMeaning?: string; values: Record<string, SemanticValue> }>;
  unions: Record<
    string,
    { discriminator: string; variants: Record<string, SemanticValue> }
  >;
};

export function loadDomainSemantics(): Promise<DomainSemantics> {
  return readValidatedJson<DomainSemantics>(semanticsPath, semanticsSchemaPath);
}
