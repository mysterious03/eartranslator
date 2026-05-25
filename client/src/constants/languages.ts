import type { LanguageOption } from '../types';

export const TARGET_LANGUAGES: LanguageOption[] = [
  { code: 'en-IN', name: 'English',    nativeName: 'English',    flag: '🇬🇧', speaker: 'anushka' },
  { code: 'hi-IN', name: 'Hindi',      nativeName: 'हिन्दी',       flag: '🇮🇳', speaker: 'manisha' },
  { code: 'ta-IN', name: 'Tamil',      nativeName: 'தமிழ்',        flag: '🇮🇳', speaker: 'anushka' },
  { code: 'te-IN', name: 'Telugu',     nativeName: 'తెలుగు',       flag: '🇮🇳', speaker: 'vidya' },
  { code: 'kn-IN', name: 'Kannada',   nativeName: 'ಕನ್ನಡ',        flag: '🇮🇳', speaker: 'arya' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം',      flag: '🇮🇳', speaker: 'abhilash' },
  { code: 'bn-IN', name: 'Bengali',   nativeName: 'বাংলা',         flag: '🇧🇩', speaker: 'manisha' },
  { code: 'gu-IN', name: 'Gujarati',  nativeName: 'ગુજરાતી',      flag: '🇮🇳', speaker: 'manisha' },
  { code: 'mr-IN', name: 'Marathi',   nativeName: 'मराठी',         flag: '🇮🇳', speaker: 'manisha' },
  { code: 'pa-IN', name: 'Punjabi',   nativeName: 'ਪੰਜਾਬੀ',       flag: '🇮🇳', speaker: 'manisha' },
  { code: 'od-IN', name: 'Odia',      nativeName: 'ଓଡ଼ିଆ',        flag: '🇮🇳', speaker: 'manisha' },
];

export const LANGUAGE_MAP: Record<string, LanguageOption> = Object.fromEntries(
  TARGET_LANGUAGES.map((l) => [l.code, l])
);

export function getLanguageName(code: string): string {
  return LANGUAGE_MAP[code]?.name ?? code;
}

export function getLanguageFlag(code: string): string {
  return LANGUAGE_MAP[code]?.flag ?? '🌐';
}
