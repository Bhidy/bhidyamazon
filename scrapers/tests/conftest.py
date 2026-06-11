"""pytest config for the scraper parser tests.

parse.py lives in scrapers/ and is imported as a bare module (`import parse`,
not a package), so the scrapers/ directory must be on sys.path before the
test modules are collected.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

TESTS_DIR = Path(__file__).resolve().parent
SCRAPERS_DIR = TESTS_DIR.parent
FIXTURES_DIR = TESTS_DIR / "fixtures"

if str(SCRAPERS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPERS_DIR))


def load_fixture_text(name: str) -> str:
    """Read a fixture file from scrapers/tests/fixtures/ as UTF-8 text."""
    return (FIXTURES_DIR / name).read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def load_fixture():
    """Fixture-loading helper: load_fixture('file.html') -> str."""
    return load_fixture_text


@pytest.fixture(scope="session")
def bestsellers_html() -> str:
    return load_fixture_text("bestsellers_sample.html")


@pytest.fixture(scope="session")
def product_html() -> str:
    return load_fixture_text("product_sample.html")
