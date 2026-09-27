import { readJson } from "./files.ts";
import { contractPath, contractSourcesPath } from "./paths.ts";

type JsonObject = Record<string, unknown>;

export type ManifestOperation = {
  operationId: string;
  method: string;
  path: string;
  tag: string;
  referenceHref: string;
  sdk: unknown;
  filters: unknown;
  pagination: unknown;
  sort: unknown;
};

export type ManifestConcept = {
  schema: string;
  kind: string;
  identityFields: string[];
  relations: Record<string, unknown>;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    nullable: boolean;
    description: string | null;
  }>;
  enumValues: string[] | null;
  nullable: boolean;
  union: {
    discriminator: string;
    variants: Array<{ value: string; schema: string; publicName: string | null }>;
  } | null;
  operations: ManifestOperation[];
};

export type DomainManifest = {
  manifestVersion: 3;
  source: {
    api: "data";
    title: string;
    version: string;
    backendCommit: string;
    sha256: string;
  };
  concepts: Record<string, ManifestConcept>;
};

type ContractSources = {
  dataApi: {
    repository: string;
    commit: string;
    sha256: string;
  };
  sdk: {
    package: string;
    version: string;
  };
};

function object(value: unknown): JsonObject | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function schemaNameFromRef(value: unknown): string | undefined {
  const reference = object(value)?.$ref;
  return typeof reference === "string" ? reference.split("/").at(-1) : undefined;
}

function schemaPublicName(schemaName: string, schemas: JsonObject): string | null {
  const metadata = object(object(schemas[schemaName])?.["x-pomi-schema"]);
  return typeof metadata?.publicName === "string" ? metadata.publicName : null;
}

function schemaType(value: unknown, schemas: JsonObject): string {
  const schema = object(value);
  if (!schema) return "unknown";
  const reference = schemaNameFromRef(schema);
  if (reference) return schemaPublicName(reference, schemas) ?? reference;
  if (schema.type === "array") return `Array<${schemaType(schema.items, schemas)}>`;
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.oneOf)) return "union";
  return "unknown";
}

function manifestFields(schema: JsonObject, schemas: JsonObject): ManifestConcept["fields"] {
  const properties = object(schema.properties) ?? {};
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((field): field is string => typeof field === "string")
      : []
  );
  return Object.entries(properties).map(([name, rawField]) => {
    const field = object(rawField) ?? {};
    const referenced = schemaNameFromRef(field);
    const referencedSchema = referenced ? object(schemas[referenced]) : undefined;
    return {
      name,
      type: schemaType(field, schemas),
      required: required.has(name),
      nullable:
        field.nullable === true ||
        referencedSchema?.nullable === true ||
        (Array.isArray(referencedSchema?.enum) && referencedSchema.enum.includes(null)),
      description: typeof field.description === "string" ? field.description : null
    };
  });
}

function manifestEnumValues(schema: JsonObject): string[] | null {
  if (!Array.isArray(schema.enum)) return null;
  return schema.enum.filter((value): value is string => typeof value === "string");
}

function manifestUnion(
  schema: JsonObject,
  schemas: JsonObject
): ManifestConcept["union"] {
  const discriminator = object(schema.discriminator);
  const mapping = object(discriminator?.mapping);
  if (typeof discriminator?.propertyName !== "string" || !mapping) return null;
  return {
    discriminator: discriminator.propertyName,
    variants: Object.entries(mapping).map(([value, rawReference]) => {
      const schemaName =
        typeof rawReference === "string" ? rawReference.split("/").at(-1) ?? "" : "";
      return {
        value,
        schema: schemaName,
        publicName: schemaPublicName(schemaName, schemas)
      };
    })
  };
}

function referenceName(schema: unknown, schemas: JsonObject, visited = new Set<string>()): string[] {
  const value = object(schema);
  if (!value) return [];
  if (typeof value.$ref === "string") {
    const name = value.$ref.split("/").at(-1) as string;
    if (visited.has(name)) return [];
    const referenced = schemas[name];
    if (!referenced) return [name];
    const nested = referenceName(referenced, schemas, new Set([...visited, name]));
    return nested.length > 0 ? nested : [name];
  }
  for (const composition of ["oneOf", "anyOf"] as const) {
    if (Array.isArray(value[composition])) {
      return value[composition].flatMap((item) => referenceName(item, schemas, visited));
    }
  }
  const properties = object(value.properties);
  const data = object(properties?.data);
  if (data?.type === "array") {
    return referenceName(data.items, schemas, visited);
  }
  return [];
}

function successfulResponseSchemas(operation: JsonObject, schemas: JsonObject): string[] {
  const responses = object(operation.responses);
  if (!responses) return [];
  const responseSchemas = Object.entries(responses)
    .filter(([status]) => /^2\d\d$/.test(status))
    .flatMap(([, response]) => {
      const content = object(object(response)?.content);
      return referenceName(object(content?.["application/json"])?.schema, schemas);
    });
  return [...new Set(responseSchemas)];
}

function filterMetadata(operation: JsonObject): unknown {
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const filter = parameters.find((parameter) => object(parameter)?.name === "filter");
  return object(filter)?.["x-pomi-filters"] ?? null;
}

export async function generateDomainManifest(): Promise<DomainManifest> {
  const [openApi, sources] = await Promise.all([
    readJson<JsonObject>(contractPath),
    readJson<ContractSources>(contractSourcesPath)
  ]);
  const schemas = object(object(openApi.components)?.schemas) ?? {};
  const concepts: Record<string, ManifestConcept> = {};
  const schemaConcepts = new Map<string, string>();

  for (const [schemaName, rawSchema] of Object.entries(schemas)) {
    const metadata = object(object(rawSchema)?.["x-pomi-schema"]);
    if (!metadata || typeof metadata.publicName !== "string") continue;
    if (concepts[metadata.publicName]) {
      throw new Error(`Duplicate publicName: ${metadata.publicName}`);
    }
    const identityFields = Array.isArray(metadata.identityFields)
      ? metadata.identityFields.filter((field): field is string => typeof field === "string")
      : [];
    const schema = object(rawSchema) ?? {};
    concepts[metadata.publicName] = {
      schema: schemaName,
      kind: typeof metadata.kind === "string" ? metadata.kind : "unknown",
      identityFields,
      relations: object(metadata.relations) ?? {},
      fields: manifestFields(schema, schemas),
      enumValues: manifestEnumValues(schema),
      nullable:
        schema.nullable === true ||
        (Array.isArray(schema.enum) && schema.enum.includes(null)),
      union: manifestUnion(schema, schemas),
      operations: []
    };
    schemaConcepts.set(schemaName, metadata.publicName);
  }

  const operationIds = new Set<string>();
  const paths = object(openApi.paths) ?? {};
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, rawOperation] of Object.entries(object(pathItem) ?? {})) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      const operation = object(rawOperation);
      if (!operation || typeof operation.operationId !== "string") continue;
      if (operationIds.has(operation.operationId)) {
        throw new Error(`Duplicate operationId: ${operation.operationId}`);
      }
      operationIds.add(operation.operationId);
      const tags = Array.isArray(operation.tags)
        ? operation.tags.filter((tag): tag is string => typeof tag === "string")
        : [];
      if (tags.length !== 1) {
        throw new Error(`Operation ${operation.operationId} must have exactly one tag`);
      }
      const manifestOperation: ManifestOperation = {
        operationId: operation.operationId,
        method: method.toUpperCase(),
        path,
        tag: tags[0],
        referenceHref: "https://data.pomi.ominira.dev/docs",
        sdk: operation["x-pomi-sdk"] ?? null,
        filters: filterMetadata(operation),
        pagination: operation["x-pomi-pagination"] ?? null,
        sort: (() => {
          const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
          const sort = parameters.find((parameter) => object(parameter)?.name === "sort");
          return object(sort)?.["x-pomi-sort"] ?? null;
        })()
      };
      for (const schemaName of successfulResponseSchemas(operation, schemas)) {
        const publicName = schemaConcepts.get(schemaName);
        if (publicName) concepts[publicName].operations.push(manifestOperation);
      }
    }
  }

  const info = object(openApi.info) ?? {};
  return {
    manifestVersion: 3,
    source: {
      api: "data",
      title: typeof info.title === "string" ? info.title : "POMI Data API",
      version: typeof info.version === "string" ? info.version : "unknown",
      backendCommit: sources.dataApi.commit,
      sha256: sources.dataApi.sha256
    },
    concepts
  };
}
