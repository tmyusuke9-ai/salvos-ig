# Instagram Ref Hub — Backend v1

API para centralizar referências de perfis e conteúdos do Instagram conforme PRD.

## Requisitos
- Node 20+
- Docker (para Postgres/Redis)

## Setup
1. `cp .env.example .env` e ajuste variáveis
2. `docker compose up -d`
3. `npm i`
4. `npm run generate && npm run migrate`
5. `npm run dev`

Healthcheck: `GET http://localhost:4000/health`

## Fluxos principais
### 1) Cadastrar perfil
`POST /api/profiles`
```json
{
  "handle": "nomeDoPerfil",
  "profileUrl": "https://www.instagram.com/nomeDoPerfil/",
  "category": "Marketing",
  "tags": ["gancho", "script", "case"]
}
```

### 2) Atualizar (ingest) últimos posts do perfil
`POST /api/profiles/:id/refresh`

### 3) Listar mídia com filtros
`GET /api/media?category=Marketing&type=REEL&tag=gancho&page=1&limit=20`

### 4) Editar metadados manualmente
`PATCH /api/media/:id`
```json
{ "type": "REEL", "tags": ["gancho", "aula"], "category": "Growth" }
```

### 5) Transcrição de vídeo (placeholder)
`POST /api/media/:id/transcribe`

## Providers Instagram
- `GraphApiProvider`: precisa `IG_GRAPH_ACCESS_TOKEN` e `IG_GRAPH_USER_ID`
- `DownloaderProvider`: defina `DOWNLOADER_API_BASE` + `DOWNLOADER_API_KEY`

> Importante: respeitar ToS do Instagram.

## Integração com Lovable
Consuma os endpoints `/api/*` para montar a UI (sidebar categorias, cards etc.).

## Próximos passos
- Implementar providers (Graph/Downloader)
- Endpoint de download de mídia
- Fila BullMQ para ingest/transcrição
- Autenticação/ACL
