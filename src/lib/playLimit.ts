import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAY_COUNT_KEY = 'tts_play_count';

export async function getPlayCount(): Promise<number> {
  const value = await AsyncStorage.getItem(PLAY_COUNT_KEY);
  return value ? Number.parseInt(value, 10) : 0;
}

export async function incrementPlayCount(): Promise<number> {
  const next = (await getPlayCount()) + 1;
  await AsyncStorage.setItem(PLAY_COUNT_KEY, String(next));
  return next;
}
