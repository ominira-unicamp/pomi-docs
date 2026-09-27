import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("homepage, navigation, search and theme work", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/POMI Docs/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.getByRole("link", { name: /Fazer o tutorial/ }).click();
  await expect(page.getByRole("heading", { name: "Sua primeira integração" })).toBeVisible();
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) await menu.click({ force: true });
  await page.locator("starlight-theme-select:visible select").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const search = page.locator('button[aria-label="Pesquisar"]:visible');
  await expect(search).toBeEnabled();
  await search.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("reference page points to the Data API documentation", async ({ page }) => {
  await page.goto("/reference/data-api/");
  await expect(page.getByRole("link", { name: /Abrir a referência da Data API/ })).toHaveAttribute(
    "href",
    "https://data.pomi.ominira.dev/docs"
  );
});

test("semantic slice renders provenance, generated fields and prerequisite variants", async ({ page }) => {
  await page.goto("/domain/courses-and-catalogs/");
  await expect(page.getByText("Course", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("CatalogCourse", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Catalog", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como usar esses dados" })).toBeVisible();
  const contextualNavigation = page.getByRole("navigation", { name: "Seções desta página" });
  await expect(contextualNavigation.getByRole("link", { name: "Referência" })).toHaveAttribute(
    "href",
    "#technical-reference"
  );
  const courseSurface = page.locator("#using-course");
  await expect(courseSurface.getByRole("heading", { name: "Consultar disciplinas" })).toBeVisible();
  await expect(courseSurface.getByText("sdk.data.courses.list()", { exact: true })).toBeVisible();
  await expect(courseSurface.getByText("GET /courses", { exact: true })).toBeVisible();
  await expect(courseSurface.getByText(/filtros/, { exact: false }).first()).toBeVisible();
  await expect(courseSurface.getByText(/campos de ordenação/, { exact: false })).toBeVisible();
  await expect(courseSurface.getByText("Paginação", { exact: true })).toBeVisible();
  await expect(courseSurface.getByRole("link", { name: "API Reference ↗" })).toHaveAttribute(
    "href",
    "https://data.pomi.ominira.dev/docs"
  );

  const courseExample = page.locator("#example-course");
  const courseFilterExample = courseExample.locator("pre", { hasText: "credits" }).first();
  await expect(courseFilterExample).not.toBeVisible();
  await courseExample.locator("summary").focus();
  await courseExample.locator("summary").press("Enter");
  await expect(courseFilterExample).toBeVisible();

  const courseContract = page.locator("#contract-course");
  await expect(courseContract.getByRole("cell").filter({
    has: page.getByText("unit.code", { exact: true })
  })).not.toBeVisible();
  await courseContract.locator("summary").click();
  await expect(courseContract.getByRole("cell").filter({
    has: page.getByText("unit.code", { exact: true })
  })).toBeVisible();
  await expect(courseContract.getByText(/OpenAPI/, { exact: false })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Período de oferecimento" })).toBeVisible();

  const catalogCourseProvenanceDetails = page.locator("#provenance-catalog-course");
  const catalogCourseProvenance = catalogCourseProvenanceDetails.locator("summary");
  const catalogYearCell = catalogCourseProvenanceDetails.getByRole("cell").filter({
    has: page.getByText("catalogYear", { exact: true })
  }).first();
  await expect(catalogYearCell).not.toBeVisible();
  await catalogCourseProvenance.focus();
  await catalogCourseProvenance.press("Enter");
  await expect(catalogYearCell).toBeVisible();

  const payloadDetails = page.locator("details", {
    has: page.locator("summary", { hasText: "Ver payloads completos" })
  });
  const fullCatalogCoursePayload = payloadDetails.locator("pre", { hasText: "minimumAttendancePercent" });
  await expect(fullCatalogCoursePayload).not.toBeVisible();
  await payloadDetails.locator("summary").click();
  await expect(fullCatalogCoursePayload).toBeVisible();

  const catalogCourseContract = page.locator("#contract-catalog-course");
  await catalogCourseContract.locator("summary").click();
  await expect(catalogCourseContract.getByRole("heading", { name: "Oferecimento e avaliação" })).toBeVisible();
  const catalogCourseIdRow = catalogCourseContract.getByRole("row").filter({
    has: page.getByText("catalogId", { exact: true })
  });
  await expect(catalogCourseIdRow.getByText("Relacionado", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Próximos passos" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Turmas e períodos/ })).toHaveAttribute(
    "href",
    "/domain/classes-and-periods/"
  );

  await page.goto("/domain/prerequisites/");
  await expect(page.getByRole("heading", { name: "Tipos de item" })).toBeVisible();
  await expect(page.getByText("SPECIAL_REQUIREMENT", { exact: true })).toBeVisible();
  await expect(page.getByText("PROGRESSION_COEFFICIENT", { exact: true })).toBeVisible();

  await page.goto("/domain/provenance/");
  await expect(page.getByRole("heading", { name: "Quatro tempos diferentes" })).toBeVisible();
});

test("domain pages do not overflow the viewport", async ({ page }) => {
  for (const path of ["/domain/courses-and-catalogs/", "/domain/prerequisites/"]) {
    await page.goto(path);
    await page.locator("details").evaluateAll((details) => {
      for (const detail of details) (detail as HTMLDetailsElement).open = true;
    });
    const dimensions = await page.locator("html").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});

test("core pages have no serious accessibility violations", async ({ page }) => {
  for (const path of [
    "/",
    "/start/tutorial/",
    "/reference/data-api/",
    "/domain/provenance/",
    "/domain/courses-and-catalogs/",
    "/domain/prerequisites/"
  ]) {
    await page.goto(path);
    if (path === "/domain/courses-and-catalogs/" || path === "/domain/prerequisites/") {
      await page.locator("details").evaluateAll((details) => {
        for (const detail of details) (detail as HTMLDetailsElement).open = true;
      });
    }
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(({ impact }) => impact === "critical" || impact === "serious")).toEqual([]);
  }
});
