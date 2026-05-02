import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  success: "#2D6A4F",
};

type Recipe = {
  id: string;
  title: string;
  cuisine: string;
  cook_time: number;
  difficulty: string;
  have: string[];
  missing: string[];
  steps: string[];
  source: string;
};

export default function RecipeScreen() {
  const router = useRouter();
  const { recipe } = useLocalSearchParams<{ recipe: string }>();
  const parsed: Recipe | null = recipe ? JSON.parse(recipe as string) : null;

  const [imageData, setImageData] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (!parsed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/recipes/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: parsed.title, cuisine: parsed.cuisine }),
        });
        if (!res.ok) throw new Error("image failed");
        const data = await res.json();
        if (!cancelled) setImageData(`data:${data.mime_type};base64,${data.image_base64}`);
      } catch {
        if (!cancelled) setImageData(null);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsed) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>No recipe data</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.hero} testID="recipe-hero">
          {imageLoading && !imageData ? (
            <View style={styles.heroFallback}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.heroFallbackText}>Plating your dish...</Text>
            </View>
          ) : imageData ? (
            <Image source={{ uri: imageData }} style={styles.heroImage} />
          ) : (
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1764315424143-f417a3ea50a9?w=1000&q=80",
              }}
              style={styles.heroImage}
            />
          )}
          <View style={styles.heroGradient} />
          <SafeAreaView edges={["top"]} style={styles.heroTopBar}>
            <TouchableOpacity
              testID="back-btn"
              style={styles.iconBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.sourcePill}>
              <Feather
                name={parsed.source === "ai" ? "cpu" : "book-open"}
                size={12}
                color={COLORS.surfaceHighlight}
              />
              <Text style={styles.sourcePillText}>
                {parsed.source === "ai" ? "AI crafted" : "Classic"}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Title block */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.titleBlock}
        >
          <Text style={styles.cuisineTag} testID="recipe-cuisine">
            {parsed.cuisine === "indian" ? "Indian · Homestyle" : "Global · Homestyle"}
          </Text>
          <Text style={styles.title} testID="recipe-title">{parsed.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{parsed.cook_time} min</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Feather name="activity" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{parsed.difficulty}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Feather name="check-circle" size={14} color={COLORS.success} />
              <Text style={styles.metaText}>{parsed.have.length} you have</Text>
            </View>
          </View>
        </Animated.View>

        {/* Ingredients */}
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>

          {parsed.have.length > 0 && (
            <View style={styles.ingredientGroup}>
              <Text style={styles.groupLabel}>You have</Text>
              {parsed.have.map((ing, i) => (
                <View key={`have-${i}`} style={styles.ingredientRow} testID={`have-${i}`}>
                  <View style={[styles.bullet, { backgroundColor: COLORS.success }]}>
                    <Feather name="check" size={11} color="#fff" />
                  </View>
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </View>
          )}

          {parsed.missing.length > 0 && (
            <View style={[styles.ingredientGroup, { marginTop: 14 }]}>
              <View style={styles.missingHeader}>
                <Text style={styles.groupLabel}>Shopping list</Text>
                <View style={styles.missingBadge}>
                  <Text style={styles.missingBadgeText}>{parsed.missing.length}</Text>
                </View>
              </View>
              {parsed.missing.map((ing, i) => (
                <View key={`miss-${i}`} style={styles.ingredientRow} testID={`missing-${i}`}>
                  <View style={[styles.bullet, styles.bulletMissing]}>
                    <Feather name="shopping-bag" size={10} color={COLORS.primary} />
                  </View>
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Steps */}
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Method</Text>
          {parsed.steps.map((step, i) => (
            <Animated.View
              key={`step-${i}`}
              entering={FadeInDown.delay(250 + i * 80).duration(350)}
              style={styles.stepRow}
              testID={`step-${i}`}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <SafeAreaView edges={["bottom"]} style={styles.ctaWrap}>
        <TouchableOpacity
          testID="new-recipe-btn"
          style={styles.cta}
          onPress={() => router.replace("/")}
          activeOpacity={0.9}
        >
          <Feather name="refresh-cw" size={18} color={COLORS.surfaceHighlight} />
          <Text style={styles.ctaText}>Try another recipe</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    height: 340,
    backgroundColor: COLORS.surface,
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  heroFallbackText: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45,36,34,0.08)",
  },
  heroTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(242,239,235,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  sourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(45,36,34,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sourcePillText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: COLORS.surfaceHighlight,
    letterSpacing: 0.5,
  },
  titleBlock: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  cuisineTag: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.primary,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 32,
    lineHeight: 38,
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    flexWrap: "wrap",
    gap: 10,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  section: { paddingHorizontal: 24, paddingTop: 28 },
  sectionTitle: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  ingredientGroup: {
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 18,
    padding: 16,
  },
  groupLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  missingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  missingBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 8,
  },
  missingBadgeText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.surfaceHighlight,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  bullet: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletMissing: {
    backgroundColor: "rgba(166,23,28,0.1)",
  },
  ingredientText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
    textTransform: "capitalize",
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: "Fraunces_700Bold",
    color: COLORS.surfaceHighlight,
    fontSize: 15,
  },
  stepText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
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
    paddingVertical: 16,
  },
  ctaText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.surfaceHighlight,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
