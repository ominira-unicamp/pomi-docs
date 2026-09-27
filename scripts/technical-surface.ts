import type {
  ManifestConcept,
  ManifestFilterField,
  ManifestOperation
} from "./domain-manifest.ts";
import type { LineageOrigin } from "./provenance.ts";

export type TechnicalFilterExpression = {
  field: string;
  operator: string;
  value: string | number | boolean;
};

export type TechnicalFilterExample = {
  label: string;
  expressions: TechnicalFilterExpression[];
};

export type RenderedFilterExample = {
  http: string;
  sdk: string;
};

export type TechnicalFieldGroup = {
  title: string;
  fields: string[];
};

export type ResolvedFieldGroup = {
  title: string | null;
  fields: ManifestConcept["fields"];
};

const fieldOriginLabels: Record<LineageOrigin, string> = {
  source: "Institucional",
  normalized: "Normalizado",
  derived: "Derivado",
  linked: "Relacionado",
  "pomi-generated": "Interno POMI",
  parsed: "Normalizado",
  aggregated: "Derivado",
  unspecified: "Não especificado"
};

export function summarizeFieldOrigins(origins: LineageOrigin[]): string[] {
  return [...new Set(origins.map((origin) => fieldOriginLabels[origin]))];
}

export function conceptSlug(concept: string): string {
  return concept
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

export function resolveFieldGroups(
  conceptName: string,
  concept: ManifestConcept,
  configuredGroups?: TechnicalFieldGroup[]
): ResolvedFieldGroup[] {
  if (!configuredGroups) return [{ title: null, fields: concept.fields }];
  const groupedFields = configuredGroups.flatMap(({ fields }) => fields);
  const expectedFields = concept.fields.map(({ name }) => name);
  if (
    new Set(groupedFields).size !== groupedFields.length ||
    [...groupedFields].sort().join("|") !== [...expectedFields].sort().join("|")
  ) {
    throw new Error(`Field groups for ${conceptName} must cover every contract field exactly once`);
  }
  return configuredGroups.map((group) => ({
    title: group.title,
    fields: group.fields.map((fieldName) => {
      const field = concept.fields.find(({ name }) => name === fieldName);
      if (!field) throw new Error(`Unknown field ${conceptName}.${fieldName} in schema group ${group.title}`);
      return field;
    })
  }));
}

export function listOperation(concept: ManifestConcept): ManifestOperation | undefined {
  return concept.operations.find(({ sdk, filters, pagination, sort }) =>
    sdk?.action === "list" || filters !== null || pagination !== null || sort !== null
  );
}

function filterField(operation: ManifestOperation, path: string): ManifestFilterField {
  const field = operation.filters?.fields.find((candidate) => candidate.path.join(".") === path);
  if (!field) throw new Error(`Unknown filter field ${path} for ${operation.operationId}`);
  return field;
}

function validateValue(field: ManifestFilterField, value: TechnicalFilterExpression["value"]): void {
  const type = field.schema.type;
  if (type === "integer" && (!Number.isInteger(value) || typeof value !== "number")) {
    throw new Error(`Filter ${field.path.join(".")} requires an integer value`);
  }
  if (type === "number" && typeof value !== "number") {
    throw new Error(`Filter ${field.path.join(".")} requires a number value`);
  }
  if (type === "string" && typeof value !== "string") {
    throw new Error(`Filter ${field.path.join(".")} requires a string value`);
  }
  if (type === "boolean" && typeof value !== "boolean") {
    throw new Error(`Filter ${field.path.join(".")} requires a boolean value`);
  }
  if (typeof field.schema.minimum === "number" && typeof value === "number" && value < field.schema.minimum) {
    throw new Error(`Filter ${field.path.join(".")} requires a value greater than or equal to ${field.schema.minimum}`);
  }
  if (typeof field.schema.minLength === "number" && typeof value === "string" && value.length < field.schema.minLength) {
    throw new Error(`Filter ${field.path.join(".")} requires at least ${field.schema.minLength} characters`);
  }
  if (Array.isArray(field.schema.enum) && !field.schema.enum.includes(value)) {
    throw new Error(`Filter ${field.path.join(".")} does not accept ${String(value)}`);
  }
}

function assignNested(target: Record<string, unknown>, path: string[], value: unknown): void {
  const [head, ...tail] = path;
  if (!head) return;
  if (tail.length === 0) {
    target[head] = value;
    return;
  }
  const nested = typeof target[head] === "object" && target[head] !== null
    ? target[head] as Record<string, unknown>
    : {};
  target[head] = nested;
  assignNested(nested, tail, value);
}

function typescriptValue(value: unknown, depth = 0): string {
  if (typeof value !== "object" || value === null) return JSON.stringify(value);
  const entries = Object.entries(value as Record<string, unknown>);
  const indentation = "  ".repeat(depth + 1);
  const closingIndentation = "  ".repeat(depth);
  return `{\n${entries.map(([key, item]) => `${indentation}${key}: ${typescriptValue(item, depth + 1)}`).join(",\n")}\n${closingIndentation}}`;
}

export function renderFilterExample(
  concept: ManifestConcept,
  example: TechnicalFilterExample
): RenderedFilterExample {
  const operation = listOperation(concept);
  if (!operation?.filters || !operation.sdk) {
    throw new Error(`Concept ${concept.schema} does not expose a filterable SDK list operation`);
  }
  if (example.expressions.length === 0) throw new Error(`Filter example ${example.label} is empty`);

  const filter: Record<string, unknown> = {};
  const query = example.expressions.map((expression) => {
    const field = filterField(operation, expression.field);
    if (!field.operators.includes(expression.operator)) {
      throw new Error(`Filter ${expression.field} does not support ${expression.operator}`);
    }
    validateValue(field, expression.value);
    assignNested(filter, field.path, { [expression.operator]: expression.value });
    const parameters = [...field.path, expression.operator].map((part) => `[${part}]`).join("");
    return `filter${parameters}=${encodeURIComponent(String(expression.value))}`;
  }).join("&");

  return {
    http: `${operation.method} ${operation.path}?${query}`,
    sdk: `await sdk.data.${operation.sdk.resource}.${operation.sdk.method}(${typescriptValue({ filter })});`
  };
}

export function sdkOperationSignature(operation: ManifestOperation): string | null {
  if (!operation.sdk) return null;
  const parameters = Object.values(operation.sdk.pathParameters);
  return `sdk.data.${operation.sdk.resource}.${operation.sdk.method}(${parameters.join(", ")})`;
}
