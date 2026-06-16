import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TriangleIcon, WaveIcon } from './src/components/Icons';
import { colors } from './src/constants/theme';
import { FREE_PLAY_LIMIT } from './src/constants/subscription';
import type { Lesson, Phase } from './src/types/lesson';
import { fetchRandomLesson } from './src/lib/lessons';
import { checkAnswer, getDisplayCorrectAnswer } from './src/lib/checkAnswer';
import { getPlayCount, incrementPlayCount } from './src/lib/playLimit';
import {
  configurePurchases,
  isPremiumUser,
  logCustomerInfo,
  presentPaywall,
} from './src/lib/purchases';
import {
  playCorrectSound,
  playIncorrectSound,
  stopFeedbackSoundPlayback,
} from './src/lib/feedbackSound';
import {
  configureAudio,
  hasCachedSpeech,
  playAudio,
  stopAudio,
} from './src/lib/openaiSpeech';

export default function App() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isLoadingLesson, setIsLoadingLesson] = useState(true);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('listen');
  const [userInput, setUserInput] = useState('');
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const progressWidth = useSharedValue(0);

  const progressPercent = phase === 'listen' ? 33 : phase === 'input' ? 66 : 100;

  const loadLesson = useCallback(async (excludeId?: number) => {
    setIsLoadingLesson(true);
    setLessonError(null);
    try {
      const nextLesson = await fetchRandomLesson(excludeId);
      setLesson(nextLesson);
    } catch (error) {
      setLessonError(
        error instanceof Error ? error.message : '問題の取得に失敗しました',
      );
    } finally {
      setIsLoadingLesson(false);
    }
  }, []);

  useEffect(() => {
    progressWidth.value = withTiming(progressPercent, { duration: 400 });
  }, [progressPercent, progressWidth]);

  useEffect(() => {
    if (phase === 'input') {
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  useEffect(() => {
    void configureAudio();
    configurePurchases();
    void (async () => {
      await logCustomerInfo('RevenueCat on launch');
      const [premium, count] = await Promise.all([isPremiumUser(), getPlayCount()]);
      setIsPremium(premium);
      setPlayCount(count);
    })();
    return () => {
      void stopAudio();
      stopFeedbackSoundPlayback();
    };
  }, []);

  const hasReachedPlayLimit = !isPremium && playCount >= FREE_PLAY_LIMIT;
  const remainingPlays = Math.max(0, FREE_PLAY_LIMIT - playCount);

  const openPaywall = async () => {
    const activated = await presentPaywall();
    if (activated) {
      setIsPremium(await isPremiumUser());
    }
  };

  const speak = useCallback(async () => {
    if (!lesson || isLoadingSpeech || isPlaying) return;
    if (hasReachedPlayLimit) {
      openPaywall();
      return;
    }

    setSpeechError(null);
    if (!hasCachedSpeech(lesson.id)) {
      setIsLoadingSpeech(true);
    }

    try {
      await playAudio(
        lesson.spokenText,
        lesson.id,
        async () => {
          setIsLoadingSpeech(false);
          setIsPlaying(true);
          if (!isPremium) {
            const count = await incrementPlayCount();
            setPlayCount(count);
          }
        },
        () => {
          setIsPlaying(false);
          setPhase((current) => (current === 'listen' ? 'input' : current));
        },
      );
    } catch (error) {
      setIsLoadingSpeech(false);
      setIsPlaying(false);
      setSpeechError(
        error instanceof Error ? error.message : '音声の再生に失敗しました',
      );
    }
  }, [hasReachedPlayLimit, isLoadingSpeech, isPlaying, isPremium, lesson]);

  const showAnswer = () => {
    if (!lesson) return;
    const correct = checkAnswer(userInput, lesson);
    setIsCorrect(correct);
    if (correct) playCorrectSound();
    else playIncorrectSound();
    setPhase('answer');
  };

  const goNext = async () => {
    if (hasReachedPlayLimit) {
      openPaywall();
      return;
    }

    void stopAudio();
    stopFeedbackSoundPlayback();
    setQuestionNumber((n) => n + 1);
    setPhase('listen');
    setUserInput('');
    setIsCorrect(null);
    setIsLoadingSpeech(false);
    setIsPlaying(false);
    await loadLesson(lesson?.id);
  };

  const listenHint = speechError
    ? speechError
    : isLoadingSpeech
      ? '音声を準備しています...'
      : isPlaying
        ? '聞いてください'
        : 'タップして再生';

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (isLoadingLesson && !lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>問題を読み込んでいます...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (lessonError && !lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centeredState}>
          <Text style={styles.stateError}>{lessonError}</Text>
          <Pressable
            onPress={() => void loadLesson()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.counter}>第 {questionNumber} 問</Text>
            {!isPremium && (
              <Text style={styles.playLimit}>
                残り {remainingPlays} 回
              </Text>
            )}
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={`${lesson.id}-${phase}`}
            entering={FadeIn.duration(250)}
            style={styles.card}
          >
            <View style={styles.header}>
              <Text style={styles.headerEmoji}>🎧</Text>
              <Text style={styles.headerLabel}>LISTEN</Text>
            </View>

            <View style={styles.playButtonContainer}>
              <Pressable
                onPress={speak}
                disabled={isLoadingSpeech || isPlaying}
                style={({ pressed }) => [
                  styles.playButton,
                  isPlaying || isLoadingSpeech
                    ? styles.playButtonPlaying
                    : styles.playButtonIdle,
                  pressed && !isPlaying && !isLoadingSpeech && styles.playButtonPressed,
                ]}
              >
                {isLoadingSpeech ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : isPlaying ? (
                  <WaveIcon />
                ) : (
                  <TriangleIcon />
                )}
              </Pressable>
            </View>

            {(phase === 'listen' || isLoadingSpeech || isPlaying) && (
              <Text style={[styles.hint, speechError && styles.hintError]}>
                {listenHint}
              </Text>
            )}

            {(phase === 'input' || phase === 'answer') && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.inputSection}>
                <TextInput
                  ref={inputRef}
                  value={userInput}
                  onChangeText={setUserInput}
                  placeholder="聞こえた通りに..."
                  placeholderTextColor={colors.white25}
                  editable={phase === 'input'}
                  style={[
                    styles.input,
                    phase === 'answer' && isCorrect === true && styles.inputCorrect,
                    phase === 'answer' && isCorrect === false && styles.inputIncorrect,
                  ]}
                  selectionColor={colors.primary}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (phase === 'input') showAnswer();
                  }}
                />

                {phase === 'input' && (
                  <Pressable
                    onPress={showAnswer}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>回答する</Text>
                  </Pressable>
                )}
              </Animated.View>
            )}

            {phase === 'answer' && (
              <Animated.View entering={FadeInDown.delay(50).duration(250)} style={styles.answerSection}>
                <View
                  style={[
                    styles.resultBadge,
                    isCorrect ? styles.resultBadgeCorrect : styles.resultBadgeIncorrect,
                  ]}
                >
                  <Text
                    style={[
                      styles.resultBadgeText,
                      isCorrect ? styles.resultBadgeTextCorrect : styles.resultBadgeTextIncorrect,
                    ]}
                  >
                    {isCorrect ? '✓ 正解' : '✗ 不正解'}
                  </Text>
                </View>

                <View style={styles.comparisonCard}>
                  <View>
                    <Text style={styles.answerLabel}>あなたの回答</Text>
                    <Text style={styles.userAnswerText}>
                      {userInput.trim() || '（未入力）'}
                    </Text>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                  </View>

                  <View>
                    <Text style={styles.answerLabel}>正解</Text>
                    <Text style={styles.casualText}>
                      {getDisplayCorrectAnswer(lesson)}
                    </Text>
                  </View>
                </View>

                <View style={styles.answerCard}>
                  <View>
                    <Text style={styles.answerLabel}>元の文</Text>
                    <Text style={styles.formalText}>{lesson.spokenText}</Text>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>実際の音</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <Text style={styles.casualText}>{lesson.casual}</Text>
                </View>

                <View style={styles.breakdownList}>
                  {lesson.breakdowns.map((b, i) => (
                    <View key={i} style={styles.breakdownRow}>
                      <View style={styles.breakdownTag}>
                        <Text style={styles.breakdownTagText}>{b.casual}</Text>
                      </View>
                      <Text style={styles.breakdownEquals}>=</Text>
                      <Text style={styles.breakdownFormal}>{b.formal}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={goNext}
                  style={({ pressed }) => [
                    styles.nextButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.nextButtonText}>次へ　→</Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 12,
  },
  topBarLeft: {
    gap: 2,
  },
  counter: {
    color: colors.white20,
    fontSize: 13,
  },
  playLimit: {
    color: colors.white35,
    fontSize: 11,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    marginLeft: 16,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.white08,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerLabel: {
    color: colors.white35,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  playButtonContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonIdle: {
    backgroundColor: colors.primaryBg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  playButtonPlaying: {
    backgroundColor: colors.primaryBgMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  playButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.white25,
  },
  hintError: {
    color: '#ff6b6b',
  },
  inputSection: {
    gap: 12,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: colors.white06,
    borderWidth: 1,
    borderColor: colors.white10,
    color: colors.white90,
  },
  inputCorrect: {
    borderColor: '#4ade80',
  },
  inputIncorrect: {
    borderColor: '#ff6b6b',
  },
  resultBadge: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  resultBadgeCorrect: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderColor: 'rgba(74,222,128,0.3)',
  },
  resultBadgeIncorrect: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderColor: 'rgba(255,107,107,0.3)',
  },
  resultBadgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultBadgeTextCorrect: {
    color: '#4ade80',
  },
  resultBadgeTextIncorrect: {
    color: '#ff6b6b',
  },
  comparisonCard: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    backgroundColor: colors.white04,
    borderWidth: 1,
    borderColor: colors.white07,
  },
  userAnswerText: {
    fontSize: 17,
    color: colors.white85,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.primaryBgButton,
  },
  primaryButtonText: {
    fontSize: 14,
    color: colors.white,
  },
  answerSection: {
    gap: 16,
  },
  answerCard: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    backgroundColor: colors.white04,
    borderWidth: 1,
    borderColor: colors.white07,
  },
  answerLabel: {
    fontSize: 12,
    marginBottom: 6,
    color: colors.white30,
    letterSpacing: 0.7,
  },
  formalText: {
    fontSize: 17,
    color: colors.white85,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.white07,
  },
  dividerText: {
    fontSize: 13,
    color: colors.white20,
  },
  casualText: {
    fontSize: 19,
    color: colors.primaryLight,
  },
  breakdownList: {
    gap: 8,
    paddingHorizontal: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownTag: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.primaryTagBg,
    borderWidth: 1,
    borderColor: colors.primaryTagBorder,
  },
  breakdownTagText: {
    fontSize: 14,
    color: colors.primaryLight,
  },
  breakdownEquals: {
    fontSize: 13,
    color: colors.white20,
  },
  breakdownFormal: {
    flex: 1,
    fontSize: 14,
    color: colors.white60,
  },
  nextButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: colors.white07,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  nextButtonText: {
    fontSize: 14,
    color: colors.white70,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  stateText: {
    color: colors.white35,
    fontSize: 14,
  },
  stateError: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primaryBgButton,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
  },
});
