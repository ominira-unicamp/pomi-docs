---
title: Erros
description: Problem Details e correlação de requisições.
---

Erros HTTP estruturados usam `application/problem+json`. Campos como `type`,
`title`, `status` e `detail` permitem distinguir problemas sem interpretar
mensagens livres.

- `400`: parâmetros, filtros ou corpos inválidos;
- `404`: recurso solicitado não encontrado;
- `500`: a operação não pôde ser concluída.

Nem toda operação declara todos os grupos. Confira suas respostas na
[referência Data API](/reference/data-api/). O header `X-Request-ID`, quando
presente, pode ser informado ao suporte sem enviar corpo, token ou dados pessoais.
