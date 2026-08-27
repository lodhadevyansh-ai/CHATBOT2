import fetch from 'node-fetch';

/**
 * Phase 14: Multi-Language Service & Translation Engine
 * Supports 16 Internationally Recognized Languages
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', speechCode: 'ar-SA' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', speechCode: 'pt-PT' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', speechCode: 'ko-KR' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', speechCode: 'nl-NL' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', speechCode: 'tr-TR' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', speechCode: 'pl-PL' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', speechCode: 'bn-BD' }
];

/**
 * Get language details by code or name
 * @param {string} langInput 
 */
export function getLanguageInfo(langInput) {
  if (!langInput || langInput === 'auto') return SUPPORTED_LANGUAGES[0];
  const query = langInput.trim().toLowerCase();
  return (
    SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === query || l.name.toLowerCase() === query || l.nativeName.toLowerCase() === query) ||
    SUPPORTED_LANGUAGES[0]
  );
}

/**
 * Format System Language Instruction for LLM Prompts
 * @param {string} langCode 
 * @returns {string} System instruction prompt segment
 */
export function getLanguageSystemInstruction(langCode) {
  if (!langCode || langCode === 'en' || langCode === 'auto') {
    return '';
  }

  const lang = getLanguageInfo(langCode);
  return `\n\n[CRITICAL MULTI-LANGUAGE INSTRUCTION (Phase 14)]
The user has set their preferred language to: ${lang.name} (${lang.nativeName}).
Regardless of the language used in the user's prompt or question, you MUST generate your ENTIRE answer, explanation, headings, text, and summaries in ${lang.name} (${lang.nativeName}).
- Write natively in ${lang.name} script/grammar.
- Do NOT output in English unless ${lang.name} is English.
- Keep raw code syntax unchanged, but write code comments in ${lang.name}.`;
}

/**
 * Helper to translate a single text chunk via Google GTX API or MyMemory fallback
 */
async function translateChunk(textChunk, targetLangCode) {
  if (!textChunk || !textChunk.trim()) return textChunk;

  const lang = getLanguageInfo(targetLangCode);

  // 1. Try Google Translate GTX Endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang.code)}&dt=t&q=${encodeURIComponent(textChunk)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data[0])) {
        const fullTranslation = data[0].map(item => item[0]).filter(Boolean).join('');
        if (fullTranslation && fullTranslation.trim()) {
          return fullTranslation;
        }
      }
    }
  } catch (gtxErr) {
    console.warn('[Translation GTX Engine] Fallback to MyMemory:', gtxErr.message);
  }

  // 2. Secondary Backup: MyMemory Translation API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textChunk.substring(0, 500))}&langpair=autodetect|${encodeURIComponent(lang.code)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (mmErr) {
    console.warn('[Translation MyMemory Engine] Fallback failed:', mmErr.message);
  }

  return textChunk;
}

/**
 * High-performance free translation engine (Google Translate GTX API + MyMemory Fallback)
 * Auto-detects input language and converts text to target language
 * Supports long multi-paragraph responses and preserves code blocks
 * @param {string} text - Text to translate
 * @param {string} targetLangCode - Target language code ('hi', 'fr', 'es', 'en', etc.)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLangCode) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return text;
  }

  const effectiveLangCode = targetLangCode && targetLangCode !== 'auto' ? targetLangCode : 'en';

  try {
    // Preserve markdown code blocks (``` ... ```) without translating code
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    const parts = text.split(codeBlockRegex);

    const translatedParts = await Promise.all(
      parts.map(async (part) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          return part; // keep code blocks intact
        }
        if (!part.trim()) return part;

        // Split long paragraphs into smaller chunks (~600 chars) to prevent URL limits
        if (part.length > 600) {
          const paragraphs = part.split(/\n\n+/);
          const translatedParagraphs = await Promise.all(
            paragraphs.map(p => translateChunk(p, effectiveLangCode))
          );
          return translatedParagraphs.join('\n\n');
        }

        return translateChunk(part, effectiveLangCode);
      })
    );

    return translatedParts.join('');
  } catch (err) {
    console.warn('[Translation Engine] Error translating text:', err.message);
    return text;
  }
}
