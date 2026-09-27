---
title: Convenções da Data API
description: URLs, tipos, valores nulos, paginação e estabilidade do contrato público.
---

A Data API usa JSON, nomes de propriedades em `camelCase` e identificadores numéricos. Coleções usam substantivos no plural, como `/courses`; membros acrescentam o identificador, como `/courses/15132`.

## Ausente não é o mesmo que nulo

Um campo obrigatório pode aceitar `null` quando a fonte pública não fornece aquele valor. Um campo ausente não deve ser interpretado automaticamente como nulo: consulte o schema OpenAPI para saber se ele é obrigatório.

## Datas e enums

Datas e instantes são strings nos formatos declarados pelo schema. Valores enumerados, como `ALL_PERIODS`, são parte do contrato e devem ser tratados de forma exaustiva ou com um fallback seguro.

## Coleções

Respostas paginadas contêm `data`, `quantity`, `total` e `links`. Use os links fornecidos pela API; eles preservam filtros e ordenação e evitam que o cliente reproduza regras de navegação.

## Evolução

O snapshot OpenAPI versionado neste portal é a fonte do contrato documentado. Confira as versões exibidas na página inicial e gere novamente o SDK quando adotar uma versão nova do contrato.
