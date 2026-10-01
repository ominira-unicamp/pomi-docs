import { describe, expect, test } from "vitest";
import { generateDomainManifest } from "../scripts/domain-manifest.ts";
import { loadDataProvenance } from "../scripts/provenance.ts";
import {
  commonSemanticSources,
  loadDomainSemantics,
  specificSemanticSources
} from "../scripts/semantics.ts";
import { loadSourceRegistry } from "../scripts/source-registry.ts";
import { resolveSource } from "../scripts/source-registry.ts";
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
  test("deduplicates shared sources without hiding variant-specific references", () => {
    const first = {
      label: "A",
      description: "A",
      sources: [{ sourceId: "COMMON" }, { sourceId: "ONLY_A" }]
    };
    const second = {
      label: "B",
      description: "B",
      sources: [{ sourceId: "COMMON" }, { sourceId: "ONLY_B" }]
    };
    const common = commonSemanticSources([first, second]);
    expect(common).toEqual([{ sourceId: "COMMON" }]);
    expect(specificSemanticSources(first, common)).toEqual([{ sourceId: "ONLY_A" }]);
  });

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
    expect(
      manifest.concepts.CatalogProgram.fields.find(({ name }) => name === "creditLimitType")
        ?.enumValues
    ).toEqual(["NONE", "FIXED", "CR_FORMULA"]);
    expect(manifest.concepts.CatalogCoursePrerequisiteItem.union).toMatchObject({
      discriminator: "type",
      variants: [{ value: "COURSE" }, { value: "SPECIAL_REQUIREMENT" }]
    });
  });

  test("accepts the phase-one knowledge base", async () => {
    const values = await knowledgeBase();
    expect(() => validateKnowledgeBase(...Object.values(values) as Parameters<typeof validateKnowledgeBase>)).not.toThrow();
  });

  test("separates catalog family, edition and semantic locator", async () => {
    const { registry, provenance } = await knowledgeBase();
    expect(registry.schemaVersion).toBe(3);
    const catalog = resolveSource(registry, "UNICAMP_DAC_CATALOG_2026");
    expect(catalog?.id).toBe("UNICAMP_DAC_CATALOG");
    expect(catalog?.instance?.context).toMatchObject({ catalogYear: 2026 });
    expect(provenance.schemaVersion).toBe(2);
    expect(provenance.concepts.CatalogCourse.fields.workload.lineage[0].locator?.label).toBe(
      "Vetor de carga horária"
    );
  });

  test("documents the History 19 curriculum slice", async () => {
    const { registry, provenance, semantics } = await knowledgeBase();
    const history = resolveSource(registry, "UNICAMP_DAC_CURRICULUM_19_2026");
    const foreignLanguage = resolveSource(registry, "UNICAMP_DAC_FOREIGN_LANGUAGE");
    expect(history?.id).toBe("UNICAMP_DAC_CATALOG");
    expect(history?.instance?.context).toMatchObject({ catalogYear: 2026, programCode: "19" });
    expect(foreignLanguage?.title).toBe("Opção por Língua Estrangeira");
    expect(semantics.fieldEnums["CatalogProgram.shift"].values.DAYTIME.label).toBe("Integral");
    expect(semantics.fieldEnums["CatalogProgram.creditLimitType"].values.FIXED.description)
      .toContain("36");
    expect(semantics.unions.CourseRequirement.variants).toHaveProperty("prefix");
    expect(provenance.concepts.Specialization.limitations).toContain(
      "O contrato público não diferencia explicitamente habilitação de ênfase."
    );
    expect(provenance.concepts.CatalogProgram.semanticAuthorities).toContainEqual({
      sourceId: "UNICAMP_CCG_18_2026",
      referenceLabels: ["Caráter curricular"]
    });
    expect(provenance.concepts.CatalogProgram.fields.base.lineage[0].locator?.label).toBe(
      "Base comum do Currículo Pleno"
    );
  });

  test("covers the remaining understanding-data domains", async () => {
    const { registry, provenance, semantics } = await knowledgeBase();
    expect(resolveSource(registry, "UNICAMP_DATA_PORTAL_PROFESSORS")?.title)
      .toBe("Portal Docentes e Pesquisadores");
    expect(resolveSource(registry, "UNICAMP_PREFEITURA_MENU_APP")?.title)
      .toBe("Aplicação oficial de cardápio");
    expect(resolveSource(registry, "UNICAMP_DERI_EXCHANGE_CLOSED")?.title)
      .toBe("Editais de intercâmbio encerrados");
    expect(semantics.enums.YearPeriod.values).toHaveProperty("SECOND_SEMESTER");
    expect(semantics.enums.MealStatus.values.NOT_REGISTERED.description)
      .toContain("não equivale automaticamente a falha de coleta");
    expect(semantics.unions.AcademicPositionAffiliation.variants)
      .toHaveProperty("POSTDOCTORAL_PROGRAM");
    expect(provenance.concepts.StudyPeriod.limitations[0]).toContain("data final");
    expect(provenance.concepts.ProfessorDataPortalProfile.limitations[0])
      .toContain("rejeita ambiguidades");
    expect(provenance.concepts.ExchangeNotice.fields.registrationOriginalText.lineage[0].origin)
      .toBe("source");
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

    const missingFieldEnum = structuredClone(values.semantics);
    delete missingFieldEnum.fieldEnums["CatalogProgram.shift"].values.DAYTIME;
    expect(() =>
      validateKnowledgeBase(values.manifest, values.registry, values.provenance, missingFieldEnum)
    ).toThrow(/CatalogProgram.shift values: semantic coverage mismatch/);
  });
});
