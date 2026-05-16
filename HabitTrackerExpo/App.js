import React, { useEffect } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const TODAY = new Date();

const habits = [
  {
    id: 'water',
    name: 'Drink Water',
    goal: '8 glasses today',
    goalCount: 8,
    todayCount: 8,
    lastCompletedAt: '2026-05-15T07:50:00',
    palette: {
      lidTop: '#8ab4ff',
      lidMid: '#5c6cff',
      lidBot: '#2a33c7',
      glassLeft: '#dce8ff',
      glassCenter: '#f7faff',
      glassRight: '#7d8cff',
      waterTop: '#93e5ff',
      waterMid: '#5f8dff',
      waterBot: '#263cc8',
      accent: '#8292ff',
      accentSoft: 'rgba(130,146,255,0.18)',
      panel: ['rgba(31,36,88,0.98)', 'rgba(16,19,49,0.96)'],
      text: '#eaf0ff',
      subtext: '#a7b1d6',
      badgeBg: '#eff4ff',
      badgeText: '#2a33c7',
    },
  },
  {
    id: 'workout',
    name: 'Workout',
    goal: '4 sessions this week',
    goalCount: 4,
    todayCount: 0,
    lastCompletedAt: '2026-05-13T18:10:00',
    palette: {
      lidTop: '#ffd968',
      lidMid: '#ff9e16',
      lidBot: '#c45a00',
      glassLeft: '#ffe9bf',
      glassCenter: '#fff8eb',
      glassRight: '#ffbc5b',
      waterTop: '#ffe999',
      waterMid: '#ffb63c',
      waterBot: '#cb6d00',
      accent: '#ffb64d',
      accentSoft: 'rgba(255,182,77,0.18)',
      panel: ['rgba(84,52,8,0.98)', 'rgba(44,25,5,0.96)'],
      text: '#fff6e6',
      subtext: '#d9c39b',
      badgeBg: '#fff3db',
      badgeText: '#b45309',
    },
  },
  {
    id: 'meditate',
    name: 'Meditate',
    goal: '10 mins today',
    goalCount: 1,
    todayCount: 0,
    lastCompletedAt: '2026-05-12T06:30:00',
    palette: {
      lidTop: '#b396ff',
      lidMid: '#8556ff',
      lidBot: '#4f1fb6',
      glassLeft: '#eadbff',
      glassCenter: '#fbf8ff',
      glassRight: '#a584ff',
      waterTop: '#c9b8ff',
      waterMid: '#8a62ff',
      waterBot: '#5524be',
      accent: '#ab89ff',
      accentSoft: 'rgba(171,137,255,0.18)',
      panel: ['rgba(56,28,111,0.98)', 'rgba(24,11,53,0.96)'],
      text: '#f5f1ff',
      subtext: '#c7bde6',
      badgeBg: '#f3edff',
      badgeText: '#5b21b6',
    },
  },
  {
    id: 'reading',
    name: 'Read',
    goal: '20 mins today',
    goalCount: 1,
    todayCount: 0,
    lastCompletedAt: '2026-05-11T21:00:00',
    palette: {
      lidTop: '#77ec9b',
      lidMid: '#1fbe68',
      lidBot: '#11673d',
      glassLeft: '#d4ffe3',
      glassCenter: '#f4fff8',
      glassRight: '#5cdf90',
      waterTop: '#99f1b6',
      waterMid: '#38cb7b',
      waterBot: '#15884a',
      accent: '#6de09a',
      accentSoft: 'rgba(109,224,154,0.18)',
      panel: ['rgba(17,73,44,0.98)', 'rgba(8,38,23,0.96)'],
      text: '#ebfff2',
      subtext: '#b3d8c1',
      badgeBg: '#ebfff1',
      badgeText: '#166534',
    },
  },
];

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(fromDate, toDate) {
  return Math.floor((startOfDay(fromDate).getTime() - startOfDay(toDate).getTime()) / 86400000);
}

function getHabitState(habit) {
  const ratio = Math.min(habit.todayCount / habit.goalCount, 1);
  const needsWater = ratio < 1;
  const missedDays = needsWater ? Math.max(0, daysBetween(TODAY, new Date(habit.lastCompletedAt))) : 0;
  const neglectDays = Math.min(missedDays, 4);

  let phase = 'healthy';
  if (neglectDays === 1) phase = 'watch';
  if (neglectDays === 2) phase = 'warning';
  if (neglectDays === 3) phase = 'critical';
  if (neglectDays >= 4) phase = 'broken';

  const baseFill = 0.18 + ratio * 0.62;
  const decay = neglectDays * 0.11;
  const fillLevel = phase === 'broken' ? 0 : Math.max(0.08, Math.min(0.84, baseFill - decay));
  const breakStartFill = Math.max(0.24, Math.min(0.78, baseFill - 0.18));

  const statusLabel = {
    healthy: 'Stable',
    watch: 'Tiny crack',
    warning: 'Warning',
    critical: 'Last day',
    broken: 'Broken',
  }[phase];

  const statusText = {
    healthy: 'Fed today. Glass is strong and sealed.',
    watch: 'Missed 1 day. A hairline crack starts to show.',
    warning: 'Missed 2 days. The crack spreads and water drops faster.',
    critical: 'Missed 3 days. One more missed day and the jar will burst.',
    broken: 'Missed 4 days. The jar breaks when the user opens the app.',
  }[phase];

  return {
    ...habit,
    ratio,
    missedDays,
    neglectDays,
    phase,
    fillLevel,
    breakStartFill,
    statusLabel,
    statusText,
  };
}

function wavePath(level, phase) {
  const top = 38 + (1 - level) * 86;
  const amp = 4.5 + level * 1.2;
  const x = 18;
  const width = 84;
  const seg = width / 4;
  let d = `M${x},${top}`;

  for (let i = 0; i < 4; i += 1) {
    const x1 = x + i * seg + seg / 3;
    const x2 = x + i * seg + (2 * seg) / 3;
    const xe = x + (i + 1) * seg;
    const y1 = top + amp * Math.sin((phase + i + 0.18) * Math.PI);
    const y2 = top + amp * Math.sin((phase + i + 0.62) * Math.PI);
    const ye = top + amp * Math.sin((phase + i + 0.92) * Math.PI);
    d += ` C${x1},${y1} ${x2},${y2} ${xe},${ye}`;
  }

  d += ' L102,136 L18,136 Z';
  return d;
}

function crackPaths(level) {
  const paths = [
    'M71 54 L67 78 L73 92 L68 116',
    'M67 78 L61 89',
    'M72 92 L77 104',
    'M68 116 L61 126',
  ];
  return paths.slice(0, Math.max(0, level));
}

function leakStreamPath(progress, lane) {
  const startX = 66 + lane * 5;
  const sway = Math.sin(progress * Math.PI * 2 + lane) * (3 + lane);
  const midX = startX + sway;
  const endX = startX - 6 + sway * 0.4;
  const endY = 160 + progress * 22 + lane * 6;
  return `M${startX} 112 C${startX + 6} 126 ${midX} 143 ${endX} ${endY}`;
}

function statusTone(phase) {
  if (phase === 'healthy') {
    return {
      chipBg: 'rgba(111,231,183,0.16)',
      chipBorder: 'rgba(111,231,183,0.34)',
      chipText: '#8af0c2',
    };
  }

  if (phase === 'broken') {
    return {
      chipBg: 'rgba(255,107,107,0.14)',
      chipBorder: 'rgba(255,107,107,0.38)',
      chipText: '#ffb4b4',
    };
  }

  return {
    chipBg: 'rgba(255,193,92,0.14)',
    chipBorder: 'rgba(255,193,92,0.35)',
    chipText: '#ffd894',
  };
}

function JarVisual({ habit }) {
  const drift = useSharedValue(0);
  const bubble1 = useSharedValue(0);
  const bubble2 = useSharedValue(0);
  const reveal = useSharedValue(0);
  const waterLevel = useSharedValue(habit.phase === 'broken' ? habit.breakStartFill : habit.fillLevel);
  const drain = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    bubble1.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.linear }), -1, false);
    bubble2.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);

    if (habit.phase === 'broken') {
      reveal.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
      drain.value = withDelay(220, withTiming(1, { duration: 1850, easing: Easing.out(Easing.cubic) }));
      waterLevel.value = withDelay(200, withTiming(0, { duration: 1700, easing: Easing.out(Easing.cubic) }));
      return;
    }

    reveal.value = withDelay(160, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    waterLevel.value = withTiming(habit.fillLevel, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [bubble1, bubble2, drain, drift, habit.breakStartFill, habit.fillLevel, habit.phase, reveal, waterLevel]);

  const waterRectProps = useAnimatedProps(() => {
    const top = 38 + (1 - waterLevel.value) * 86;
    return {
      y: top,
      height: Math.max(0, 136 - top),
      opacity: waterLevel.value <= 0.001 ? 0 : 1,
    };
  });

  const waveBackProps = useAnimatedProps(() => ({
    d: wavePath(Math.max(waterLevel.value, 0), drift.value * 2),
    opacity: waterLevel.value <= 0.001 ? 0 : 0.94,
  }));

  const waveFrontProps = useAnimatedProps(() => ({
    d: wavePath(Math.max(waterLevel.value, 0), drift.value * 2 + 0.7),
    opacity: waterLevel.value <= 0.001 ? 0 : 0.18,
  }));

  const bubble1Props = useAnimatedProps(() => ({
    cy: 118 - bubble1.value * 52,
    cx: 40 + Math.sin(bubble1.value * Math.PI * 2) * 2,
    opacity: waterLevel.value < 0.16 ? 0 : 0.3 - bubble1.value * 0.28,
  }));

  const bubble2Props = useAnimatedProps(() => ({
    cy: 112 - bubble2.value * 45,
    cx: 76 + Math.sin(bubble2.value * Math.PI * 2) * 1.6,
    opacity: waterLevel.value < 0.2 ? 0 : 0.2 - bubble2.value * 0.18,
  }));

  const stream1Props = useAnimatedProps(() => {
    const flow = reveal.value * interpolate(waterLevel.value, [0, habit.breakStartFill], [0, 1], Extrapolation.CLAMP);
    return {
      d: leakStreamPath(drain.value, 0),
      opacity: flow * 0.95,
    };
  });

  const stream2Props = useAnimatedProps(() => {
    const flow = reveal.value * interpolate(waterLevel.value, [0, habit.breakStartFill], [0, 1], Extrapolation.CLAMP);
    return {
      d: leakStreamPath(drain.value * 0.95, 1),
      opacity: flow * 0.72,
    };
  });

  const stream3Props = useAnimatedProps(() => {
    const flow = reveal.value * interpolate(waterLevel.value, [0, habit.breakStartFill], [0, 1], Extrapolation.CLAMP);
    return {
      d: leakStreamPath(drain.value * 0.88, 2),
      opacity: flow * 0.48,
    };
  });

  const puddleProps = useAnimatedProps(() => {
    const spread = reveal.value * interpolate(drain.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    return {
      rx: 12 + spread * 18,
      ry: 4 + spread * 4,
      opacity: spread * 0.46,
    };
  });

  const crackOpacityProps = useAnimatedProps(() => ({
    opacity: habit.neglectDays === 0 ? 0 : reveal.value,
  }));

  const glassGlow = habit.phase === 'healthy' ? 0.22 : habit.phase === 'broken' ? 0.1 : 0.16;

  return (
    <Svg width={120} height={174} viewBox="0 0 120 174">
      <Defs>
        <SvgLinearGradient id={`lid_${habit.id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={habit.palette.lidTop} />
          <Stop offset="55%" stopColor={habit.palette.lidMid} />
          <Stop offset="100%" stopColor={habit.palette.lidBot} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`glass_${habit.id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={habit.palette.glassLeft} stopOpacity="0.68" />
          <Stop offset="20%" stopColor={habit.palette.glassCenter} stopOpacity="0.84" />
          <Stop offset="72%" stopColor={habit.palette.glassCenter} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={habit.palette.glassRight} stopOpacity="0.56" />
        </SvgLinearGradient>
        <SvgLinearGradient id={`water_${habit.id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={habit.palette.waterTop} />
          <Stop offset="45%" stopColor={habit.palette.waterMid} />
          <Stop offset="100%" stopColor={habit.palette.waterBot} />
        </SvgLinearGradient>
        <ClipPath id={`jarClip_${habit.id}`}>
          <Path d="M18 38 L18 118 Q18 136 60 136 Q102 136 102 118 L102 38 Z" />
        </ClipPath>
      </Defs>

      <AnimatedEllipse animatedProps={puddleProps} cx="68" cy="162" fill={habit.palette.waterMid} />
      <Ellipse cx="60" cy="157" rx="34" ry="7" fill={habit.palette.lidBot} opacity="0.18" />

      <Ellipse cx="60" cy="30" rx="34" ry="6" fill={habit.palette.lidBot} opacity="0.2" />
      <Rect x="24" y="10" width="72" height="24" rx="12" fill={`url(#lid_${habit.id})`} />
      <Rect x="31" y="13" width="56" height="8" rx="4" fill="white" opacity="0.24" />
      <Rect x="16" y="28" width="88" height="10" rx="5" fill={habit.palette.lidBot} opacity="0.24" />

      <Path
        d="M18 38 L18 118 Q18 136 60 136 Q102 136 102 118 L102 38 Z"
        fill={`url(#glass_${habit.id})`}
        stroke={habit.palette.glassRight}
        strokeWidth="1.7"
      />

      <G clipPath={`url(#jarClip_${habit.id})`}>
        <AnimatedRect animatedProps={waterRectProps} x="18" width="84" fill={`url(#water_${habit.id})`} />
        <AnimatedPath animatedProps={waveBackProps} fill={habit.palette.waterMid} />
        <AnimatedPath animatedProps={waveFrontProps} fill="white" />
        <AnimatedCircle animatedProps={bubble1Props} r="2.4" fill="white" />
        <AnimatedCircle animatedProps={bubble2Props} r="1.8" fill="white" />
      </G>

      <Path d="M28 42 Q23 72 23 108 Q23 122 26 130" stroke="white" strokeWidth="7" strokeLinecap="round" opacity={glassGlow} />
      <Path d="M34 41 Q32 55 31 72" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity="0.16" />
      <Path d="M101 46 Q103 74 102 116" stroke={habit.palette.glassRight} strokeWidth="4" strokeLinecap="round" opacity="0.34" />

      {crackPaths(habit.neglectDays).map((path, index) => (
        <AnimatedPath
          key={`${habit.id}_crack_${index}`}
          animatedProps={crackOpacityProps}
          d={path}
          stroke={habit.phase === 'broken' ? '#f7fbff' : '#cfd8ec'}
          strokeWidth={habit.phase === 'broken' ? '2.3' : '1.9'}
          strokeLinecap="round"
        />
      ))}

      {habit.phase === 'broken' ? (
        <>
          <AnimatedPath animatedProps={stream1Props} stroke={habit.palette.waterTop} strokeWidth="4.6" strokeLinecap="round" fill="none" />
          <AnimatedPath animatedProps={stream2Props} stroke="rgba(255,255,255,0.8)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <AnimatedPath animatedProps={stream3Props} stroke={habit.palette.waterMid} strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </>
      ) : null}

      <Rect x="31" y="112" width="58" height="15" rx="7.5" fill="rgba(9,10,20,0.18)" />
      <Rect x="32" y="113" width="56" height="13" rx="6.5" fill={habit.palette.badgeBg} />
      <SvgText
        x="60"
        y="122.5"
        fill={habit.palette.badgeText}
        fontSize="8"
        fontWeight="800"
        textAnchor="middle"
      >
        {habit.statusLabel}
      </SvgText>
    </Svg>
  );
}

function HabitCard({ habit }) {
  const tone = statusTone(habit.phase);

  return (
    <LinearGradient colors={habit.palette.panel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.habitCard}>
      <View style={styles.cardGlow} />
      <View style={styles.cardTopRow}>
        <View style={[styles.stateChip, { backgroundColor: tone.chipBg, borderColor: tone.chipBorder }]}>
          <Text style={[styles.stateChipText, { color: tone.chipText }]}>{habit.statusLabel}</Text>
        </View>
        <Text style={[styles.countText, { color: habit.palette.text }]}>{`${habit.todayCount}/${habit.goalCount}`}</Text>
      </View>

      <View style={styles.jarFrame}>
        <JarVisual habit={habit} />
      </View>

      <Text style={[styles.habitName, { color: habit.palette.text }]}>{habit.name}</Text>
      <Text style={[styles.habitGoal, { color: habit.palette.subtext }]}>{habit.goal}</Text>

      {(habit.phase === 'warning' || habit.phase === 'critical' || habit.phase === 'broken') ? (
        <View style={styles.warningRow}>
          <View style={styles.warningDot} />
          <Text style={styles.warningText}>
            {habit.phase === 'broken' ? 'User sees the burst now.' : `${4 - habit.neglectDays} day${4 - habit.neglectDays === 1 ? '' : 's'} before break.`}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.statusCopy, { color: habit.palette.subtext }]}>{habit.statusText}</Text>
    </LinearGradient>
  );
}

export default function App() {
  const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const done = [1, 1, 1, 0, 0, 0, 0];
  const derivedHabits = habits.map(getHabitState);
  const healthyCount = derivedHabits.filter((habit) => habit.phase === 'healthy').length;
  const atRiskCount = derivedHabits.filter((habit) => habit.phase === 'warning' || habit.phase === 'critical').length;
  const brokenCount = derivedHabits.filter((habit) => habit.phase === 'broken').length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#090d1c" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#11152c', '#090d1c']} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.eyebrow}>Habit Vault</Text>
              <Text style={styles.heroTitle}>Your jars tell the truth.</Text>
              <Text style={styles.heroCopy}>Healthy jars stay calm. Neglected jars crack day by day and burst on day four when the user opens the app.</Text>
            </View>
            <LinearGradient colors={['#8b5cf6', '#5b6cff']} style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>A</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>12d</Text>
              <Text style={styles.summaryLabel}>Current streak</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>27d</Text>
              <Text style={styles.summaryLabel}>Best streak</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, brokenCount > 0 && { color: '#ff9a9a' }]}>{brokenCount}</Text>
              <Text style={styles.summaryLabel}>Broken today</Text>
            </View>
          </View>

          <View style={styles.weekStrip}>
            {week.map((day, index) => (
              <View key={day + index} style={styles.weekCell}>
                <Text style={styles.weekDay}>{day}</Text>
                <View style={[styles.weekDot, !done[index] && styles.weekDotOff]} />
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.insightRow}>
          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>{healthyCount}</Text>
            <Text style={styles.insightLabel}>Stable jars</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={[styles.insightValue, { color: '#ffd37f' }]}>{atRiskCount}</Text>
            <Text style={styles.insightLabel}>Need attention</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={[styles.insightValue, { color: '#ff9c9c' }]}>{brokenCount}</Text>
            <Text style={styles.insightLabel}>Burst on open</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Jars</Text>
            <Text style={styles.sectionSub}>Clear warning states, stronger glass detail, and believable draining.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.9}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {derivedHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </View>

        <LinearGradient colors={['rgba(74,94,255,0.2)', 'rgba(123,63,255,0.14)']} style={styles.footerBanner}>
          <Text style={styles.footerEyebrow}>Behavior rule</Text>
          <Text style={styles.footerTitle}>No fake leaking when the jar is already empty.</Text>
          <Text style={styles.footerCopy}>Water motion is now tied to real fill level, so a `0/goal` jar only drains during the break reveal and then fully stops.</Text>
        </LinearGradient>
      </ScrollView>

      <View style={styles.bottomNavWrap}>
        <LinearGradient colors={['#2d1b69', '#1a1636']} style={styles.bottomNav}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}><Text style={styles.navIconActive}>⌂</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Text style={styles.navIcon}>▥</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Text style={styles.navIcon}>🏆</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Text style={styles.navIcon}>◌</Text></TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090d1c' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 132 },

  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142,155,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 16,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  eyebrow: { color: '#9ba8d9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.1 },
  heroTitle: { color: '#f5f7ff', fontSize: 28, fontWeight: '900', lineHeight: 32, marginTop: 8, maxWidth: 230 },
  heroCopy: { color: '#aeb8dc', fontSize: 13.5, lineHeight: 20, marginTop: 10, maxWidth: 250 },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2.5,
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: '#161b38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarText: { color: '#f5f7ff', fontSize: 20, fontWeight: '900' },

  summaryRow: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#f5f7ff', fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: '#96a2cb', fontSize: 11, fontWeight: '600', marginTop: 3 },
  summaryDivider: { width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.08)' },

  weekStrip: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8,10,24,0.44)',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  weekCell: { alignItems: 'center', gap: 8, flex: 1 },
  weekDay: { color: '#7f8bb4', fontSize: 10, fontWeight: '700' },
  weekDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6d79ff',
    shadowColor: '#6d79ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  weekDotOff: { backgroundColor: 'rgba(255,255,255,0.08)', shadowOpacity: 0, elevation: 0 },

  insightRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  insightCard: {
    flex: 1,
    backgroundColor: '#11162a',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142,155,255,0.12)',
  },
  insightValue: { color: '#9fe0ff', fontSize: 24, fontWeight: '900' },
  insightLabel: { color: '#8f9bc4', fontSize: 11, fontWeight: '600', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 },
  sectionTitle: { color: '#f5f7ff', fontSize: 32, fontWeight: '900', letterSpacing: -1.1 },
  sectionSub: { color: '#8d97bc', fontSize: 12.5, marginTop: 4, lineHeight: 18, maxWidth: 245 },
  addButton: {
    backgroundColor: '#1a2138',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addButtonText: { color: '#dbe2ff', fontSize: 14, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  habitCard: {
    width: '48%',
    minHeight: 356,
    borderRadius: 28,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -24,
    right: -10,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  stateChipText: { fontSize: 11, fontWeight: '800' },
  countText: { fontSize: 18, fontWeight: '900' },
  jarFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 2,
    minHeight: 182,
  },
  habitName: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  habitGoal: { fontSize: 11.5, fontWeight: '600', marginTop: 5 },
  warningRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffb547' },
  warningText: { flex: 1, color: '#ffe0a8', fontSize: 10.5, fontWeight: '700', lineHeight: 14 },
  statusCopy: { fontSize: 11.5, fontWeight: '500', lineHeight: 17, marginTop: 10 },

  footerBanner: {
    marginTop: 18,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(120,128,255,0.15)',
    marginBottom: 8,
  },
  footerEyebrow: { color: '#94a3d8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  footerTitle: { color: '#f5f7ff', fontSize: 18, fontWeight: '900', marginTop: 6 },
  footerCopy: { color: '#acb7da', fontSize: 12.5, lineHeight: 19, marginTop: 6 },

  bottomNavWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: Platform.OS === 'ios' ? 20 : 14,
  },
  bottomNav: {
    borderRadius: 34,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navItem: {
    width: 58,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: { backgroundColor: '#4a79f6' },
  navIcon: { color: '#7e86b0', fontSize: 22, fontWeight: '700' },
  navIconActive: { color: '#fff', fontSize: 22, fontWeight: '800' },
});
