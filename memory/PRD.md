# Rasoi — Mobile Recipe Generator

## Vision
Open the app → get a recipe suggestion → start cooking, in under 10 seconds. Warm, minimal, Indian-kitchen-inspired aesthetic. No login. No friction.

## Core User Flow
1. User opens app (home screen).
2. Adds ingredients they already have (chips, suggestions, or comma input).
3. Picks cuisine (Indian default / Global).
4. Taps "Suggest a recipe" → lands on recipe screen with hero image, have-vs-missing ingredients, shopping list, numbered steps.

## MVP Features (Shipped)
- **Ingredient chip input** — type-or-tap suggestions (Potato, Onion, Paneer, Dal, Rice, Egg…); bulk comma add supported
- **Cuisine toggle** — Indian / Global
- **Hybrid recipe generation** — local curated Indian recipe DB (Aloo Jeera, Dal Tadka, Paneer Bhurji, Jeera Rice, Masala Omelette, Tomato Pasta…) with **Gemini 3 Flash** fallback for anything not in the DB
- **Have vs Missing ingredients** — visually separated; missing list doubles as a **shopping list** with a count badge
- **Numbered method steps** — staggered fade-in animation
- **AI hero image** — Gemini Nano Banana (`gemini-3.1-flash-image-preview`) renders a food-photography-style image of the dish; graceful "Plating your dish…" loader + Unsplash fallback

## Tech Stack
- **Frontend**: Expo SDK 54, expo-router, react-native-reanimated, @expo/vector-icons (Feather), Fraunces + Plus Jakarta Sans via `@expo-google-fonts`
- **Backend**: FastAPI + motor (MongoDB) + emergentintegrations
- **AI**: Gemini 3 Flash (text) + Gemini Nano Banana (image) via `EMERGENT_LLM_KEY`

## API Surface
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/recipes/generate` | Hybrid recipe gen. Body: `{ ingredients: string[], cuisine: "indian"\|"global"\|"any" }` |
| POST | `/api/recipes/image` | Generate a dish photo (base64). Body: `{ title, cuisine }` |

## Design Tokens
- Primary `#A6171C` · Background `#D6D0C5` · Surface `#E5E1D8` · Highlight `#F2EFEB`
- Heading: Fraunces (serif, warm) · Body: Plus Jakarta Sans
- 8pt grid, pill buttons (999 radius), soft shadows, min touch target 44px

## Smart Business Enhancement Ideas (not yet built)
- **Affiliate shopping-list checkout** — one-tap "order missing ingredients" via BigBasket/Blinkit partner link = native monetisation without ads
- Save/favourite recipes (personal cookbook)
- Voice-dictated ingredient input while cooking

## Out of Scope (MVP)
- User accounts, favourites, history (can be added later with MongoDB)
- Offline mode
- Step-by-step cooking timer
