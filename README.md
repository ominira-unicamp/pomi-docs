# POMI Docs

Portal público da Data API do POMI. O projeto combina o contrato OpenAPI, fontes
oficiais da Unicamp e conteúdo conceitual escrito em português.

## Requisitos

- Node.js 24;
- npm;
- checkout do `pomi-backend` somente para sincronizar ou conferir o contrato.

## Desenvolvimento

```bash
npm ci
npm run dev
```

O build normal usa o snapshot versionado e não consulta a API de produção.

## Contratos

Para atualizar o OpenAPI a partir do commit atual do backend:

```bash
npm run contracts:sync -- --backend ../pomi-backend
```

Para conferir o snapshot sem modificá-lo:

```bash
npm run contracts:check -- --backend ../pomi-backend
```

Revise sempre o diff do OpenAPI, o manifesto gerado e as páginas afetadas.

## Validação

```bash
npm run validate
```

Esse comando valida fontes, OpenAPI, manifesto, conteúdo, exemplos TypeScript,
build e links internos.

## Publicação

O Vercel publica o portal estático. A referência interativa fica em
`https://data.pomi.ominira.dev/docs`; o portal de conceitos não embute um
cliente de requisições nem depende de CDN.

O projeto, as variáveis públicas e o domínio são declarados em `pomi-infra`.
No primeiro provisionamento, revise e aplique o plano, consulte a verificação do
domínio apresentada pelo Vercel, crie o registro DNS correspondente no
Cloudflare e confirme a associação em um novo plano. A criação do DNS continua
manual; nenhum apply de infraestrutura é executado a partir deste repositório.

## Licença e fontes oficiais

O código e o conteúdo original usam AGPL-3.0. Materiais externos vinculados
mantêm seus próprios direitos; consulte `NOTICE.md`.
