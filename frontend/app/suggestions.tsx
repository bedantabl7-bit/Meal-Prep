import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

const COLORS = {
  primary: "#A6171C",
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
  tagline?: string;
  cuisine: string;
  cook_time: number;
  difficulty: string;
  have: string[];
  missing: string[];
  steps: string[];
  source: string;
};

export default function SuggestionsScreen() {
  const router = useRouter();
  const { suggestions, ingredients } = useLocalSearchParams<{
    suggestions: string;
    ingredients: string;
  }>();

  const list: Recipe[] = suggestions ? JSON.parse(suggestions as string) : [];
  const ingList: string[] = ingredients ? JSON.parse(ingredients as string) : [];

  const pickRecipe = (r: Recipe) => {
    router.push({ pathname: "/recipe", params: { recipe: JSON.stringify(r) } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="back-btn"
          style={styles.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(350)}>
          <Text style={styles.eyebrow}>
            {list.length} recipes with what you have
          </Text>
          <Text style={styles.title}>
            Pick what{"\n"}sounds good today
          </Text>
          {ingList.length > 0 && (
            <Text style={styles.subtitle}>
              From your fridge: {ingList.slice(0, 6).join(" · ")}
              {ingList.length > 6 ? "…" : ""}
            </Text>
          )}
        </Animated.View>

        <View style={{ height: 20 }} />

        {list.map((r, i) => {
          const totalIng = r.have.length + r.missing.length;
          return (
            <Animated.View
              key={r.id}
              entering={FadeInDown.delay(i * 90).duration(400)}
            >
              <TouchableOpacity
                testID={`suggestion-${i}`}
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => pickRecipe(r)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.sourceTag}>
                    <Feather
                      name={r.source === "ai" ? "cpu" : "book-open"}
                      size={10}
                      color={COLORS.primary}
                    />
                    <Text style={styles.sourceTagText}>
                      {r.source === "ai" ? "AI" : "Classic"}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{r.title}</Text>
                  {!!r.tagline && (
                    <Text style={styles.cardTagline} numberOfLines={2}>
                      {r.tagline}
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="clock" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>{r.cook_time} min</Text>
                    </View>
                    <View style={styles.metaDot} />
                    <View style={styles.metaItem}>
                      <Feather name="activity" size={12} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>{r.difficulty}</Text>
                    </View>
                    <View style={styles.metaDot} />
                    <View style={styles.metaItem}>
                      <Feather name="check-circle" size={12} color={COLORS.success} />
                      <Text style={styles.metaText}>
                        {r.have.length}/{totalIng} have
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <View style={styles.arrow}>
                    <Feather name="arrow-right" size={18} color={COLORS.surfaceHighlight} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <View style={{ height: 20 }} />
        <TouchableOpacity
          testID="try-different"
          onPress={() => router.back()}
          style={styles.tryDifferent}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={14} color={COLORS.textSecondary} />
          <Text style={styles.tryDifferentText}>Try different ingredients</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  eyebrow: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLORS.primary,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 30,
    lineHeight: 36,
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    alignItems: "center",
  },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: "center", justifyContent: "center" },
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(166,23,28,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
  },
  sourceTagText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 20,
    lineHeight: 24,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  cardTagline: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tryDifferent: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tryDifferentText: {
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
