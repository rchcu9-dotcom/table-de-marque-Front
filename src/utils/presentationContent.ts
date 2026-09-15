export type ContentLang = 'fr' | 'en';

export function pickLocalized(lang: ContentLang, fr: string, en: string): string {
  if (lang === 'fr') return fr;
  return en.trim() ? en : fr;
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .trim()
    .toLowerCase();
}

export function isMediaGroup(nom: string): boolean {
  const n = normalize(nom);
  return n === 'medias' || n === 'media';
}

export function isInscriptionArticle(titre: string): boolean {
  return normalize(titre) === 'inscription';
}

export function isResumeArticle(titre: string): boolean {
  return normalize(titre) === 'resume';
}

export function isYoutubeArticle(titre: string): boolean {
  return normalize(titre).includes('youtube');
}
