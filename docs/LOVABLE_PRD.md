# PRD — Front v1 (Lovable) para Instagram Ref Hub

## Objetivo
Construir uma interface simples em **Lovable** (low-code) para o time navegar pelas referências do Instagram cadastradas via backend.

## Requisitos
- Sidebar com **categorias** (Marketing, Growth, Negócios, Finanças, etc.).
- Área principal com **cards** exibindo os posts (permalink/thumbnail/caption).
- **Filtros** por *type* (REEL/CARROSSEL/ESTATICO) e por *tag*.
- Paginação simples (Próximo/Anterior).
- Campo opcional para **inserir novo perfil** (POST /api/profiles).

## Endpoints do Backend (já prontos)
- `GET /api/media?category=&type=&tag=&page=&limit=` — lista paginada
- `GET /api/media/:id` — detalhe
- `PATCH /api/media/:id` — editar metadados (type/tags/category/caption)
- `POST /api/profiles` — criar perfil (handle/profileUrl/category/tags)
- `POST /api/profiles/:id/refresh` — ingerir últimos posts do perfil

## Estrutura de telas (Lovable)
1) **Home** (Lista)
   - Sidebar: lista de categorias únicas (pode ser estática na v1).
   - Barra de filtros: `type` (select), `tag` (input), `page` (num), `limit` (num).
   - Grid de cards: cada card com **link** (permalink), **caption** (resumo), **type**, **tags**.

2) **Detalhe** (opcional na v1)
   - Ao clicar no card, abre modal com caption completa e campos de edição (PATCH /api/media/:id).

3) **Cadastrar perfil** (opcional v1)
   - Form simples (handle, profileUrl, category, tags). Envia POST /api/profiles.

## Mapeamento de dados (card)
- `mediaUrl` → usar como **link** do post (target=_blank).
- `thumbnailUrl` → usar como **imagem** do card (quando existir).
- `caption` → limitar a ~140 chars com “...” no card.
- `type`/`category`/`tags` → badges visuais.
- `publishedAt` → data exibida pequena (se houver).

## Regras de negócio
- Categorias são livres e vêm do **Profile** de origem; na lista de mídia, usamos `category` do item.
- `type` pode ser ajustado manualmente (PATCH).
- Tags são livres (array string).

## Roadmap curto (v1 → v1.1)
- [v1] Lista + filtros + abrir permalink.
- [v1] PATCH inline de tags/type.
- [v1.1] Botão "Atualizar perfil" chamando `/profiles/:id/refresh`.
- [v1.1] Busca por caption/transcrição (depende do backend).

## Observações
- Evitar dependência de bibliotecas externas no Lovable; usar os componentes padrão.
- Tratar erros de API com mensagens simples ("tente novamente").
- Respeitar rate-limits do backend.
