import { describe, expect, test } from "vitest";
import { generateDomainManifest } from "../scripts/domain-manifest.ts";
import {
  renderFilterExample,
  resolveFieldGroups,
  summarizeFieldOrigins
} from "../scripts/technical-surface.ts";

describe("concept technical surfaces", () => {
  test("renders paired SDK and HTTP examples from validated filter metadata", async () => {
    const manifest = await generateDomainManifest();
    const rendered = renderFilterExample(manifest.concepts.Course, {
      label: "Disciplinas do IC com pelo menos quatro créditos",
      expressions: [
        { field: "credits", operator: "gte", value: 4 },
        { field: "unit.code", operator: "eq", value: "IC" }
      ]
    });

    expect(rendered.http).toBe(
      "GET /courses?filter[credits][gte]=4&filter[unit][code][eq]=IC"
    );
    expect(rendered.sdk).toContain("sdk.data.courses.list");
    expect(rendered.sdk).toContain("credits: {\n      gte: 4");
    expect(rendered.sdk).toContain('code: {\n        eq: "IC"');
  });

  test("rejects filters that drift from the contract", async () => {
    const manifest = await generateDomainManifest();
    expect(() => renderFilterExample(manifest.concepts.Course, {
      label: "Campo inválido",
      expressions: [{ field: "unknown", operator: "eq", value: 1 }]
    })).toThrow(/Unknown filter field unknown/);
    expect(() => renderFilterExample(manifest.concepts.Course, {
      label: "Operador inválido",
      expressions: [{ field: "code", operator: "gte", value: "MC732" }]
    })).toThrow(/does not support gte/);
    expect(() => renderFilterExample(manifest.concepts.Course, {
      label: "Tipo inválido",
      expressions: [{ field: "credits", operator: "eq", value: "quatro" }]
    })).toThrow(/requires an integer value/);
    expect(() => renderFilterExample(manifest.concepts.CatalogCourse, {
      label: "Enum inválido",
      expressions: [{ field: "offeringPeriod", operator: "eq", value: "UNKNOWN" }]
    })).toThrow(/does not accept UNKNOWN/);
  });

  test("requires semantic field groups to cover the complete contract", async () => {
    const manifest = await generateDomainManifest();
    const course = manifest.concepts.Course;
    const groups = resolveFieldGroups("Course", course, [
      { title: "Identidade", fields: ["id", "code", "name", "prefix"] },
      { title: "Organização", fields: ["credits", "unitId", "unitCode"] }
    ]);
    expect(groups.flatMap(({ fields }) => fields.map(({ name }) => name))).toHaveLength(7);
    expect(() => resolveFieldGroups("Course", course, [
      { title: "Incompleto", fields: ["id"] }
    ])).toThrow(/cover every contract field exactly once/);
    expect(() => resolveFieldGroups("Course", course, [
      { title: "Duplicado", fields: ["id", "id", "code", "name", "credits", "prefix", "unitId", "unitCode"] }
    ])).toThrow(/cover every contract field exactly once/);
  });

  test("summarizes provenance with stable reader-facing categories", () => {
    expect(summarizeFieldOrigins(["source", "normalized", "parsed", "pomi-generated"])).toEqual([
      "Institucional",
      "Normalizado",
      "Interno POMI"
    ]);
    expect(summarizeFieldOrigins(["linked", "aggregated", "derived", "linked"])).toEqual([
      "Relacionado",
      "Derivado"
    ]);
  });
});
