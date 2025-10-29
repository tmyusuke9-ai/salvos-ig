# Integração com Instagram Graph API (oficial)

Para usar o provider oficial (Graph API):

1. Transforme sua conta em **Instagram Business/Creator** vinculada a uma **Facebook Page**.
2. No **Meta for Developers**, crie um App e habilite as permissões necessárias (ex.: `instagram_basic`, `pages_show_list`, `instagram_manage_insights` — conforme escopo do Business Discovery).
3. Gere um **User Token** com acesso à Page e ao **IG User** correspondente. Opcionalmente troque por **Long-Lived Token**.
4. Descubra o `IG_GRAPH_USER_ID` (o ID do usuário Instagram Business).
5. Preencha `.env` com:

IG_GRAPH_ACCESS_TOKEN=seu_token
IG_GRAPH_USER_ID=1234567890123456

### Como funciona o Business Discovery
A v1 usa a rota:
GET /v20.0/{ig_user_id}?fields=business_discovery.username({username}){media.limit(N){caption,media_type,media_url,permalink,thumbnail_url,timestamp}}
Isso retorna mídia pública do perfil consultado para montar o acervo de referências.

Importante: o IG User (dono do token) precisa ter permissão de Business Discovery. Consulte a doc oficial: https://developers.facebook.com/docs/instagram-api/reference/ig-user/business_discovery

### Teste rápido
1. Suba a API local (ver README).
2. Crie um perfil:

curl -X POST http://localhost:4000/api/profiles \
  -H 'Content-Type: application/json' \
  -d '{
    "handle": "instagram",
    "profileUrl": "https://www.instagram.com/instagram/",
    "category": "Marketing",
    "tags": ["case"]
  }'

3. Faça ingest dos últimos posts:

curl -X POST http://localhost:4000/api/profiles/<ID_DO_PERFIL>/refresh

4. Liste a mídia:

curl "http://localhost:4000/api/media?type=REEL&category=Marketing"
