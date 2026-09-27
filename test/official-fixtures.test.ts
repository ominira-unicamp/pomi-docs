import { describe, expect, test } from "vitest";
import prerequisites from "./fixtures/official/prerequisites/mc732-2026.json";
import withoutSchedule from "./fixtures/official/classes/class-without-schedule.json";
import overCapacity from "./fixtures/official/classes/enrollment-over-capacity.json";
import electiveBlock from "./fixtures/official/curriculum/elective-credit-block.json";
import normalizedVariants from "./fixtures/official/prerequisites/normalized-variants.json";

describe("officially grounded documentation fixtures", () => {
  test("preserves prerequisite alternatives and conjunctions", () => {
    expect(prerequisites.representation.any).toHaveLength(2);
    expect(prerequisites.representation.any[0].all).toEqual(["MC102", "MC202"]);
    expect(prerequisites.expected).toBe("(MC102 AND MC202) OR AA200");
  });

  test("covers full, partial, authorization and progression requirements", () => {
    type Item =
      | { type: "COURSE"; course: { courseId: number | null; fulfillment: string } }
      | { type: "SPECIAL_REQUIREMENT"; specialRequirement: { type: string } };
    const groups = normalizedVariants.representation.any as Array<{ all: unknown[] }>;
    const items = groups.flatMap(({ all }) => all) as Item[];
    const courses = items.filter(
      (item): item is Extract<Item, { type: "COURSE" }> => item.type === "COURSE"
    );
    expect(courses.map(({ course }) => course.fulfillment)).toEqual(["FULL", "PARTIAL"]);
    const specialRequirements = items.filter(
      (item): item is Extract<Item, { type: "SPECIAL_REQUIREMENT" }> =>
        item.type === "SPECIAL_REQUIREMENT"
    );
    expect(
      specialRequirements.map(({ specialRequirement }) => specialRequirement.type)
    ).toEqual(["AUTHORIZATION", "PROGRESSION_COEFFICIENT"]);
  });

  test("accepts a class without schedules", () => {
    expect(withoutSchedule.class.schedules).toEqual([]);
    expect(withoutSchedule.expectedValid).toBe(true);
  });

  test("does not treat nominal capacity as an invariant", () => {
    expect(overCapacity.class.enrolledCount).toBeGreaterThan(overCapacity.class.nominalSeats);
    expect(overCapacity.expectedValid).toBe(true);
  });

  test("preserves elective credit requirements as an open choice", () => {
    expect(electiveBlock.block.requiredCredits).toBe(24);
    expect(electiveBlock.block.openChoice).toBe(true);
    expect(electiveBlock.expectedClosedCourseList).toBe(false);
  });
});
