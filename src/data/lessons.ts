export interface Lesson {
  id: number;
  casual: string;
  formal: string;
  spokenText: string;
  breakdowns: { casual: string; formal: string }[];
}

export const LESSONS: Lesson[] = [
  {
    id: 1,
    casual: 'Whaddaya wanna do?',
    formal: 'What do you want to do?',
    spokenText: 'What do you want to do?',
    breakdowns: [
      { casual: 'Whaddaya', formal: 'What do you' },
      { casual: 'wanna', formal: 'want to' },
    ],
  },
  {
    id: 2,
    casual: 'Whaddaya doin?',
    formal: 'What are you doing?',
    spokenText: 'What are you doing?',
    breakdowns: [
      { casual: 'Whaddaya', formal: 'What are you' },
      { casual: 'doin', formal: 'doing' },
    ],
  },
  {
    id: 3,
    casual: 'Didja eat yet?',
    formal: 'Did you eat yet?',
    spokenText: 'Did you eat yet?',
    breakdowns: [{ casual: 'Didja', formal: 'Did you' }],
  },
  {
    id: 4,
    casual: 'I dunno, lemme check.',
    formal: "I don't know, let me check.",
    spokenText: "I don't know, let me check.",
    breakdowns: [
      { casual: 'dunno', formal: "don't know" },
      { casual: 'lemme', formal: 'let me' },
    ],
  },
  {
    id: 5,
    casual: 'Gonna hafta think about it.',
    formal: 'Going to have to think about it.',
    spokenText: 'Going to have to think about it.',
    breakdowns: [
      { casual: 'Gonna', formal: 'Going to' },
      { casual: 'hafta', formal: 'have to' },
    ],
  },
  {
    id: 6,
    casual: 'Coulda been worse.',
    formal: 'Could have been worse.',
    spokenText: 'Could have been worse.',
    breakdowns: [{ casual: 'Coulda', formal: 'Could have' }],
  },
  {
    id: 7,
    casual: "Betcha didn't know that.",
    formal: "I bet you didn't know that.",
    spokenText: "I bet you didn't know that.",
    breakdowns: [{ casual: 'Betcha', formal: 'I bet you' }],
  },
  {
    id: 8,
    casual: 'Wanna grab somethin to eat?',
    formal: 'Do you want to grab something to eat?',
    spokenText: 'Do you want to grab something to eat?',
    breakdowns: [
      { casual: 'Wanna', formal: 'Do you want to' },
      { casual: 'somethin', formal: 'something' },
    ],
  },
  {
    id: 9,
    casual: 'Shoulda told me sooner.',
    formal: 'Should have told me sooner.',
    spokenText: 'Should have told me sooner.',
    breakdowns: [{ casual: 'Shoulda', formal: 'Should have' }],
  },
  {
    id: 10,
    casual: "Kinda tired, y'know?",
    formal: 'Kind of tired, you know?',
    spokenText: 'Kind of tired, you know?',
    breakdowns: [
      { casual: 'Kinda', formal: 'Kind of' },
      { casual: "y'know", formal: 'you know' },
    ],
  },
];

export type Phase = 'listen' | 'input' | 'answer';
