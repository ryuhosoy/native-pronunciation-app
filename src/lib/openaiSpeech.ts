import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

let currentPlayer: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;

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

export async function playAudio(
  text: string,
  onStart?: () => void,
  onDone?: () => void,
): Promise<void> {
  if (!OPENAI_API_KEY) {
    throw new Error('.env に EXPO_PUBLIC_OPENAI_API_KEY を設定してください');
  }

  await stopAudio();

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
  const file = new File(Paths.cache, `speech-${Date.now()}.mp3`);
  file.write(bytes);

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
