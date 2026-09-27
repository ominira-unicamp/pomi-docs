---
title: Paginação
description: Navegue por páginas usando os links devolvidos pela API.
operations:
  - listCourses
---

```json
{
  "data": [],
  "quantity": 20,
  "total": 100,
  "links": {
    "self": "...",
    "first": "...",
    "last": "...",
    "next": "...",
    "previous": null
  }
}
```

`quantity` é a quantidade retornada na página; `total` é a quantidade total que
corresponde à consulta. Prefira seguir `links.next` e `links.previous` em vez de
reconstruir URLs.

Suporte a `pageSize=all`, tamanho default e limite máximo varia conforme
`x-pomi-pagination` da operação.
