import { sdk } from "./create-client.js";

for await (const page of sdk.data.courses.pages({ pageSize: 100 })) {
  for (const course of page.data) {
    console.log(course.code);
  }
}

const allCourses = await sdk.data.courses.listAll();
console.log(allCourses.length);
