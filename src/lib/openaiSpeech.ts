import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

let currentPlayer: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;

function getSpeechFile(cacheKey: string | number): File {
  return new File(Paths.cache, `speech-${cacheKey}.mp3`);
}

export function hasCachedSpeech(cacheKey: string | number): boolean {
  return getSpeechFile(cacheKey).exists;
}

export async function configureAudio(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
  });
}

export async function stopAudio(): Promise<void> {
  statusSubscription?.remove();
  statusSubscription = null;

  if (!currentPlayer) return;

  currentPlayer.pause();
  currentPlayer.remove();
  currentPlayer = null;
}

async function fetchAndCacheSpeech(text: string, cacheKey: string | number): Promise<File> {
  if (!OPENAI_API_KEY) {
    throw new Error('.env に EXPO_PUBLIC_OPENAI_API_KEY を設定してください');
  }

  const file = getSpeechFile(cacheKey);

  if (file.exists) return file;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: 'nova',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI TTS failed (${response.status}): ${detail}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  file.write(bytes);
  return file;
}

function playFromFile(file: File, onStart?: () => void, onDone?: () => void): void {
  const player = createAudioPlayer(file.uri);
  currentPlayer = player;

  statusSubscription = player.addListener('playbackStatusUpdate', (status) => {
    if (!status.didJustFinish) return;

    statusSubscription?.remove();
    statusSubscription = null;
    player.remove();
    if (currentPlayer === player) currentPlayer = null;
    onDone?.();
  });

  onStart?.();
  player.play();
}

export async function playAudio(
  text: string,
  cacheKey: string | number,
  onStart?: () => void,
  onDone?: () => void,
): Promise<void> {
  await stopAudio();

  const file = await fetchAndCacheSpeech(text, cacheKey);
  playFromFile(file, onStart, onDone);
}
