import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.pomi.ominira.dev",
  integrations: [
    starlight({
      title: "POMI Docs",
      description: "Dados acadêmicos públicos da Unicamp, explicados e programáveis.",
      locales: { root: { label: "Português (Brasil)", lang: "pt-BR" } },
      logo: { src: "./src/assets/pomi-logo.svg", alt: "POMI" },
      favicon: "/favicon.svg",
      customCss: ["@fontsource-variable/outfit", "./src/styles/custom.css"],
      editLink: {
        baseUrl: "https://github.com/ominira-unicamp/pomi-docs/edit/main/"
      },
      lastUpdated: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      components: { Footer: "./src/components/PageFooter.astro" },
      head: [
        {
          tag: "script",
          content: `function makeScrollableRegionsFocusable(){document.querySelectorAll('pre').forEach((element)=>{if(element.scrollWidth>element.clientWidth)element.tabIndex=0})}document.addEventListener('DOMContentLoaded',makeScrollableRegionsFocusable);document.addEventListener('astro:page-load',makeScrollableRegionsFocusable);`
        }
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ominira-unicamp/pomi-docs"
        }
      ],
      sidebar: [
        {
          label: "Comece aqui",
          items: [
            { label: "O que é o POMI", slug: "introduction/overview" },
            { label: "Tutorial: primeira integração", slug: "start/tutorial" },
            { label: "HTTP ou SDK", slug: "introduction/integration" }
          ]
        },
        {
          label: "Entendendo os dados",
          items: [
            { label: "Visão geral", slug: "domain/overview" },
            { label: "Fontes e proveniência", slug: "domain/provenance" },
            { label: "Disciplinas e catálogos", slug: "domain/courses-and-catalogs" },
            { label: "Pré-requisitos", slug: "domain/prerequisites" },
            { label: "Currículos", slug: "domain/curricula" },
            { label: "Turmas e períodos", slug: "domain/classes-and-periods" }
          ]
        },
        {
          label: "Data API",
          items: [
            { label: "Primeira requisição", slug: "data-api/first-request" },
            { label: "Convenções", slug: "data-api/conventions" },
            { label: "Filtros e ordenação", slug: "data-api/filtering" },
            { label: "Paginação", slug: "data-api/pagination" },
            { label: "Erros", slug: "data-api/errors" }
          ]
        },
        {
          label: "SDK TypeScript",
          items: [{ label: "Primeiros passos", slug: "sdk/getting-started" }]
        },
        {
          label: "Referência",
          items: [
            { label: "Data API", slug: "reference/data-api" },
            { label: "Fontes oficiais", slug: "introduction/official-sources" }
          ]
        }
      ]
    })
  ]
});
