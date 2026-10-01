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
  await expect(page.getByRole("heading", { name: "Como consultar esses dados" })).toBeVisible();
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

  await expect(page.getByRole("heading", { name: "Período de oferecimento" })).toBeVisible();
  const evaluationSection = page.locator("#enum-CourseEvaluationMode").locator("..");
  await expect(evaluationSection.locator(".semantic-value")).toHaveCount(3);
  await expect(evaluationSection.getByText("Fonte:", { exact: false })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Carga horária", exact: true })).toBeVisible();
  await expect(page.getByText(/representa o vetor de carga horária publicado/)).toBeVisible();

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
  await expect(catalogCourseContract.getByRole("link", { name: /Explicação de carga horária/ })).toHaveAttribute(
    "href",
    "#catalog-workload"
  );

  await expect(page.getByRole("heading", { name: "Continue lendo" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("catalogo-disciplinas");
  await expect(page.getByRole("main")).not.toContainText("catalog-disciplines");
  await expect(page.getByRole("main")).not.toContainText("Sem descrição adicional");

  await page.goto("/domain/prerequisites/");
  await expect(page.getByRole("heading", { name: "Tipos de item" })).toBeVisible();
  await expect(page.getByText("SPECIAL_REQUIREMENT", { exact: true })).toBeVisible();
  await expect(page.getByText("PROGRESSION_COEFFICIENT", { exact: true })).toBeVisible();

  await page.goto("/domain/provenance/");
  await expect(page.getByRole("heading", { name: "Quatro tempos diferentes" })).toBeVisible();
});

test("curriculum slice explains History variants, requirements and technical access", async ({ page }) => {
  await page.goto("/domain/curricula/");
  await expect(page.getByRole("heading", { name: "Currículos e propostas de cumprimento" })).toBeVisible();
  await expect(page.getByText("curso 19 — História", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Currículo Pleno" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Proposta para cumprimento" })).toBeVisible();
  await expect(page.getByText("AA", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("AB", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/186 créditos/)).toBeVisible();
  await expect(page.getByText(/240 créditos/)).toBeVisible();

  const catalogProgramSurface = page.locator("#using-catalog-program");
  await expect(catalogProgramSurface.getByRole("heading", { name: "Obter o currículo publicado" })).toBeVisible();
  await expect(catalogProgramSurface.getByText("sdk.data.catalogPrograms.list()", { exact: true })).toBeVisible();
  await expect(catalogProgramSurface.getByText("GET /catalog-program", { exact: true })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("Consultar História no Catálogo 2026");

  const shift = page.locator("#field-enum-CatalogProgram-shift");
  await expect(shift.locator(".semantic-value")).toHaveCount(2);
  await expect(page.getByText(/36 créditos por período letivo/).first()).toBeVisible();

  const requirements = page.locator("#union-CourseRequirement");
  await expect(requirements.getByText("any", { exact: true })).toBeVisible();
  await expect(requirements.getByText("prefix", { exact: true })).toBeVisible();
  await expect(requirements.getByText("specific", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Opção por língua estrangeira", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("p").filter({ hasText: "não diferencia explicitamente habilitação de ênfase" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Primeiro semestre sugerido" })).toBeVisible();
  await expect(page.getByText("electiveCredits: 0", { exact: true })).toBeVisible();
  await expect(page.getByText(/20 \+ 16 × 0,75 = 32 créditos/)).toBeVisible();

  const payload = page.locator("details", {
    has: page.locator("summary", { hasText: "Ver exemplos de currículo e proposta" })
  });
  await expect(payload.locator("pre", { hasText: "HH183" }).first()).not.toBeVisible();
  await payload.locator("summary").click();
  await expect(payload.locator("pre", { hasText: "HH183" }).first()).toBeVisible();

  const catalogProgramContract = page.locator("#contract-catalog-program");
  await catalogProgramContract.locator("summary").click();
  await expect(catalogProgramContract.getByRole("link", { name: "Explicação do turno" }))
    .toHaveAttribute("href", "#field-enum-CatalogProgram-shift");
  await expect(page.getByRole("main")).not.toContainText("catalog-programs →");
  await expect(page.getByRole("main")).not.toContainText("Sem descrição adicional");
});

test("understanding-data section exposes every domain slice", async ({ page }) => {
  await page.goto("/domain/overview/");
  for (const name of [
    "Estrutura acadêmica",
    "Disciplinas e catálogos",
    "Pré-requisitos",
    "Currículos",
    "Turmas e horários",
    "Docentes",
    "Calendário acadêmico",
    "Restaurante universitário",
    "Intercâmbio"
  ]) {
    await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
  }

  await page.goto("/domain/classes-and-periods/");
  await expect(page.getByText("Course", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Class", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("FIRST_SEMESTER", { exact: true })).toBeVisible();
  await expect(page.getByText(/Ausência de horário não significa ausência da turma/)).toBeVisible();

  await page.goto("/domain/professors/");
  await expect(page.getByText("ProfessorDataPortalProfile", { exact: true }).first()).toBeVisible();
  await expect(
    page.locator("#union-AcademicPositionAffiliation").getByText("POSTDOCTORAL_PROGRAM", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "rejeita relações ambíguas" })).toBeVisible();

  await page.goto("/domain/calendar/");
  await expect(page.locator(".takeaway").filter({ hasText: "StudyPeriod identifica um período acadêmico" })).toBeVisible();

  await page.goto("/domain/daily-menus/");
  await expect(page.locator("#enum-MealStatus").getByText("NOT_REGISTERED", { exact: true })).toBeVisible();
  await expect(page.getByText(/não necessariamente uma falha de coleta/)).toBeVisible();

  await page.goto("/domain/exchange/");
  await expect(page.getByText("registrationOriginalText", { exact: true }).first()).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "não deve corrigir silenciosamente" })).toBeVisible();
});

test("domain pages do not overflow the viewport", async ({ page }) => {
  for (const path of [
    "/domain/overview/",
    "/domain/academic-structure/",
    "/domain/courses-and-catalogs/",
    "/domain/prerequisites/",
    "/domain/curricula/",
    "/domain/classes-and-periods/",
    "/domain/professors/",
    "/domain/calendar/",
    "/domain/daily-menus/",
    "/domain/exchange/"
  ]) {
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
  test.setTimeout(90_000);
  for (const path of [
    "/",
    "/start/tutorial/",
    "/reference/data-api/",
    "/domain/provenance/",
    "/domain/courses-and-catalogs/",
    "/domain/prerequisites/",
    "/domain/curricula/",
    "/domain/academic-structure/",
    "/domain/classes-and-periods/",
    "/domain/professors/",
    "/domain/calendar/",
    "/domain/daily-menus/",
    "/domain/exchange/"
  ]) {
    await page.goto(path);
    if (path.startsWith("/domain/")) {
      await page.locator("details").evaluateAll((details) => {
        for (const detail of details) (detail as HTMLDetailsElement).open = true;
      });
    }
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(({ impact }) => impact === "critical" || impact === "serious")).toEqual([]);
  }
});
