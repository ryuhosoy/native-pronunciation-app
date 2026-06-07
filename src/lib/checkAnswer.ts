import type { Lesson } from '../data/lessons';

// 比較時は , . ! ? など句読点をすべて無視する
const PUNCTUATION =
  /[.,!?;:"`~\-—–…、。，．！？：；「」『』（）\[\](){}\/\\|@#$%^&*+=<>]/g;

export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[''`´]/g, "'")
    .replace(PUNCTUATION, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAcceptedAnswers(lesson: Lesson): string[] {
  return [lesson.spokenText, lesson.casual].map(normalize);
}

export function checkAnswer(userInput: string, lesson: Lesson): boolean {
  const normalized = normalize(userInput);
  if (!normalized) return false;

  return getAcceptedAnswers(lesson).includes(normalized);
}

export function getDisplayCorrectAnswer(lesson: Lesson): string {
  return lesson.spokenText;
}
