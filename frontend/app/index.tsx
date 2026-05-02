import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  primary: "#A6171C",
  primaryDark: "#7F1014",
  background: "#D6D0C5",
  surface: "#E5E1D8",
  surfaceHighlight: "#F2EFEB",
  textPrimary: "#2D2422",
  textSecondary: "#5C4E4A",
  border: "#CFC9BD",
};

const SUGGESTIONS = [
  "Potato", "Onion", "Tomato", "Paneer", "Rice", "Dal", "Egg", "Ginger", "Garlic", "Spinach", "Chicken", "Cumin",
];

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<"indian" | "global">("indian");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const addIngredient = (raw: string) => {
    const val = raw.trim();
    if (!val) return;
    // split on comma for bulk add
    const parts = val.split(",").map((p) => p.trim()).filter(Boolean);
    const lower = new Set(ingredients.map((i) => i.toLowerCase()));
    const next = [...ingredients];
    parts.forEach((p) => {
      if (!lower.has(p.toLowerCase())) {
        next.push(p);
        lower.add(p.toLowerCase());
      }
    });
    setIngredients(next);
    setInput("");
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const onGenerate = async () => {
    if (ingredients.length === 0 && input.trim()) {
      addIngredient(input);
    }
    const finalList =
      ingredients.length > 0
        ? ingredients
        : input.trim()
        ? input.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    if (finalList.length === 0) {
      Alert.alert("Add ingredients", "Please add at least one ingredient.");
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/recipes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: finalList, cuisine }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed");
      }
      const data = await res.json();
      router.push({
        pathname: "/recipe",
        params: { recipe: JSON.stringify(data) },
      });
    } catch (e: any) {
      Alert.alert("Oops", e?.message || "Could not generate a recipe. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.eyebrow} testID="app-eyebrow">
              Ghar ka khana
            </Text>
            <Text style={styles.title} testID="app-title">
              What's in your{"\n"}kitchen today?
            </Text>
            <Text style={styles.subtitle}>
              Add a few ingredients. We'll suggest a recipe in seconds.
            </Text>
          </Animated.View>

          {/* Cuisine toggle */}
          <View style={styles.toggleRow} testID="cuisine-toggle">
            <TouchableOpacity
              testID="cuisine-indian"
              style={[styles.toggleBtn, cuisine === "indian" && styles.toggleBtnActive]}
              onPress={() => setCuisine("indian")}
              activeOpacity={0.85}
            >
              <Text style={[styles.toggleText, cuisine === "indian" && styles.toggleTextActive]}>
                Indian
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cuisine-global"
              style={[styles.toggleBtn, cuisine === "global" && styles.toggleBtnActive]}
              onPress={() => setCuisine("global")}
              activeOpacity={0.85}
            >
              <Text style={[styles.toggleText, cuisine === "global" && styles.toggleTextActive]}>
                Global
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>INGREDIENTS</Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                testID="ingredient-input"
                style={styles.input}
                placeholder="e.g. potato, cumin, onion"
                placeholderTextColor="#8B7F7A"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => addIngredient(input)}
                returnKeyType="done"
                autoCapitalize="none"
              />
              <TouchableOpacity
                testID="add-ingredient-btn"
                onPress={() => addIngredient(input)}
                style={styles.addBtn}
                activeOpacity={0.8}
                disabled={!input.trim()}
              >
                <Feather name="plus" size={22} color={input.trim() ? COLORS.primary : "#B3A99F"} />
              </TouchableOpacity>
            </View>

            {ingredients.length > 0 ? (
              <View style={styles.chipsWrap} testID="ingredients-chips">
                {ingredients.map((ing, i) => (
                  <Animated.View
                    key={`${ing}-${i}`}
                    entering={FadeInDown.delay(i * 40).duration(250)}
                  >
                    <TouchableOpacity
                      testID={`chip-${i}`}
                      style={styles.chip}
                      onPress={() => removeIngredient(i)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipText}>{ing}</Text>
                      <Feather name="x" size={14} color={COLORS.surfaceHighlight} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.suggestionWrap}>
                <Text style={styles.suggestLabel}>Try adding</Text>
                <View style={styles.chipsWrap}>
                  {SUGGESTIONS.slice(0, 8).map((s) => (
                    <TouchableOpacity
                      key={s}
                      testID={`suggest-${s.toLowerCase()}`}
                      style={styles.suggestChip}
                      onPress={() => addIngredient(s)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.suggestChipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Empty state illustration */}
          {ingredients.length === 0 && (
            <Animated.View entering={FadeIn.duration(600)} style={styles.illus}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80",
                }}
                style={styles.illusImage}
              />
              <View style={styles.illusOverlay} />
              <Text style={styles.illusText}>Every great meal{"\n"}starts with what you have.</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            testID="generate-btn"
            style={[styles.cta, loading && { opacity: 0.7 }]}
            onPress={onGenerate}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surfaceHighlight} />
            ) : (
              <>
                <Text style={styles.ctaText}>Suggest a recipe</Text>
                <Feather name="arrow-right" size={20} color={COLORS.surfaceHighlight} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  header: { paddingTop: 16, paddingBottom: 24 },
  eyebrow: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.primary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 34,
    lineHeight: 40,
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 320,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    padding: 4,
    alignSelf: "flex-start",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  toggleTextActive: {
    color: COLORS.surfaceHighlight,
  },
  card: {
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#2D2422",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 17,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.surfaceHighlight,
    fontSize: 13,
  },
  suggestionWrap: { marginTop: 12 },
  suggestLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  suggestChip: {
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestChipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  illus: {
    marginTop: 28,
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  illusImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  illusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45,36,34,0.35)",
  },
  illusText: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
    color: "#F2EFEB",
    padding: 20,
    letterSpacing: -0.2,
  },
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(45,36,34,0.08)",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  ctaText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.surfaceHighlight,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
