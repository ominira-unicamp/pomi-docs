import { describe, expect, test } from "vitest";
import { generateDomainManifest } from "../scripts/domain-manifest.ts";
import { readJson } from "../scripts/files.ts";
import { contractPath } from "../scripts/paths.ts";
import { prepareScalarOpenApi } from "../scripts/scalar-openapi.ts";

describe("domain manifest", () => {
  test("links Course and CatalogCourse to their public operations", async () => {
    const manifest = await generateDomainManifest();
    expect(manifest.concepts.Course.schema).toBe("CourseEntity");
    expect(manifest.concepts.Course.operations.map(({ operationId }) => operationId)).toEqual([
      "getCourses",
      "listCourses"
    ]);
    expect(
      manifest.concepts.CatalogCourse.operations.map(({ operationId }) => operationId)
    ).toEqual(["listCatalogCourses", "getCatalogCourses"]);
  });

  test("derives filters and pagination without inventing relations", async () => {
    const manifest = await generateDomainManifest();
    const list = manifest.concepts.Course.operations.find(
      ({ operationId }) => operationId === "listCourses"
    );
    expect(list?.filters).not.toBeNull();
    expect(list?.pagination).not.toBeNull();
    expect(list?.sdk).toMatchObject({ resource: "courses", method: "list" });
    expect(list?.filters?.fields.find(({ path }) => path.join(".") === "credits")?.operators).toContain("gte");
    expect(list?.sort).toMatchObject({ default: "code:asc" });
    expect(list?.pagination).toMatchObject({ defaultPageSize: 20, maxPageSize: 1000 });
    expect(manifest.concepts.Course.relations).toEqual({});
  });

  test("the Scalar source differs from the canonical contract only by servers", async () => {
    const canonical = await readJson<Record<string, unknown>>(contractPath);
    const prepared = prepareScalarOpenApi(canonical, "https://data.pomi.ominira.dev");
    expect(prepared.servers).toEqual([
      { url: "https://data.pomi.ominira.dev", description: "POMI Data API" }
    ]);
    const keys = Object.keys(prepared).filter((key) => key !== "servers");
    expect(Object.fromEntries(keys.map((key) => [key, prepared[key]]))).toEqual(
      Object.fromEntries(keys.map((key) => [key, canonical[key]]))
    );
  });
});
