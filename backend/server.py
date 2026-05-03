from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import base64
import uuid
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ---------- Local Recipe DB (Indian-first) ----------
LOCAL_RECIPES = [
    {
        "title": "Aloo Jeera",
        "cuisine": "indian",
        "cook_time": 20,
        "difficulty": "Easy",
        "tagline": "Homely cumin potatoes, straight from the tava.",
        "core_ingredients": ["potato", "cumin", "turmeric"],
        "full_ingredients": ["potato", "cumin seeds", "turmeric", "green chilli", "salt", "oil", "coriander leaves"],
        "steps": [
            "Peel and dice 3 medium potatoes into small cubes.",
            "Heat 2 tbsp oil in a pan. Add 1 tsp cumin seeds and let them splutter.",
            "Add diced potatoes, 1/2 tsp turmeric, chopped green chilli and salt.",
            "Cover and cook on low flame for 12-15 minutes, stirring occasionally.",
            "Garnish with fresh coriander leaves and serve hot with roti."
        ]
    },
    {
        "title": "Aloo Paratha",
        "cuisine": "indian",
        "cook_time": 30,
        "difficulty": "Medium",
        "tagline": "Buttery stuffed flatbread. Winter morning favourite.",
        "core_ingredients": ["potato", "flour", "wheat"],
        "full_ingredients": ["potato", "wheat flour", "green chilli", "ginger", "cumin powder", "garam masala", "salt", "coriander leaves", "ghee"],
        "steps": [
            "Boil and mash 3 potatoes. Mix with chopped green chilli, ginger, cumin powder, garam masala, salt and coriander.",
            "Knead a soft dough with 2 cups wheat flour, a pinch of salt and water.",
            "Divide dough into balls. Roll one, place stuffing, seal and roll gently.",
            "Cook on hot tava, flipping and pressing with a spoon, adding ghee on both sides.",
            "Serve hot with curd and pickle."
        ]
    },
    {
        "title": "Rajma Chawal",
        "cuisine": "indian",
        "cook_time": 40,
        "difficulty": "Medium",
        "tagline": "Punjabi soul food. Slow-simmered kidney beans.",
        "core_ingredients": ["rajma", "kidney beans", "onion", "tomato"],
        "full_ingredients": ["rajma", "onion", "tomato", "ginger garlic paste", "cumin seeds", "red chilli powder", "coriander powder", "garam masala", "ghee", "salt", "basmati rice"],
        "steps": [
            "Soak 1 cup rajma overnight. Pressure cook with salt for 6 whistles.",
            "Heat ghee. Add cumin, then onion and ginger garlic paste. Saute till golden.",
            "Add pureed tomato, chilli powder, coriander powder. Cook until oil separates.",
            "Add cooked rajma with its water. Simmer for 15 minutes, mashing a few beans.",
            "Finish with garam masala. Serve over steamed basmati rice."
        ]
    },
    {
        "title": "Poha",
        "cuisine": "indian",
        "cook_time": 15,
        "difficulty": "Easy",
        "tagline": "Light, lemony flattened rice. Ten-minute breakfast.",
        "core_ingredients": ["poha", "flattened rice", "onion"],
        "full_ingredients": ["poha", "onion", "green chilli", "curry leaves", "mustard seeds", "turmeric", "peanuts", "lemon", "coriander leaves", "salt", "oil"],
        "steps": [
            "Rinse 2 cups poha in a colander and let it drain for 5 minutes.",
            "Heat oil. Crackle mustard seeds, add peanuts, curry leaves and green chilli.",
            "Add chopped onion, saute till soft. Add turmeric and salt.",
            "Fold in the poha gently and cook covered for 2 minutes.",
            "Finish with a generous squeeze of lemon and chopped coriander."
        ]
    },
    {
        "title": "Dal Tadka",
        "cuisine": "indian",
        "cook_time": 30,
        "difficulty": "Easy",
        "tagline": "Yellow dal with sizzling ghee tempering.",
        "core_ingredients": ["dal", "lentils", "tomato", "onion"],
        "full_ingredients": ["toor dal", "onion", "tomato", "garlic", "cumin seeds", "turmeric", "red chilli powder", "ghee", "salt"],
        "steps": [
            "Wash 1 cup toor dal and pressure cook with 3 cups water, turmeric and salt for 4 whistles.",
            "In a pan, heat 2 tbsp ghee. Add cumin seeds, chopped garlic and onion. Saute until golden.",
            "Add chopped tomato and red chilli powder. Cook until tomatoes soften.",
            "Pour the tadka over the cooked dal and simmer for 3 minutes.",
            "Serve hot with rice or roti."
        ]
    },
    {
        "title": "Masala Omelette",
        "cuisine": "indian",
        "cook_time": 10,
        "difficulty": "Easy",
        "tagline": "Desi-style eggs with onion, chilli and coriander.",
        "core_ingredients": ["egg", "onion", "tomato"],
        "full_ingredients": ["eggs", "onion", "tomato", "green chilli", "coriander leaves", "salt", "pepper", "oil"],
        "steps": [
            "Beat 2 eggs in a bowl with salt and pepper.",
            "Add finely chopped onion, tomato, green chilli and coriander leaves.",
            "Heat 1 tsp oil in a non-stick pan on medium heat.",
            "Pour the egg mixture and spread evenly. Cook for 2 minutes.",
            "Flip and cook for another minute. Serve hot with toast."
        ]
    },
    {
        "title": "Jeera Rice",
        "cuisine": "indian",
        "cook_time": 20,
        "difficulty": "Easy",
        "tagline": "Fluffy basmati scented with ghee and cumin.",
        "core_ingredients": ["rice", "cumin"],
        "full_ingredients": ["basmati rice", "cumin seeds", "ghee", "bay leaf", "salt", "water"],
        "steps": [
            "Rinse 1 cup basmati rice and soak for 15 minutes.",
            "Heat 1 tbsp ghee. Add 1 tsp cumin seeds and 1 bay leaf.",
            "Add drained rice and saute for a minute.",
            "Add 2 cups water and salt. Bring to a boil.",
            "Cover and cook on low flame for 12 minutes. Fluff and serve."
        ]
    },
    {
        "title": "Paneer Bhurji",
        "cuisine": "indian",
        "cook_time": 15,
        "difficulty": "Easy",
        "tagline": "Scrambled cottage cheese. Roti's best friend.",
        "core_ingredients": ["paneer", "onion", "tomato"],
        "full_ingredients": ["paneer", "onion", "tomato", "green chilli", "ginger", "cumin seeds", "turmeric", "garam masala", "coriander leaves", "oil", "salt"],
        "steps": [
            "Crumble 200g paneer with hands and set aside.",
            "Heat 2 tbsp oil. Add cumin seeds, chopped ginger and green chilli.",
            "Add chopped onion, saute until translucent. Add tomato and cook till soft.",
            "Add turmeric, garam masala and salt. Mix well.",
            "Add crumbled paneer, mix gently and cook for 3 minutes. Garnish with coriander."
        ]
    },
    {
        "title": "Tomato Pasta",
        "cuisine": "global",
        "cook_time": 20,
        "difficulty": "Easy",
        "tagline": "Garlicky tomato pasta, weeknight simple.",
        "core_ingredients": ["pasta", "tomato", "garlic"],
        "full_ingredients": ["pasta", "tomato", "garlic", "olive oil", "basil", "salt", "pepper", "parmesan"],
        "steps": [
            "Boil pasta in salted water until al dente. Drain, reserving 1/2 cup water.",
            "Heat olive oil, saute minced garlic for 30 seconds.",
            "Add chopped tomatoes, salt and pepper. Simmer for 8 minutes.",
            "Toss pasta in the sauce with a splash of reserved water.",
            "Top with basil and grated parmesan. Serve hot."
        ]
    },
]


def _normalize(word: str) -> str:
    return re.sub(r'[^a-z]', '', word.lower().strip())


def _score_recipe(recipe: dict, user_norm: set) -> int:
    core_norm = {_normalize(w) for w in recipe["core_ingredients"]}
    direct = len(user_norm & core_norm)
    fuzzy = sum(1 for ing in user_norm if any(c and (c in ing or ing in c) for c in core_norm))
    return direct * 3 + fuzzy


def match_local_recipe(user_ingredients: List[str], cuisine: str) -> Optional[dict]:
    matches = match_local_recipes(user_ingredients, cuisine, limit=1)
    return matches[0] if matches else None


def match_local_recipes(user_ingredients: List[str], cuisine: str, limit: int = 3) -> List[dict]:
    user_norm = {_normalize(w) for w in user_ingredients if w.strip()}
    if not user_norm:
        return []
    scored = []
    for recipe in LOCAL_RECIPES:
        if cuisine != "any" and recipe["cuisine"] != cuisine:
            continue
        s = _score_recipe(recipe, user_norm)
        if s >= 2:
            scored.append((s, recipe))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored[:limit]]


def build_recipe_response(recipe: dict, user_ingredients: List[str]) -> dict:
    user_norm = {_normalize(w): w for w in user_ingredients if w.strip()}
    have = []
    missing = []
    for ing in recipe["full_ingredients"]:
        n = _normalize(ing)
        matched_key = None
        for uk in user_norm:
            if uk and (uk in n or n in uk):
                matched_key = uk
                break
        if matched_key:
            have.append(ing)
        else:
            missing.append(ing)
    return {
        "id": str(uuid.uuid4()),
        "title": recipe["title"],
        "tagline": recipe.get("tagline", ""),
        "cuisine": recipe["cuisine"],
        "cook_time": recipe["cook_time"],
        "difficulty": recipe["difficulty"],
        "have": have,
        "missing": missing,
        "steps": recipe["steps"],
        "source": "local",
    }


async def generate_recipe_with_ai(user_ingredients: List[str], cuisine: str) -> dict:
    cuisine_hint = {
        "indian": "Must be an Indian (North or South Indian) recipe.",
        "global": "Must be a non-Indian (global cuisine - Italian, Mexican, Chinese, Mediterranean, etc.) recipe.",
        "any": "Can be any cuisine; prefer Indian if suitable.",
    }.get(cuisine, "Any cuisine.")

    system_message = (
        "You are a practical home-cook recipe generator. "
        "Always respond with ONLY valid JSON, no markdown, no prose. "
        "Schema: {\"title\": str, \"cuisine\": \"indian\"|\"global\", \"cook_time\": int (minutes), "
        "\"difficulty\": \"Easy\"|\"Medium\"|\"Hard\", "
        "\"full_ingredients\": [str, ...], "
        "\"steps\": [str, ...] (5-8 clear numbered steps, each one sentence)}. "
        "Make a single realistic recipe that uses most of the ingredients provided. "
        "Keep steps concise and beginner-friendly."
    )
    prompt = (
        f"Ingredients on hand: {', '.join(user_ingredients)}.\n"
        f"{cuisine_hint}\n"
        "Respond with only the JSON object, no extra text."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"recipe-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model("gemini", "gemini-3-flash-preview")

    response = await chat.send_message(UserMessage(text=prompt))
    text = response.strip()
    # strip markdown fencing if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    data = json.loads(text)
    # Build have/missing
    user_norm = {_normalize(w): w for w in user_ingredients if w.strip()}
    have, missing = [], []
    for ing in data.get("full_ingredients", []):
        n = _normalize(ing)
        matched = any((uk in n or n in uk) for uk in user_norm if uk)
        (have if matched else missing).append(ing)

    return {
        "id": str(uuid.uuid4()),
        "title": data.get("title", "Chef's Surprise"),
        "tagline": data.get("tagline", ""),
        "cuisine": data.get("cuisine", cuisine if cuisine != "any" else "indian"),
        "cook_time": int(data.get("cook_time", 25)),
        "difficulty": data.get("difficulty", "Easy"),
        "have": have,
        "missing": missing,
        "steps": data.get("steps", []),
        "source": "ai",
    }


# ---------- Models ----------
class GenerateRecipeRequest(BaseModel):
    ingredients: List[str]
    cuisine: Literal["indian", "global", "any"] = "indian"


class RecipeResponse(BaseModel):
    id: str
    title: str
    tagline: str = ""
    cuisine: str
    cook_time: int
    difficulty: str
    have: List[str]
    missing: List[str]
    steps: List[str]
    source: str


class SuggestionsResponse(BaseModel):
    suggestions: List[RecipeResponse]


class ImageRequest(BaseModel):
    title: str
    cuisine: str = "indian"


class ImageResponse(BaseModel):
    image_base64: str
    mime_type: str


class YoutubeRequest(BaseModel):
    title: str
    cuisine: str = "indian"


class YoutubeResponse(BaseModel):
    embed_url: str
    search_query: str


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Recipe Generator API"}


@api_router.post("/recipes/suggest", response_model=SuggestionsResponse)
async def suggest_recipes(req: GenerateRecipeRequest):
    ingredients = [i.strip() for i in req.ingredients if i and i.strip()]
    if not ingredients:
        raise HTTPException(status_code=400, detail="Please add at least one ingredient.")

    local_matches = match_local_recipes(ingredients, req.cuisine, limit=3)
    suggestions = [build_recipe_response(r, ingredients) for r in local_matches]

    # If we have fewer than 3, pad with AI
    while len(suggestions) < 3:
        try:
            existing_titles = {s["title"].lower() for s in suggestions}
            ai = await generate_recipe_with_ai(ingredients, req.cuisine)
            if ai["title"].lower() in existing_titles:
                break
            suggestions.append(ai)
        except Exception as e:
            logger.error(f"AI suggestion failed: {e}")
            break

    if not suggestions:
        raise HTTPException(status_code=502, detail="Could not find any recipe. Try different ingredients.")

    return {"suggestions": suggestions}


@api_router.post("/recipes/youtube", response_model=YoutubeResponse)
async def recipe_youtube(req: YoutubeRequest):
    cuisine_word = "indian" if req.cuisine == "indian" else "recipe"
    query = f"{req.title} {cuisine_word} recipe"
    from urllib.parse import quote_plus
    q = quote_plus(query)
    # YouTube embed with search list — auto-plays first search result
    embed_url = f"https://www.youtube.com/embed?listType=search&list={q}"
    return {"embed_url": embed_url, "search_query": query}


@api_router.post("/recipes/generate", response_model=RecipeResponse)
async def generate_recipe(req: GenerateRecipeRequest):
    ingredients = [i.strip() for i in req.ingredients if i and i.strip()]
    if not ingredients:
        raise HTTPException(status_code=400, detail="Please add at least one ingredient.")

    # Hybrid: try local DB first
    local = match_local_recipe(ingredients, req.cuisine)
    if local:
        result = build_recipe_response(local, ingredients)
        await db.recipe_logs.insert_one({
            "id": result["id"],
            "ingredients": ingredients,
            "cuisine": req.cuisine,
            "title": result["title"],
            "source": "local",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return result

    # Fallback to AI
    try:
        result = await generate_recipe_with_ai(ingredients, req.cuisine)
    except Exception as e:
        logger.error(f"AI recipe generation failed: {e}")
        raise HTTPException(status_code=502, detail="Could not generate a recipe right now. Please try again.")

    await db.recipe_logs.insert_one({
        "id": result["id"],
        "ingredients": ingredients,
        "cuisine": req.cuisine,
        "title": result["title"],
        "source": "ai",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return result


@api_router.post("/recipes/image", response_model=ImageResponse)
async def generate_recipe_image(req: ImageRequest):
    prompt = (
        f"A warm, appetizing overhead photograph of {req.title}, "
        f"{'traditional Indian' if req.cuisine == 'indian' else 'homestyle'} plating "
        "on a rustic stone or wooden surface with soft natural light, "
        "muted earthy tones, shallow depth of field, food photography style, "
        "no text, no watermark."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"img-{uuid.uuid4()}",
            system_message="You are a food photography image generator.",
        ).with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        _text, images = await chat.send_message_multimodal_response(
            UserMessage(text=prompt)
        )
        if not images:
            raise HTTPException(status_code=502, detail="No image generated")
        img = images[0]
        return {"image_base64": img["data"], "mime_type": img.get("mime_type", "image/png")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(status_code=502, detail="Image generation failed. Please try again.")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
