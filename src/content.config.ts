import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        concepts: z.array(z.string()).default([]),
        operations: z.array(z.string()).default([]),
        officialSources: z.array(z.string()).default([])
      })
    })
  })
};
