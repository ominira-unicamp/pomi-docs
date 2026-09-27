---
title: Primeira requisição
description: Consulte disciplinas públicas com uma chamada HTTP.
concepts:
  - Course
operations:
  - listCourses
---

A Data API está disponível em `https://data.pomi.ominira.dev` e suas operações
públicas não exigem autenticação.

```bash
curl --request GET \
  --header 'Accept: application/json' \
  'https://data.pomi.ominira.dev/courses?pageSize=20'
```

Listagens paginadas retornam `data`, `quantity`, `total` e `links`. Consulte a
[referência completa](/reference/data-api/) para conferir parâmetros e respostas
da versão documentada.
