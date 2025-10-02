#!/usr/bin/env python3
"""Distribute Obsidian Markdown files into separate MkDocs repos.

Usage (run from inside your vault directory):

    python /path/to/distribute.py

The script expects the following environment variables to point to the
matching MkDocs repos (defaults shown below):

    PUB_REPO=../mkdocs-public
    RES_REPO=../mkdocs-research
    PRI_REPO=../mkdocs-private

Each note can declare an ``arm`` in its YAML frontmatter.  Supported values
are ``public``, ``research`` and ``private``.  Notes without ``arm`` default to
``research``.
"""
from __future__ import annotations

import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Tuple

try:
    import yaml  # type: ignore
except ModuleNotFoundError as exc:  # pragma: no cover - dependency missing at runtime
    raise SystemExit(
        "PyYAML is required. Install it with `pip install pyyaml`."
    ) from exc


ARM_PUBLIC = "public"
ARM_RESEARCH = "research"
ARM_PRIVATE = "private"
DEFAULT_ARM = ARM_RESEARCH

ASSET_DIRS = {"assets", "img", "images", "figures", "attachments"}
IGNORE_TOP_LEVEL = {".obsidian", ".git", "node_modules"}
MARKDOWN_SUFFIXES = {".md", ".markdown"}


@dataclass
class RepoTarget:
    name: str
    path: Path

    def docs_path(self) -> Path:
        return self.path / "docs"


class Distributor:
    def __init__(self, vault: Path, repos: Dict[str, RepoTarget]) -> None:
        self.vault = vault
        self.repos = repos

    # Frontmatter -----------------------------------------------------
    @staticmethod
    def parse_frontmatter(md_path: Path) -> Tuple[Dict[str, object], str]:
        text = md_path.read_text(encoding="utf-8", errors="ignore")
        match = re.match(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n", text, re.DOTALL)
        if not match:
            return {}, text

        fm_raw = match.group(1)
        body = text[match.end() :]
        try:
            data = yaml.safe_load(fm_raw) or {}
            if not isinstance(data, dict):
                data = {}
        except yaml.YAMLError:
            data = {}
        return data, body

    # Utilities -------------------------------------------------------
    @staticmethod
    def slugify_relative(path: Path) -> Path:
        cleaned_parts = []
        for part in path.parts:
            safe = re.sub(r"[^\w\-. ]+", "", part)
            safe = safe.strip()
            cleaned_parts.append(safe or part)
        return Path(*cleaned_parts)

    def ensure_repo_structure(self) -> None:
        for target in self.repos.values():
            target.docs_path().mkdir(parents=True, exist_ok=True)
            for asset in ASSET_DIRS:
                (target.docs_path() / asset).mkdir(parents=True, exist_ok=True)

    def should_skip(self, rel_path: Path) -> bool:
        if not rel_path.parts:
            return False
        top = rel_path.parts[0]
        return top in IGNORE_TOP_LEVEL or top.startswith(".")

    def resolve_arm(self, meta: Dict[str, object]) -> RepoTarget:
        arm = str(meta.get("arm", "")).strip().lower()
        target = self.repos.get(arm)
        if target is None:
            target = self.repos[DEFAULT_ARM]
        return target

    # Copying ---------------------------------------------------------
    def copy_markdown(self, src: Path, dest_repo: RepoTarget, rel: Path) -> None:
        dest_path = dest_repo.docs_path() / rel
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest_path)

    def copy_assets(self) -> None:
        for asset_dir in ASSET_DIRS:
            source = self.vault / asset_dir
            if source.exists() and source.is_dir():
                for target in self.repos.values():
                    shutil.copytree(source, target.docs_path() / asset_dir, dirs_exist_ok=True)

    def distribute(self) -> None:
        self.ensure_repo_structure()
        for md in self.iter_markdown():
            rel = md.relative_to(self.vault)
            if self.should_skip(rel):
                continue
            meta, _ = self.parse_frontmatter(md)
            repo = self.resolve_arm(meta)
            safe_rel = self.slugify_relative(rel)
            self.copy_markdown(md, repo, safe_rel)
        self.copy_assets()

    # Iteration -------------------------------------------------------
    def iter_markdown(self) -> Iterable[Path]:
        for path in self.vault.rglob("*"):
            if path.is_file() and path.suffix.lower() in MARKDOWN_SUFFIXES:
                yield path


def build_repos_from_env() -> Dict[str, RepoTarget]:
    vault = Path.cwd()
    default_paths = {
        ARM_PUBLIC: Path(os.environ.get("PUB_REPO", "../mkdocs-public")),
        ARM_RESEARCH: Path(os.environ.get("RES_REPO", "../mkdocs-research")),
        ARM_PRIVATE: Path(os.environ.get("PRI_REPO", "../mkdocs-private")),
    }
    repos: Dict[str, RepoTarget] = {}
    for arm, path in default_paths.items():
        repos[arm] = RepoTarget(arm, (vault / path).resolve()) if not path.is_absolute() else RepoTarget(arm, path)
    return repos


def main() -> None:
    vault = Path.cwd()
    repos = build_repos_from_env()
    distributor = Distributor(vault, repos)
    distributor.distribute()
    print("Distributed notes into:")
    for arm, target in repos.items():
        print(f" - {arm}: {target.docs_path()}")


if __name__ == "__main__":
    main()
