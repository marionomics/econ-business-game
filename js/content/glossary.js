// Locale-aware glossary for the ⓘ icons and the CFO manual. Entries live in glossary.es.js / glossary.en.js.
import { getLocale } from './locale.js';
import { GLOSSARY as ES } from './glossary.es.js';

const PACKS = { es: ES };
export const registerGlossary = (locale, g) => { PACKS[locale] = g; };
export const GLOSSARY = ES; // Spanish entries (source of truth for ids)
export const glossaryTerm = (id) => (PACKS[getLocale()] ?? ES)[id] ?? ES[id] ?? null;
export const glossaryAll = () => { const p = PACKS[getLocale()] ?? ES; return Object.keys(ES).map((id) => ({ id, ...(p[id] ?? ES[id]) })); };
