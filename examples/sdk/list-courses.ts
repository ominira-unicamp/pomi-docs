import { sdk } from "./create-client.js";

const page = await sdk.data.courses.list({
  filter: {
    credits: { gte: 4 },
    unit: { code: { eq: "IC" } }
  }
});

for (const course of page.data) {
  console.log(course.code, course.name);
}
