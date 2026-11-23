// Current language of the interface. Pure module state; the UI persists the choice.
export const LOCALES = ['es', 'en'];
let current = 'es';
export const getLocale = () => current;
export const setLocale = (l) => { if (LOCALES.includes(l)) current = l; return current; };
export const detectLocale = (navLang) => (String(navLang ?? '').toLowerCase().startsWith('en') ? 'en' : 'es');
