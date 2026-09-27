import { provenancePath, provenanceSchemaPath } from "./paths.ts";
import { readValidatedJson } from "./structured-data.ts";

export type LineageOrigin =
  | "source"
  | "normalized"
  | "derived"
  | "linked"
  | "pomi-generated"
  | "parsed"
  | "aggregated"
  | "unspecified";

export type DataProvenance = {
  schemaVersion: 1;
  requiredConcepts: string[];
  concepts: Record<
    string,
    {
      nature: "institutional-concept" | "pomi-abstraction";
      summary: string;
      semanticAuthorities: Array<{ sourceId: string; referenceLabels?: string[] }>;
      operationalSources: Array<{ sourceId: string; collector: string; injection: string }>;
      limitations: string[];
      fields: Record<
        string,
        {
          lineage: Array<{
            origin: LineageOrigin;
            sourceId?: string;
            sourceField?: string;
            note?: string;
          }>;
        }
      >;
    }
  >;
};

export function loadDataProvenance(): Promise<DataProvenance> {
  return readValidatedJson<DataProvenance>(provenancePath, provenanceSchemaPath);
}
