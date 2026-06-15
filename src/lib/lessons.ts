import type { Lesson } from '../types/lesson';
import { supabase } from './supabase';

interface LessonRow {
  id: number;
  casual: string;
  spoken_text: string;
  breakdowns: { casual: string; formal: string }[];
}

function mapRow(row: LessonRow): Lesson {
  return {
    id: row.id,
    casual: row.casual,
    spokenText: row.spoken_text,
    breakdowns: row.breakdowns ?? [],
  };
}

export async function fetchRandomLesson(excludeId?: number): Promise<Lesson> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { count, error: countError } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if (!count) throw new Error('No lessons found');

  for (let attempt = 0; attempt < 8; attempt++) {
    const offset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from('lessons')
      .select('id,casual,spoken_text,breakdowns')
      .order('id')
      .range(offset, offset)
      .maybeSingle();

    if (error) throw error;
    if (data && data.id !== excludeId) {
      return mapRow(data);
    }
  }

  const offset = Math.floor(Math.random() * count);
  const { data, error } = await supabase
    .from('lessons')
    .select('id,casual,spoken_text,breakdowns')
    .order('id')
    .range(offset, offset)
    .single();

  if (error) throw error;
  return mapRow(data);
}
