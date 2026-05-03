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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import CookingLoader from "../components/CookingLoader";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  primary: "#A6171C",
  background: "#D6D0C5",
  surface: "#E5E1D8",
  surfaceHighlight: "#F2EFEB",
  textPrimary: "#2D2422",
  textSecondary: "#5C4E4A",
  border: "#CFC9BD",
  fridgeBody: "#B8C5C5",
  fridgeBodyDark: "#9FB0B0",
  fridgeInterior: "#F2EFEB",
  plant: "#4F6B3C",
  plantPot: "#C97B3C",
  noteYellow: "#F2D58A",
  noteHandle: "#A87343",
};

const SUGGESTIONS = [
  "Potato", "Onion", "Tomato", "Paneer", "Rice", "Dal", "Egg", "Ginger", "Garlic", "Spinach",
];

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<"indian" | "global">("indian");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const doorProgress = useSharedValue(0); // 0 closed, 1 open

  const toggleFridge = () => {
    const next = !open;
    setOpen(next);
    doorProgress.value = withSpring(next ? 1 : 0, { damping: 14, stiffness: 90 });
    if (next) setTimeout(() => inputRef.current?.focus(), 450);
  };

  const doorStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(doorProgress.value, [0, 1], [0, -110]);
    const translateX = interpolate(doorProgress.value, [0, 1], [0, -6]);
    return {
      transform: [
        { perspective: 900 },
        { translateX },
        { rotateY: `${rotateY}deg` },
      ],
      opacity: interpolate(doorProgress.value, [0, 0.85, 1], [1, 0.6, 0]),
    };
  });

  const interiorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(doorProgress.value, [0, 0.4, 1], [0, 0.6, 1]),
  }));

  const addIngredient = (raw: string) => {
    const val = raw.trim();
    if (!val) return;
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
    if (!open) toggleFridge();
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const onGenerate = async () => {
    let finalList = ingredients;
    if (input.trim()) {
      const pending = input.split(",").map((s) => s.trim()).filter(Boolean);
      const lower = new Set(ingredients.map((i) => i.toLowerCase()));
      const merged = [...ingredients];
      pending.forEach((p) => {
        if (!lower.has(p.toLowerCase())) merged.push(p);
      });
      finalList = merged;
      setIngredients(merged);
      setInput("");
    }
    if (finalList.length === 0) {
      Alert.alert("Empty fridge?", "Add a few ingredients first.");
      if (!open) toggleFridge();
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/recipes/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: finalList, cuisine }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push({
        pathname: "/suggestions",
        params: {
          suggestions: JSON.stringify(data.suggestions),
          ingredients: JSON.stringify(finalList),
        },
      });
    } catch (e: any) {
      Alert.alert("Oops", e?.message || "Could not suggest recipes. Try again.");
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
            <Text style={styles.eyebrow}>Meal Mate</Text>
            <Text style={styles.title} testID="app-title">
              What's in your{"\n"}kitchen today?
            </Text>
            <Text style={styles.subtitle}>
              Peek inside your fridge, tell us what's there.
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

          {/* Fridge scene */}
          <View style={styles.fridgeScene}>
            {/* Top shelf items: pan, wine bottles, planter */}
            <View style={styles.topShelf}>
              {/* Pan with handle */}
              <View style={styles.topItem}>
                <View style={styles.panCircle} />
                <View style={styles.panHandle} />
              </View>

              {/* Wine bottle 1 (dark) */}
              <View style={styles.topItem}>
                <View style={styles.bottleNeckDark} />
                <View style={styles.bottleBodyDark}>
                  <View style={styles.bottleLabel} />
                </View>
              </View>

              {/* Wine bottle 2 (green) */}
              <View style={styles.topItem}>
                <View style={styles.bottleNeckGreen} />
                <View style={styles.bottleBodyGreen}>
                  <View style={styles.bottleLabel} />
                </View>
              </View>

              {/* Planter */}
              <View style={styles.topItem}>
                <View style={styles.plantLeafL} />
                <View style={styles.plantLeafC} />
                <View style={styles.plantLeafR} />
                <View style={styles.plantPot} />
              </View>
            </View>

            {/* Tap hint */}
            {!open && (
              <Animated.View
                entering={FadeIn.delay(300).duration(500)}
                style={styles.tapHint}
              >
                <Feather name="chevron-down" size={14} color={COLORS.textSecondary} />
                <Text style={styles.tapHintText}>Tap to open the fridge</Text>
              </Animated.View>
            )}

            {/* Fridge body */}
            <TouchableOpacity
              testID="fridge"
              activeOpacity={0.95}
              onPress={() => !open && toggleFridge()}
              style={styles.fridge}
            >
              {/* Back wall (interior) */}
              <Animated.View style={[styles.interior, interiorStyle]}>
                <Text style={styles.interiorLabel}>INSIDE YOUR FRIDGE</Text>
                <View style={styles.interiorInputWrap}>
                  <TextInput
                    ref={inputRef}
                    testID="ingredient-input"
                    style={styles.interiorInput}
                    placeholder="paneer, tomato, ginger…"
                    placeholderTextColor="#8B7F7A"
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => addIngredient(input)}
                    returnKeyType="done"
                    autoCapitalize="none"
                    editable={open}
                  />
                  <TouchableOpacity
                    testID="add-ingredient-btn"
                    onPress={() => addIngredient(input)}
                    style={styles.addBtn}
                    activeOpacity={0.8}
                    disabled={!input.trim() || !open}
                  >
                    <Feather name="plus" size={18} color={COLORS.surfaceHighlight} />
                  </TouchableOpacity>
                </View>

                {ingredients.length > 0 ? (
                  <View style={styles.chipsWrap} testID="ingredients-chips">
                    {ingredients.map((ing, i) => (
                      <Animated.View
                        key={`${ing}-${i}`}
                        entering={FadeInDown.delay(i * 40).duration(220)}
                      >
                        <TouchableOpacity
                          testID={`chip-${i}`}
                          style={styles.chip}
                          onPress={() => removeIngredient(i)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.chipText}>{ing}</Text>
                          <Feather name="x" size={12} color={COLORS.surfaceHighlight} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.suggestionsRow}>
                    <Text style={styles.suggestLabel}>Quick add</Text>
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
              </Animated.View>

              {/* Freezer divider */}
              <View style={styles.freezerDivider} />

              {/* Lower drawer */}
              <View style={styles.drawer}>
                <View style={styles.drawerHandle} />
              </View>

              {/* Door (swings open) */}
              <Animated.View style={[styles.door, doorStyle]} pointerEvents={open ? "none" : "auto"}>
                {/* Fridge magnets */}
                <View style={[styles.magnet, styles.magnetA]}>
                  <View style={styles.magnetInner} />
                </View>
                <View style={[styles.magnet, styles.magnetB]}>
                  <View style={[styles.magnetInner, { backgroundColor: COLORS.surfaceHighlight }]} />
                </View>
                <View style={[styles.magnetSquare, styles.magnetC]} />
                <View style={[styles.magnetHeart]}>
                  <View style={styles.heartLeft} />
                  <View style={styles.heartRight} />
                  <View style={styles.heartBottom} />
                </View>

                {/* Sticky note */}
                <View style={styles.stickyNote}>
                  <Text style={styles.stickyNoteText}>
                    what's inside{"\n"}your fridge?
                  </Text>
                </View>
                {/* Calendar */}
                <View style={styles.calendar}>
                  <Text style={styles.calendarText}>11</Text>
                </View>
                {/* Handle */}
                <View style={styles.fridgeHandle} />
                {/* Upper shelf hint */}
                <View style={styles.shelfLine} />
              </Animated.View>
            </TouchableOpacity>

            {/* Small plant beside fridge */}
            <View style={styles.sidePlant}>
              <View style={styles.sidePlantLeafL} />
              <View style={styles.sidePlantLeafR} />
              <View style={styles.sidePlantPot} />
            </View>
          </View>

          {open && (
            <TouchableOpacity
              onPress={toggleFridge}
              style={styles.closeHint}
              activeOpacity={0.7}
              testID="close-fridge"
            >
              <Feather name="chevron-up" size={14} color={COLORS.textSecondary} />
              <Text style={styles.closeHintText}>Tap to close the fridge</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            testID="generate-btn"
            style={styles.cta}
            onPress={onGenerate}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>Suggest recipes</Text>
            <Feather name="arrow-right" size={20} color={COLORS.surfaceHighlight} />
          </TouchableOpacity>
        </View>

        {loading && <CookingLoader />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const FRIDGE_W = 300;
const FRIDGE_H = 380;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },

  header: { paddingTop: 16, paddingBottom: 20 },
  eyebrow: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.primary,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 32,
    lineHeight: 38,
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    padding: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  toggleTextActive: { color: COLORS.surfaceHighlight },

  fridgeScene: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingTop: 80,
    height: FRIDGE_H + 100,
    position: "relative",
  },
  topShelf: {
    position: "absolute",
    top: 8,
    left: 30,
    right: 30,
    height: 70,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    zIndex: 2,
  },
  topItem: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 70,
  },
  panCircle: {
    width: 44,
    height: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: "#2D2422",
    borderTopWidth: 3,
    borderTopColor: "#4A3A36",
  },
  panHandle: {
    position: "absolute",
    bottom: 8,
    right: -22,
    width: 28,
    height: 4,
    backgroundColor: "#4A3A36",
    borderRadius: 3,
  },
  bottleNeckDark: {
    width: 8,
    height: 18,
    backgroundColor: "#3D2A24",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  bottleBodyDark: {
    width: 22,
    height: 42,
    backgroundColor: "#5C2C24",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  bottleNeckGreen: {
    width: 8,
    height: 18,
    backgroundColor: "#2A4A2A",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  bottleBodyGreen: {
    width: 22,
    height: 42,
    backgroundColor: "#4A6B3C",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  bottleLabel: {
    width: 16,
    height: 14,
    backgroundColor: COLORS.surfaceHighlight,
    opacity: 0.85,
    borderRadius: 1,
  },
  plantLeafL: {
    position: "absolute",
    bottom: 18,
    left: -2,
    width: 18,
    height: 30,
    backgroundColor: COLORS.plant,
    borderRadius: 14,
    transform: [{ rotate: "-30deg" }],
  },
  plantLeafC: {
    position: "absolute",
    bottom: 20,
    width: 16,
    height: 36,
    backgroundColor: "#5F7D48",
    borderRadius: 14,
  },
  plantLeafR: {
    position: "absolute",
    bottom: 18,
    right: -2,
    width: 18,
    height: 30,
    backgroundColor: COLORS.plant,
    borderRadius: 14,
    transform: [{ rotate: "30deg" }],
  },
  plantPot: {
    width: 32,
    height: 18,
    backgroundColor: COLORS.plantPot,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tapHint: {
    position: "absolute",
    top: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 3,
  },
  tapHintText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },

  fridge: {
    width: FRIDGE_W,
    height: FRIDGE_H,
    backgroundColor: COLORS.fridgeBody,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.fridgeBodyDark,
    overflow: "hidden",
    position: "relative",
  },
  interior: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.fridgeInterior,
    padding: 16,
    paddingTop: 18,
  },
  interiorLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 10,
    letterSpacing: 1.6,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  interiorInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  interiorInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.surfaceHighlight,
    fontSize: 12,
  },
  suggestionsRow: { marginTop: 12 },
  suggestLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  suggestChip: {
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestChipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textPrimary,
    fontSize: 12,
  },

  freezerDivider: {
    position: "absolute",
    top: FRIDGE_H * 0.58,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.fridgeBodyDark,
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FRIDGE_H * 0.42,
    backgroundColor: COLORS.fridgeBody,
    borderTopWidth: 0,
  },
  drawerHandle: {
    position: "absolute",
    top: 14,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: COLORS.noteHandle,
    borderRadius: 2,
  },
  door: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.fridgeBody,
    borderRadius: 16,
    transformOrigin: "left",
    padding: 16,
    justifyContent: "flex-start",
    borderRightWidth: 1,
    borderRightColor: COLORS.fridgeBodyDark,
  },
  fridgeHandle: {
    position: "absolute",
    left: 12,
    top: 60,
    width: 6,
    height: 80,
    borderRadius: 3,
    backgroundColor: COLORS.noteHandle,
  },
  shelfLine: {
    position: "absolute",
    top: FRIDGE_H * 0.58,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.fridgeBodyDark,
  },
  stickyNote: {
    position: "absolute",
    top: 120,
    left: 70,
    width: 150,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.noteYellow,
    borderRadius: 4,
    transform: [{ rotate: "-4deg" }],
  },
  stickyNoteText: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  magnet: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  magnetA: {
    top: 26,
    left: 38,
    backgroundColor: COLORS.primary,
  },
  magnetB: {
    top: 80,
    right: 32,
    backgroundColor: "#2D6A4F",
  },
  magnetInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHighlight,
  },
  magnetSquare: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 4,
    transform: [{ rotate: "12deg" }],
  },
  magnetC: {
    bottom: 90,
    right: 28,
    backgroundColor: "#E88B5E",
  },
  magnetHeart: {
    position: "absolute",
    bottom: 60,
    left: 36,
    width: 22,
    height: 20,
    transform: [{ rotate: "-8deg" }],
  },
  heartLeft: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    left: 0,
    top: 0,
  },
  heartRight: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    right: 0,
    top: 0,
  },
  heartBottom: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: "45deg" }],
    bottom: 0,
    left: 4,
  },
  calendar: {
    position: "absolute",
    top: 40,
    right: 40,
    width: 60,
    height: 60,
    backgroundColor: "#E88B5E",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "6deg" }],
  },
  calendarText: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 28,
    color: COLORS.surfaceHighlight,
  },

  sidePlant: {
    position: "absolute",
    bottom: 10,
    right: 10,
    alignItems: "center",
  },
  sidePlantLeafL: {
    position: "absolute",
    bottom: 22,
    left: -10,
    width: 22,
    height: 38,
    backgroundColor: COLORS.plant,
    borderRadius: 14,
    transform: [{ rotate: "-30deg" }],
  },
  sidePlantLeafR: {
    position: "absolute",
    bottom: 22,
    right: -10,
    width: 22,
    height: 38,
    backgroundColor: "#5F7D48",
    borderRadius: 14,
    transform: [{ rotate: "30deg" }],
  },
  sidePlantPot: {
    width: 32,
    height: 22,
    backgroundColor: "#D4A68A",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },

  closeHint: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeHintText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
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
  },
  ctaText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.surfaceHighlight,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
