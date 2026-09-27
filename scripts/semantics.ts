import { semanticsPath, semanticsSchemaPath } from "./paths.ts";
import { readValidatedJson } from "./structured-data.ts";

export type SemanticValue = {
  label: string;
  description: string;
  sources: Array<{ sourceId: string; referenceLabel?: string }>;
};

export type SemanticSource = SemanticValue["sources"][number];

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

function semanticSourceKey(source: SemanticSource): string {
  return `${source.sourceId}\u0000${source.referenceLabel ?? ""}`;
}

export function commonSemanticSources(values: SemanticValue[]): SemanticSource[] {
  if (values.length === 0) return [];
  const remaining = values.slice(1).map((value) => new Set(value.sources.map(semanticSourceKey)));
  return values[0].sources.filter((source) => {
    const key = semanticSourceKey(source);
    return remaining.every((sources) => sources.has(key));
  });
}

export function specificSemanticSources(
  value: SemanticValue,
  commonSources: SemanticSource[]
): SemanticSource[] {
  const commonKeys = new Set(commonSources.map(semanticSourceKey));
  return value.sources.filter((source) => !commonKeys.has(semanticSourceKey(source)));
}
