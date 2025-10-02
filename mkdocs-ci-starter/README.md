# MkDocs + Cloudflare Pages CI Starter (3 arms)

Folders:
- mkdocs-public
- mkdocs-research
- mkdocs-private

Each contains:
- mkdocs.yml
- docs/index.md
- requirements.txt
- .github/workflows/deploy.yml

Configure repo secrets per arm:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- CF_PAGES_PROJECT (unique per repo)

Push to main → GitHub Action builds → Cloudflare Pages deploys.
