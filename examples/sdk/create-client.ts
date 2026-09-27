import { createPomiSdk } from "@ominira/pomi-sdk";

export const sdk = createPomiSdk({
  dataApiUrl: "https://data.pomi.ominira.dev",
  appApiUrl: "https://app.pomi.ominira.dev"
});
