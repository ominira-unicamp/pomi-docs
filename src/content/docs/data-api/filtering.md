---
title: Filtros e ordenação
description: Notação de filtros estruturados e termos de ordenação.
operations:
  - listCourses
  - listCatalogCourses
---

Filtros usam a notação `deepObject`:

```text
filter[credits][gte]=4
filter[unit][code]=IC
filter[id][in]=1,2,3
```

Os operadores incluem igualdade, diferença, comparações e listas conforme o
campo. Cada operação declara seus próprios campos, operadores e limites em
`x-pomi-filters`; não presuma que uma capability disponível em `/courses`
também exista em outro recurso.

Quando a operação declara ordenação, use termos separados por vírgula:

```text
catalogYear:desc,code:asc
```

Termos à esquerda possuem prioridade maior. A ordenação default também pertence
ao contrato da operação.
