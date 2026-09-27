import type { CatalogCourse, Course } from "@ominira/pomi-sdk/generated/data";

type CourseSnapshot = Pick<Course, "id" | "code" | "name" | "credits" | "prefix" | "unitId" | "unitCode">;
type CatalogCourseSnapshot = Pick<
  CatalogCourse,
  "id" | "catalogId" | "catalogYear" | "courseId" | "code" | "name" | "credits" | "offeringPeriod" | "evaluation" | "finalExam" | "minimumAttendancePercent" | "prerequisites"
>;

export const courseCatalogSnapshot = {
  capturedAt: "2026-09-27",
  request: {
    course: "/courses?filter[code][eq]=MC732&pageSize=1",
    catalogCourse: "/catalog-courses?filter[courseCode][eq]=MC732&pageSize=1"
  },
  course: {
    id: 15132,
    code: "MC732",
    name: "Projeto de Sistemas Computacionais",
    credits: 4,
    prefix: "MC",
    unitId: 123,
    unitCode: "IC"
  } satisfies CourseSnapshot,
  catalogCourse: {
    id: 10184,
    catalogId: 10,
    catalogYear: 2026,
    courseId: 15132,
    code: "MC732",
    name: "Projeto de Sistemas Computacionais",
    credits: 4,
    offeringPeriod: "ALL_PERIODS",
    evaluation: "GRADE_AND_ATTENDANCE",
    finalExam: true,
    minimumAttendancePercent: 75,
    prerequisites: {
      any: [
        { all: [
          { type: "COURSE", course: { courseId: 14120, fulfillment: "FULL" } },
          { type: "COURSE", course: { courseId: 15117, fulfillment: "FULL" } }
        ] }
      ]
    }
  } satisfies CatalogCourseSnapshot
};
