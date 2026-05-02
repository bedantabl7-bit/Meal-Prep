"""Tests for Recipe Generator API."""
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


# --- Local recipe match
def test_local_aloo_jeera(client):
    r = client.post(f"{BASE_URL}/api/recipes/generate",
                    json={"ingredients": ["potato", "cumin", "turmeric"], "cuisine": "indian"})
    assert r.status_code == 200
    d = r.json()
    assert d["source"] == "local"
    assert d["title"] == "Aloo Jeera"
    assert isinstance(d["have"], list) and isinstance(d["missing"], list)
    assert isinstance(d["steps"], list) and len(d["steps"]) > 0
    assert d["cook_time"] > 0


# --- AI fallback
def test_ai_fallback_global(client):
    r = client.post(f"{BASE_URL}/api/recipes/generate",
                    json={"ingredients": ["chicken", "lemon", "garlic", "thyme"], "cuisine": "global"},
                    timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["source"] == "ai"
    for k in ["title", "cook_time", "difficulty", "have", "missing", "steps"]:
        assert k in d
    assert len(d["steps"]) >= 3
    assert d["title"] and isinstance(d["title"], str)


# --- Empty ingredients
def test_empty_ingredients(client):
    r = client.post(f"{BASE_URL}/api/recipes/generate",
                    json={"ingredients": [], "cuisine": "indian"})
    assert r.status_code == 400


# --- Image generation
def test_image_generation(client):
    r = client.post(f"{BASE_URL}/api/recipes/image",
                    json={"title": "Aloo Jeera", "cuisine": "indian"},
                    timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "image_base64" in d and len(d["image_base64"]) > 100
    assert "mime_type" in d and d["mime_type"].startswith("image/")
