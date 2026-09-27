import { isApiError } from "@ominira/pomi-sdk";
import { sdk } from "./create-client.js";

try {
  await sdk.data.courses.get(42);
} catch (error) {
  if (isApiError(error)) {
    console.error(error.status, error.problem?.detail);
  }
}
