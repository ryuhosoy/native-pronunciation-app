import type { Lesson } from '../data/lessons';

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''']/g, "'")
    .replace(/[^\w\s']/g, '')
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
