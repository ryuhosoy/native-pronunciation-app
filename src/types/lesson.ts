export interface Lesson {
  id: number;
  casual: string;
  spokenText: string;
  breakdowns: { casual: string; formal: string }[];
}

export type Phase = 'listen' | 'input' | 'answer';
