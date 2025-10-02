# Obsidian → MkDocs Distributor

A small Python helper that copies Markdown notes from a single Obsidian vault
into the three MkDocs starter repos provided in this project. Notes are routed
by the `arm` key in their YAML frontmatter:

```yaml
---
title: Logos Insertion Hypothesis
arm: research      # public | research | private
slug: logos-insertion-hypothesis
---
```

## Requirements

* Python 3.9+
* [PyYAML](https://pyyaml.org/) (`pip install pyyaml`)

## Usage

1. Clone or unzip the MkDocs starters (`mkdocs-public`, `mkdocs-research`,
   `mkdocs-private`) next to your Obsidian vault.
2. From inside your vault directory, run:

   ```bash
   export PUB_REPO=../mkdocs-public
   export RES_REPO=../mkdocs-research
   export PRI_REPO=../mkdocs-private
   python /path/to/distribute.py
   ```

   The environment variables are optional; the defaults above are used if they
   are not set.
3. Commit and push each MkDocs repo (GitHub Actions will build and deploy to
   Cloudflare Pages using the provided workflow).

## What the script does

* Creates the `docs/` folder (and common asset directories) in each target
  repository if needed.
* Copies every Markdown file from the vault into the appropriate repo based on
  the `arm` frontmatter (defaulting to `research`).
* Mirrors shared asset folders (`assets`, `img`, `images`, `figures`,
  `attachments`) into each repo so embedded media keeps working.

## Extending the routing rules

The logic lives in `Distributor.resolve_arm`. You can edit that function to
implement more complex routing (e.g., tag-based, per-folder, etc.).
