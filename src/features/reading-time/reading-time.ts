const WORDS_PER_MINUTE_AVERAGE = 220;

export const calculateReadingTimeInMinutes = (rawText: string): number => {
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE_AVERAGE));
};
