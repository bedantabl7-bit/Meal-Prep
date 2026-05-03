# Rasoi — Mobile Recipe Generator

## Vision
Open the app → pick a recipe from 3 personalised suggestions → start cooking. Warm, minimal, Indian-kitchen-inspired aesthetic. No login. No friction.

## User Flow (v2)
1. Home: animated **fridge illustration** sits front-and-centre. Sticky yellow note reads *"what's inside your fridge?"*. Tap the fridge → door **swings open** (reanimated rotateY) → reveals input + chip tray inside.
2. Add ingredients (type, comma-paste, or tap quick-add chips). Toggle Indian / Global cuisine.
3. Tap **"Suggest recipes"** → cute **CookingLoader** (animated pan + steam + rotating spatula) while backend returns 3 suggestions.
4. **Suggestions screen**: 3 cards with title, tagline, cook time, difficulty, have/total count, Classic/AI source tag. Tap one.
5. **Recipe screen**: AI hero image (Gemini Nano Banana) + **YouTube recipe video** (real video, not search) + have-vs-missing ingredients + shopping list + numbered method steps.

## Iteration 2 — Shipped
- **Fridge UI**: styled Views forming hand-drawn-look fridge with pan, plant, sticky note, orange calendar "11", handle, freezer divider, side plant; reanimated door-swing
- **3 recipe suggestions** via new `/api/recipes/suggest` endpoint (top local matches + AI padding)
- **YouTube embed** via `/api/recipes/youtube` — server-side scrapes YouTube search HTML for the first videoId, returns `youtube-nocookie.com/embed/<id>` that plays inline (no API key, no "unavailable" errors)
- **CookingLoader** component: react-native-reanimated pan wobble + rotating spatula + three steam wisps + cycling captions ("Tempering the spices…" → "Chopping onions, no tears…" → "Simmering something good…" → "Almost ready to serve…")
- **DB expanded** to 12 recipes: Aloo Jeera, Aloo Paratha, Rajma Chawal, Poha, Dal Tadka, Masala Omelette, Jeera Rice, Paneer Bhurji, Tomato Pasta, Chana Masala, Vegetable Upma, Egg Curry, Bread Omelette Sandwich

## Tech Stack
- **Frontend**: Expo SDK 54, expo-router (index / suggestions / recipe), react-native-reanimated, react-native-webview, @expo/vector-icons, Fraunces + Plus Jakarta Sans
- **Backend**: FastAPI + motor (MongoDB) + emergentintegrations + requests (for YouTube scrape)
- **AI**: Gemini 3 Flash text, Gemini Nano Banana image, via `EMERGENT_LLM_KEY`

## API Surface
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/recipes/suggest` | Return up to 3 recipe suggestions |
| POST | `/api/recipes/generate` | Single recipe (legacy; still used) |
| POST | `/api/recipes/image` | Gemini Nano Banana base64 dish image |
| POST | `/api/recipes/youtube` | Real YouTube embed URL (scrape-resolved videoId) |

## Design Tokens
- Primary `#A6171C` · Background `#D6D0C5` · Surface `#E5E1D8` · Highlight `#F2EFEB`
- Fridge: `#B8C5C5` body, `#9FB0B0` trim; sticky note `#F2D58A`; calendar `#E88B5E`; plant `#4F6B3C`
- Heading: Fraunces · Body: Plus Jakarta Sans · 8pt grid · pill radius 999

## Monetisation Hook
- One-tap "order missing ingredients" via BigBasket / Blinkit affiliate deep-link on shopping list — native revenue, no ads

## Next Ideas
- Save-to-favourites + history (MongoDB already wired)
- Voice ingredient input for hands-busy cooking
- Expand DB to 50+ recipes with richer matching
- Step-by-step cooking mode with timer per step
