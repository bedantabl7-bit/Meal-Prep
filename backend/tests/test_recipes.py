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


# --- YouTube embed
def test_youtube_embed(client):
    r = client.post(f"{BASE_URL}/api/recipes/youtube",
                    json={"title": "Aloo Jeera", "cuisine": "indian"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "embed_url" in d and "search_query" in d
    assert d["embed_url"].startswith("https://www.youtube.com/embed")
    assert "listType=search" in d["embed_url"]
    assert "Aloo" in d["search_query"] or "aloo" in d["search_query"].lower()


def test_youtube_global(client):
    r = client.post(f"{BASE_URL}/api/recipes/youtube",
                    json={"title": "Tomato Pasta", "cuisine": "global"})
    assert r.status_code == 200
    d = r.json()
    assert d["embed_url"].startswith("https://www.youtube.com/embed")
    assert "recipe" in d["search_query"].lower()


# --- Image still works
def test_image_generation(client):
    r = client.post(f"{BASE_URL}/api/recipes/image",
                    json={"title": "Aloo Jeera", "cuisine": "indian"},
                    timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "image_base64" in d and len(d["image_base64"]) > 100
    assert d["mime_type"].startswith("image/")
