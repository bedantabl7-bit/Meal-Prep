import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

const COLORS = {
  primary: "#A6171C",
  background: "#D6D0C5",
  surface: "#E5E1D8",
  surfaceHighlight: "#F2EFEB",
  textPrimary: "#2D2422",
  textSecondary: "#5C4E4A",
  panDark: "#2D2422",
  panRing: "#4A3A36",
};

const CAPTIONS = [
  "Tempering the spices…",
  "Chopping onions, no tears…",
  "Simmering something good…",
  "Almost ready to serve…",
];

export default function CookingLoader({ message }: { message?: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (message) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % CAPTIONS.length), 1800);
    return () => clearInterval(t);
  }, [message]);

  // Pan wobble (like someone flipping/tossing)
  const wobble = useSharedValue(0);
  useEffect(() => {
    wobble.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  // Spatula rotation
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false
    );
  }, []);

  // Steam streams
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);
  const s3 = useSharedValue(0);
  useEffect(() => {
    const cfg = (sv: any, d: number) => {
      sv.value = 0;
      sv.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
    };
    setTimeout(() => cfg(s1, 0), 0);
    setTimeout(() => cfg(s2, 0), 600);
    setTimeout(() => cfg(s3, 0), 1200);
  }, []);

  const panStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value * 6}deg` }],
  }));
  const spatulaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -14 + Math.sin(spin.value * Math.PI * 2) * 18 },
      { translateY: 6 + Math.cos(spin.value * Math.PI * 2) * 4 },
      { rotate: `${spin.value * 360}deg` },
    ],
  }));

  const steam1 = useAnimatedStyle(() => ({
    opacity: 1 - s1.value,
    transform: [
      { translateY: -s1.value * 60 },
      { translateX: -22 + Math.sin(s1.value * Math.PI * 2) * 6 },
      { scale: 0.6 + s1.value * 0.6 },
    ],
  }));
  const steam2 = useAnimatedStyle(() => ({
    opacity: 1 - s2.value,
    transform: [
      { translateY: -s2.value * 60 },
      { translateX: 0 + Math.sin(s2.value * Math.PI * 2) * 6 },
      { scale: 0.6 + s2.value * 0.6 },
    ],
  }));
  const steam3 = useAnimatedStyle(() => ({
    opacity: 1 - s3.value,
    transform: [
      { translateY: -s3.value * 60 },
      { translateX: 22 + Math.sin(s3.value * Math.PI * 2) * 6 },
      { scale: 0.6 + s3.value * 0.6 },
    ],
  }));

  const activeMessage = message ?? CAPTIONS[idx];

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
      pointerEvents="auto"
      testID="cooking-loader"
    >
      <View style={styles.card}>
        <View style={styles.stage}>
          {/* Steam */}
          <Animated.View style={[styles.steam, steam1]} />
          <Animated.View style={[styles.steam, steam2]} />
          <Animated.View style={[styles.steam, steam3]} />

          {/* Pan */}
          <Animated.View style={[styles.panContainer, panStyle]}>
            <View style={styles.panBody}>
              {/* Food circles */}
              <View style={[styles.food, { left: 14, top: 14, backgroundColor: "#C97B3C" }]} />
              <View style={[styles.food, { left: 44, top: 22, backgroundColor: "#D4A373" }]} />
              <View style={[styles.food, { left: 68, top: 12, backgroundColor: "#7A8C3C" }]} />
              <View style={[styles.food, { left: 30, top: 38, backgroundColor: "#A6171C" }]} />
              {/* Spatula (simple rectangle rotating around pan) */}
              <Animated.View style={[styles.spatula, spatulaStyle]} />
            </View>
            <View style={styles.panHandle} />
          </Animated.View>

          {/* Stove flame hint */}
          <View style={styles.flame} />
          <View style={styles.stove} />
        </View>

        <Text style={styles.caption} numberOfLines={1}>{activeMessage}</Text>
        <Text style={styles.hint}>Good food takes a breath</Text>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45,36,34,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    width: Math.min(width * 0.8, 340),
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  stage: {
    width: 180,
    height: 160,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  panContainer: {
    position: "absolute",
    bottom: 34,
    alignItems: "center",
    flexDirection: "row",
  },
  panBody: {
    width: 110,
    height: 64,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: COLORS.panDark,
    borderWidth: 3,
    borderColor: COLORS.panRing,
    overflow: "hidden",
  },
  panHandle: {
    width: 54,
    height: 9,
    backgroundColor: COLORS.panRing,
    borderRadius: 4,
    marginLeft: -2,
    marginTop: 26,
  },
  food: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 999,
  },
  spatula: {
    position: "absolute",
    width: 20,
    height: 6,
    backgroundColor: "#E5E1D8",
    borderRadius: 4,
    left: 44,
    top: 28,
  },
  flame: {
    position: "absolute",
    bottom: 18,
    width: 40,
    height: 22,
    backgroundColor: "#D4A373",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.55,
  },
  stove: {
    position: "absolute",
    bottom: 0,
    width: 160,
    height: 18,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
  },
  steam: {
    position: "absolute",
    top: 20,
    width: 10,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#C7C0B3",
  },
  caption: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  hint: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
