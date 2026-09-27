import { describe, expect, test } from "vitest";
import { generateDomainManifest } from "../scripts/domain-manifest.ts";
import { loadDataProvenance } from "../scripts/provenance.ts";
import { loadDomainSemantics } from "../scripts/semantics.ts";
import { loadSourceRegistry } from "../scripts/source-registry.ts";
import { validateKnowledgeBase } from "../scripts/validate-knowledge.ts";

async function knowledgeBase() {
  const [manifest, registry, provenance, semantics] = await Promise.all([
    generateDomainManifest(),
    loadSourceRegistry(),
    loadDataProvenance(),
    loadDomainSemantics()
  ]);
  return { manifest, registry, provenance, semantics };
}

describe("semantic documentation contracts", () => {
  test("extracts fields, nullable enums and discriminated unions from OpenAPI", async () => {
    const { manifest } = await knowledgeBase();
    expect(manifest.manifestVersion).toBe(3);
    expect(manifest.concepts.Course.fields.map(({ name }) => name)).toContain("prefix");
    expect(manifest.concepts.CourseOfferingPeriod.enumValues).toEqual([
      "ALL_PERIODS",
      "ODD_PERIODS",
      "EVEN_PERIODS",
      "UNIT_DISCRETION"
    ]);
    expect(manifest.concepts.CourseOfferingPeriod.nullable).toBe(true);
    expect(manifest.concepts.CatalogCoursePrerequisiteItem.union).toMatchObject({
      discriminator: "type",
      variants: [{ value: "COURSE" }, { value: "SPECIAL_REQUIREMENT" }]
    });
  });

  test("accepts the phase-one knowledge base", async () => {
    const values = await knowledgeBase();
    expect(() => validateKnowledgeBase(...Object.values(values) as Parameters<typeof validateKnowledgeBase>)).not.toThrow();
  });

  test("rejects unknown sources and incomplete field coverage", async () => {
    const values = await knowledgeBase();
    const unknownSource = structuredClone(values.provenance);
    unknownSource.concepts.Course.fields.code.lineage[0].sourceId = "UNKNOWN_SOURCE";
    expect(() =>
      validateKnowledgeBase(values.manifest, values.registry, unknownSource, values.semantics)
    ).toThrow(/unknown source UNKNOWN_SOURCE/);

    const missingField = structuredClone(values.provenance);
    delete missingField.concepts.Course.fields.prefix;
    expect(() =>
      validateKnowledgeBase(values.manifest, values.registry, missingField, values.semantics)
    ).toThrow(/Course fields: semantic coverage mismatch/);
  });

  test("rejects enum and union semantics that drift from OpenAPI", async () => {
    const values = await knowledgeBase();
    const missingEnum = structuredClone(values.semantics);
    delete missingEnum.enums.CourseOfferingPeriod.values.ALL_PERIODS;
    expect(() =>
      validateKnowledgeBase(values.manifest, values.registry, values.provenance, missingEnum)
    ).toThrow(/CourseOfferingPeriod values: semantic coverage mismatch/);

    const extraVariant = structuredClone(values.semantics);
    extraVariant.unions.CatalogCoursePrerequisiteItem.variants.UNKNOWN = {
      label: "Inválido",
      description: "Valor usado apenas para testar a validação.",
      sources: []
    };
    expect(() =>
      validateKnowledgeBase(values.manifest, values.registry, values.provenance, extraVariant)
    ).toThrow(/CatalogCoursePrerequisiteItem variants: semantic coverage mismatch/);
  });
});
