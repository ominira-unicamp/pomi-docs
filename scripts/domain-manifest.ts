import { readJson } from "./files.ts";
import { contractPath, contractSourcesPath } from "./paths.ts";

type JsonObject = Record<string, unknown>;

export type ManifestSdk = {
  resource: string;
  method: string;
  action: string;
  pathParameters: Record<string, string>;
};

export type ManifestFilterField = {
  path: string[];
  schema: JsonObject;
  operators: string[];
};

export type ManifestFilters = {
  version: number;
  fields: ManifestFilterField[];
  constraints: JsonObject;
};

export type ManifestPagination = {
  defaultMode: string;
  defaultPageSize: number;
  maxPageSize: number | null;
  allowAll: boolean;
};

export type ManifestSort = {
  version: number;
  fields: string[];
  default: string;
};

export type ManifestOperation = {
  operationId: string;
  method: string;
  path: string;
  tag: string;
  referenceHref: string;
  sdk: ManifestSdk | null;
  filters: ManifestFilters | null;
  pagination: ManifestPagination | null;
  sort: ManifestSort | null;
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

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return value as string[];
}

function sdkMetadata(operation: JsonObject): ManifestSdk | null {
  const metadata = object(operation["x-pomi-sdk"]);
  if (!metadata) return null;
  if (
    typeof metadata.resource !== "string" ||
    typeof metadata.method !== "string" ||
    typeof metadata.action !== "string"
  ) {
    throw new Error(`Invalid x-pomi-sdk metadata for ${String(operation.operationId)}`);
  }
  const pathParameters = object(metadata.pathParameters) ?? {};
  if (Object.values(pathParameters).some((value) => typeof value !== "string")) {
    throw new Error(`Invalid x-pomi-sdk pathParameters for ${String(operation.operationId)}`);
  }
  return {
    resource: metadata.resource,
    method: metadata.method,
    action: metadata.action,
    pathParameters: pathParameters as Record<string, string>
  };
}

function filterMetadata(operation: JsonObject): ManifestFilters | null {
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const filter = parameters.find((parameter) => object(parameter)?.name === "filter");
  const metadata = object(object(filter)?.["x-pomi-filters"]);
  if (!metadata) return null;
  if (typeof metadata.version !== "number" || !Array.isArray(metadata.fields)) {
    throw new Error(`Invalid x-pomi-filters metadata for ${String(operation.operationId)}`);
  }
  const fields = metadata.fields.map((rawField, index) => {
    const field = object(rawField);
    if (!field) throw new Error(`Invalid filter field ${index} for ${String(operation.operationId)}`);
    return {
      path: strings(field.path, `Filter path ${index}`),
      schema: object(field.schema) ?? {},
      operators: strings(field.operators, `Filter operators ${index}`)
    };
  });
  return {
    version: metadata.version,
    fields,
    constraints: object(metadata.constraints) ?? {}
  };
}

function paginationMetadata(operation: JsonObject): ManifestPagination | null {
  const metadata = object(operation["x-pomi-pagination"]);
  if (!metadata) return null;
  if (
    typeof metadata.defaultMode !== "string" ||
    typeof metadata.defaultPageSize !== "number" ||
    typeof metadata.allowAll !== "boolean" ||
    (metadata.maxPageSize !== undefined && typeof metadata.maxPageSize !== "number")
  ) {
    throw new Error(`Invalid x-pomi-pagination metadata for ${String(operation.operationId)}`);
  }
  return {
    defaultMode: metadata.defaultMode,
    defaultPageSize: metadata.defaultPageSize,
    maxPageSize: typeof metadata.maxPageSize === "number" ? metadata.maxPageSize : null,
    allowAll: metadata.allowAll
  };
}

function sortMetadata(operation: JsonObject): ManifestSort | null {
  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const sort = parameters.find((parameter) => object(parameter)?.name === "sort");
  const metadata = object(object(sort)?.["x-pomi-sort"]);
  if (!metadata) return null;
  if (typeof metadata.version !== "number" || typeof metadata.default !== "string") {
    throw new Error(`Invalid x-pomi-sort metadata for ${String(operation.operationId)}`);
  }
  return {
    version: metadata.version,
    fields: strings(metadata.fields, `Sort fields for ${String(operation.operationId)}`),
    default: metadata.default
  };
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
        sdk: sdkMetadata(operation),
        filters: filterMetadata(operation),
        pagination: paginationMetadata(operation),
        sort: sortMetadata(operation)
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
