import { isIpoEligible } from './engine.js';

export const ENDINGS = [
  { id: 'ipo_premium', type: 'ipo' },
  { id: 'ipo_volumen', type: 'ipo' },
  { id: 'ipo_duopolio', type: 'ipo' },
  { id: 'comprada', type: 'honorable' },
  { id: 'boutique', type: 'honorable' },
  { id: 'regulador', type: 'honorable' },
  { id: 'quiebra_bajo_costo', type: 'quiebra' },
  { id: 'quiebra_guerra', type: 'quiebra' },
  { id: 'quiebra_sobreinversion', type: 'quiebra' },
];

export const endingType = (id) => ENDINGS.find((e) => e.id === id)?.type;

export function classifyEnding(state, params) {
  const lowRounds = state.rounds.filter((r) => r.me === 'L').length;
  if (state.bankrupt) {
    if (state.quarters.some((q) => q.P < q.c)) return 'quiebra_bajo_costo';
    if (lowRounds >= 2) return 'quiebra_guerra';
    return 'quiebra_sobreinversion';
  }
  if (state.move === 'bloquear') return 'regulador';
  if (isIpoEligible(state, params)) {
    if (state.rounds.filter((r) => r.me === 'H' && r.rival === 'H').length >= 2) return 'ipo_duopolio';
    if (state.investment === 'marca') return 'ipo_premium';
    if (state.investment === 'tostadora') return 'ipo_volumen';
    const high = state.rounds.filter((r) => r.me === 'H').length;
    return high > state.rounds.length / 2 ? 'ipo_premium' : 'ipo_volumen';
  }
  return state.offer === 'aceptar' ? 'comprada' : 'boutique';
}
