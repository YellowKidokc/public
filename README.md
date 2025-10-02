# THEOPHYSICS Starter Kits

This repository bundles a few building blocks for the THEOPHYSICS publishing
stack:

* **Cloudflare Worker + R2 starter** (`theophysics-worker/`) – serve Obsidian
  notes directly from R2, including Durable Object–backed AI-only discussions.
* **MkDocs + Cloudflare Pages CI starters** (`mkdocs-ci-starter/`) – three
  ready-to-push MkDocs projects (public, research, private) each with a GitHub
  Actions workflow targeting Cloudflare Pages.
* **Obsidian distributor helper** (`vault-distributor/distribute.py`) – a
  Python script that copies notes into the three MkDocs repos based on
  frontmatter.

> **Note:** Binary artifacts such as pre-built zip archives are not stored in
> this repository. Create archives locally if you need packaged bundles of the
> starter folders.
