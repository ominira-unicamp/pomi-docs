import type { DomainManifest } from "./domain-manifest.ts";
import type { DataProvenance } from "./provenance.ts";
import type { DomainSemantics, SemanticValue } from "./semantics.ts";
import type { OfficialSource, OfficialSourceRegistry, SourceFamily } from "./source-registry.ts";

function sameMembers(actual: string[], expected: string[], subject: string): void {
  const missing = expected.filter((value) => !actual.includes(value));
  const extra = actual.filter((value) => !expected.includes(value));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${subject}: semantic coverage mismatch; missing [${missing.join(", ")}], extra [${extra.join(", ")}]`
    );
  }
}

function validateSemanticSources(
  values: Record<string, SemanticValue>,
  sources: Map<string, OfficialSource | SourceFamily>,
  subject: string
): void {
  for (const [value, semantic] of Object.entries(values)) {
    for (const reference of semantic.sources) {
      const source = sources.get(reference.sourceId);
      if (!source) throw new Error(`${subject}.${value}: unknown source ${reference.sourceId}`);
      if (
        reference.referenceLabel &&
        !("references" in source && source.references?.some(({ label }) => label === reference.referenceLabel))
      ) {
        throw new Error(
          `${subject}.${value}: unknown reference label ${reference.referenceLabel}`
        );
      }
    }
  }
}

export function validateKnowledgeBase(
  manifest: DomainManifest,
  registry: OfficialSourceRegistry,
  provenance: DataProvenance,
  semantics: DomainSemantics
): void {
  const sources = new Map<string, OfficialSource | SourceFamily>([
    ...registry.families.map((source) => [source.id, source] as const),
    ...registry.sources.map((source) => [source.id, source] as const)
  ]);
  sameMembers(Object.keys(provenance.concepts), provenance.requiredConcepts, "provenance concepts");

  for (const conceptName of provenance.requiredConcepts) {
    const concept = manifest.concepts[conceptName];
    const documented = provenance.concepts[conceptName];
    if (!concept) throw new Error(`provenance: unknown concept ${conceptName}`);
    if (!documented) throw new Error(`provenance: missing concept ${conceptName}`);
    sameMembers(
      Object.keys(documented.fields),
      concept.fields.map(({ name }) => name),
      `${conceptName} fields`
    );
    const sourceReferences = [
      ...documented.semanticAuthorities,
      ...documented.operationalSources,
      ...Object.values(documented.fields).flatMap(({ lineage }) =>
        lineage.flatMap(({ sourceId }) => (sourceId ? [{ sourceId }] : []))
      )
    ];
    for (const reference of sourceReferences) {
      if (!sources.has(reference.sourceId)) {
        throw new Error(`${conceptName}: unknown source ${reference.sourceId}`);
      }
    }
    for (const authority of documented.semanticAuthorities) {
      const source = sources.get(authority.sourceId)!;
      for (const label of authority.referenceLabels ?? []) {
        if (!("references" in source && source.references?.some((reference) => reference.label === label))) {
          throw new Error(`${conceptName}: unknown reference label ${label}`);
        }
      }
    }
  }

  for (const [enumName, documented] of Object.entries(semantics.enums)) {
    const concept = manifest.concepts[enumName];
    if (!concept?.enumValues) throw new Error(`${enumName}: OpenAPI enum not found`);
    sameMembers(Object.keys(documented.values), concept.enumValues, `${enumName} values`);
    if (concept.nullable && !documented.nullMeaning) {
      throw new Error(`${enumName}: nullable enum requires nullMeaning`);
    }
    if (!concept.nullable && documented.nullMeaning) {
      throw new Error(`${enumName}: non-nullable enum cannot define nullMeaning`);
    }
    validateSemanticSources(documented.values, sources, enumName);
  }

  for (const [unionName, documented] of Object.entries(semantics.unions)) {
    const union = manifest.concepts[unionName]?.union;
    if (!union) throw new Error(`${unionName}: OpenAPI discriminated union not found`);
    if (union.discriminator !== documented.discriminator) {
      throw new Error(
        `${unionName}: discriminator is ${union.discriminator}, documented ${documented.discriminator}`
      );
    }
    sameMembers(
      Object.keys(documented.variants),
      union.variants.map(({ value }) => value),
      `${unionName} variants`
    );
    validateSemanticSources(documented.variants, sources, unionName);
  }
}
