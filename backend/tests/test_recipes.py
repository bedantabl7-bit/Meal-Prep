"""Tests for Recipe Generator API (iteration 2)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://instant-recipe.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health
def test_root(client):
    r = client.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "Recipe" in r.json().get("message", "")


# --- Local recipe match (backward compat single-recipe endpoint)
def test_local_aloo_jeera(client):
    r = client.post(f"{BASE_URL}/api/recipes/generate",
                    json={"ingredients": ["potato", "cumin", "turmeric"], "cuisine": "indian"})
    assert r.status_code == 200
    d = r.json()
    assert d["source"] == "local"
    assert d["title"] == "Aloo Jeera"
    assert len(d["steps"]) > 0


# --- AI fallback
def test_ai_fallback_global(client):
    r = client.post(f"{BASE_URL}/api/recipes/generate",
                    json={"ingredients": ["chicken", "lemon", "thyme", "rosemary"], "cuisine": "global"},
                    timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["source"] == "ai"
    assert len(d["steps"]) >= 3


def test_empty_ingredients(client):
    r = client.post(f"{BASE_URL}/api/recipes/generate",
                    json={"ingredients": [], "cuisine": "indian"})
    assert r.status_code == 400


# --- Suggestions endpoint (3 recipes)
def test_suggest_three_indian(client):
    r = client.post(f"{BASE_URL}/api/recipes/suggest",
                    json={"ingredients": ["potato", "onion", "tomato"], "cuisine": "indian"},
                    timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "suggestions" in d
    suggestions = d["suggestions"]
    assert isinstance(suggestions, list)
    assert len(suggestions) == 3, f"expected 3 got {len(suggestions)}"
    for s in suggestions:
        for k in ["id", "title", "cook_time", "difficulty", "have", "missing", "steps", "source"]:
            assert k in s, f"missing {k}"
        assert s["source"] in ("local", "ai")
        assert isinstance(s["steps"], list) and len(s["steps"]) > 0
        assert isinstance(s["have"], list)
        assert isinstance(s["missing"], list)
    # titles should be distinct
    titles = [s["title"].lower() for s in suggestions]
    assert len(set(titles)) == len(titles), f"duplicate titles: {titles}"


def test_suggest_empty_400(client):
    r = client.post(f"{BASE_URL}/api/recipes/suggest",
                    json={"ingredients": [], "cuisine": "indian"})
    assert r.status_code == 400


# --- YouTube embed (iter3: must scrape concrete videoId, no listType=search)
import re as _re

def test_youtube_embed_indian(client):
    r = client.post(f"{BASE_URL}/api/recipes/youtube",
                    json={"title": "Aloo Jeera", "cuisine": "indian"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "embed_url" in d and "search_query" in d
    assert d["embed_url"].startswith("https://www.youtube-nocookie.com/embed/"), d["embed_url"]
    assert "listType=search" not in d["embed_url"]
    m = _re.match(r"https://www\.youtube-nocookie\.com/embed/([A-Za-z0-9_-]{11})\?", d["embed_url"])
    assert m, f"no 11-char videoId in embed_url: {d['embed_url']}"
    assert "rel=0" in d["embed_url"]
    assert "Aloo" in d["search_query"] or "aloo" in d["search_query"].lower()


def test_youtube_embed_global(client):
    r = client.post(f"{BASE_URL}/api/recipes/youtube",
                    json={"title": "Tomato Pasta", "cuisine": "global"})
    assert r.status_code == 200
    d = r.json()
    assert d["embed_url"].startswith("https://www.youtube-nocookie.com/embed/"), d["embed_url"]
    assert _re.match(r"https://www\.youtube-nocookie\.com/embed/([A-Za-z0-9_-]{11})\?", d["embed_url"]) is not None
    assert "recipe" in d["search_query"].lower()


# --- New: Chana Masala in DB (iter3 expansion)
def test_suggest_chana_masala(client):
    r = client.post(f"{BASE_URL}/api/recipes/suggest",
                    json={"ingredients": ["chickpeas", "onion", "tomato"], "cuisine": "indian"},
                    timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    titles = [s["title"].lower() for s in d["suggestions"]]
    assert any("chana" in t for t in titles), f"Chana Masala missing from suggestions: {titles}"
    assert len(d["suggestions"]) == 3


# --- Local-first matches for various Indian staples (iter3 DB sanity)
@pytest.mark.parametrize("ings,expected_title_substr", [
    (["potato", "cumin"], "aloo jeera"),
    (["egg", "onion"], None),  # masala omelette OR egg curry OR bread omelette sandwich
    (["rice", "cumin"], "jeera rice"),
    (["bread", "egg"], "bread omelette"),
    (["chickpeas", "onion"], "chana"),
    (["rava", "onion"], "upma"),
])
def test_local_first_indian_staples(client, ings, expected_title_substr):
    r = client.post(f"{BASE_URL}/api/recipes/suggest",
                    json={"ingredients": ings, "cuisine": "indian"},
                    timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["suggestions"]) >= 1
    # the top suggestion must come from local DB
    assert d["suggestions"][0]["source"] == "local", \
        f"top suggestion not local for {ings}: {d['suggestions'][0]}"
    if expected_title_substr is not None:
        titles = [s["title"].lower() for s in d["suggestions"]]
        assert any(expected_title_substr in t for t in titles), \
            f"expected '{expected_title_substr}' in {titles} for {ings}"


# --- Image still works
def test_image_generation(client):
    r = client.post(f"{BASE_URL}/api/recipes/image",
                    json={"title": "Aloo Jeera", "cuisine": "indian"},
                    timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "image_base64" in d and len(d["image_base64"]) > 100
    assert d["mime_type"].startswith("image/")
