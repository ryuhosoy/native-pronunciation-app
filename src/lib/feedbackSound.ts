import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const CORRECT_SOUND = require('../../assets/sounds/correct.wav');
const INCORRECT_SOUND = require('../../assets/sounds/incorrect.wav');

let feedbackPlayer: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;

function stopFeedbackSound(): void {
  statusSubscription?.remove();
  statusSubscription = null;

  if (!feedbackPlayer) return;

  feedbackPlayer.pause();
  feedbackPlayer.remove();
  feedbackPlayer = null;
}

function playFeedbackSound(source: number): void {
  stopFeedbackSound();

  const player = createAudioPlayer(source);
  feedbackPlayer = player;

  statusSubscription = player.addListener('playbackStatusUpdate', (status) => {
    if (!status.didJustFinish) return;

    statusSubscription?.remove();
    statusSubscription = null;
    player.remove();
    if (feedbackPlayer === player) feedbackPlayer = null;
  });

  player.play();
}

export function playCorrectSound(): void {
  playFeedbackSound(CORRECT_SOUND);
}

export function playIncorrectSound(): void {
  playFeedbackSound(INCORRECT_SOUND);
}

export function stopFeedbackSoundPlayback(): void {
  stopFeedbackSound();
}
