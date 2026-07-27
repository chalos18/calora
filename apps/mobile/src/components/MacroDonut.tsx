import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { theme } from "../theme";

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export interface MacroDonutProps {
  protein: number;
  carbs: number;
  fat: number;
  /** Shown in the centre. Calories remaining on the home screen. */
  centreValue: number;
  centreLabel: string;
  size?: number;
}

/**
 * Calories in the middle, the ring split by where those calories came from.
 *
 * The split is by calorie contribution rather than by gram weight, so the ring
 * reflects the energy actually eaten - a gram of fat is 9 kcal against 4 for
 * protein, and splitting by mass would misrepresent it.
 */
export const MacroDonut = ({
  protein,
  carbs,
  fat,
  centreValue,
  centreLabel,
  size = 220,
}: MacroDonutProps) => {
  const strokeWidth = size * 0.11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const kcal = {
    protein: protein * KCAL_PER_G.protein,
    carbs: carbs * KCAL_PER_G.carbs,
    fat: fat * KCAL_PER_G.fat,
  };
  const total = kcal.protein + kcal.carbs + kcal.fat;

  const segments = (
    [
      { key: "carbs", value: kcal.carbs, colour: theme.colour.carbs },
      { key: "protein", value: kcal.protein, colour: theme.colour.protein },
      { key: "fat", value: kcal.fat, colour: theme.colour.fat },
    ] as const
  ).filter((segment) => segment.value > 0);

  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colour.surfaceRaised}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0 &&
            segments.map((segment) => {
              const fraction = segment.value / total;
              const dash = fraction * circumference;
              const element = (
                <Circle
                  key={segment.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={segment.colour}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return element;
            })}
        </G>
      </Svg>

      <View style={[styles.centre, { width: size, height: size }]}>
        <Text style={styles.value}>{Math.round(centreValue).toLocaleString()}</Text>
        <Text style={styles.label}>{centreLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centre: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: theme.colour.text,
    fontSize: theme.font.display,
    fontWeight: "700",
  },
  label: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
