# API Examples (HTTP) — Instagram Ref Hub

Base URL: `http://localhost:4000`

## List media (with filters)
```bash
curl "http://localhost:4000/api/media?category=Marketing&type=REEL&tag=gancho&page=1&limit=20"
```

## Get media by id
```bash
curl "http://localhost:4000/api/media/<MEDIA_ID>"
```

## Patch media (edit type/tags/category/caption)
```bash
curl -X PATCH http://localhost:4000/api/media/<MEDIA_ID> \n  -H 'Content-Type: application/json' \n  -d '{
    "type": "REEL",
    "tags": ["gancho", "script"],
    "category": "Growth"
  }'
```

## Create profile
```bash
curl -X POST http://localhost:4000/api/profiles \n  -H 'Content-Type: application/json' \n  -d '{
    "handle": "instagram",
    "profileUrl": "https://www.instagram.com/instagram/",
    "category": "Marketing",
    "tags": ["case"]
  }'
```

## Refresh profile
```bash
curl -X POST http://localhost:4000/api/profiles/<PROFILE_ID>/refresh
```
