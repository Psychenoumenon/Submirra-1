/**
 * Helper function to get translated dream text based on current language
 * Falls back to original text if translation is not available
 */
export function getDreamText(
  dream: {
    dream_text?: string | null;
    dream_text_tr?: string | null;
    dream_text_en?: string | null;
  },
  language: 'tr' | 'en'
): string {
  if (language === 'tr') {
    return dream.dream_text_tr || dream.dream_text || '';
  } else {
    return dream.dream_text_en || dream.dream_text || '';
  }
}

/**
 * Helper function to get translated analysis text based on current language
 * Falls back to original text if translation is not available
 */
export function getAnalysisText(
  dream: {
    analysis_text?: string | null;
    analysis_text_tr?: string | null;
    analysis_text_en?: string | null;
  },
  language: 'tr' | 'en'
): string {
  if (language === 'tr') {
    return dream.analysis_text_tr || dream.analysis_text || '';
  } else {
    return dream.analysis_text_en || dream.analysis_text || '';
  }
}






