export function prepareScalarOpenApi<T extends Record<string, unknown>>(
  openApi: T,
  dataApiUrl: string
): T {
  const prepared = structuredClone(openApi);
  (prepared as Record<string, unknown>).servers = [
    { url: dataApiUrl, description: "POMI Data API" }
  ];
  return prepared;
}
