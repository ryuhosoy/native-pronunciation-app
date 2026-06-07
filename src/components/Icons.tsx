import { useEffect } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const WAVE_BARS = [
  { x: 3, h: 6, y: 9, delay: 0 },
  { x: 7, h: 12, y: 6, delay: 150 },
  { x: 11, h: 16, y: 4, delay: 300 },
  { x: 15, h: 12, y: 6, delay: 100 },
  { x: 19, h: 6, y: 9, delay: 250 },
];

function WaveBar({ x, h, y, delay }: { x: number; h: number; y: number; delay: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 250 }),
          withTiming(1, { duration: 250 }),
        ),
        -1,
      ),
    );
  }, [delay, scale]);

  const animatedProps = useAnimatedProps(() => {
    const currentH = h * scale.value;
    return {
      height: currentH,
      y: y + (h - currentH) / 2,
    };
  });

  return <AnimatedRect animatedProps={animatedProps} x={x} width={2} rx={1} fill="white" />;
}

export function TriangleIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5.5v13l10-6.5L8 5.5z" fill="white" />
    </Svg>
  );
}

export function WaveIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {WAVE_BARS.map((bar, i) => (
        <WaveBar key={i} {...bar} />
      ))}
    </Svg>
  );
}
