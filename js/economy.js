// Unit 7 economics as pure functions. Linear inverse demand P = a − bQ.

export const quantityAt = ({ a, b }, P) => Math.max(0, Math.round((a - P) / b));

export const profit = ({ P, Q, c, F }) => (P - c) * Q - F;

export const optimalPrice = ({ a, c }) => (a + c) / 2;

// CORE convention: percentage changes measured from the first point.
export const arcElasticity = (P1, Q1, P2, Q2) => -((Q2 - Q1) / Q1) / ((P2 - P1) / P1);

export const pointElasticity = ({ a }, P) => P / (a - P);

export const markupPrice = (c, eps) => (c * eps) / (eps - 1);

export const averageCost = ({ c, F }, Q) => c + F / Q;

export const consumerSurplus = (demand, P) => 0.5 * quantityAt(demand, P) * (demand.a - P);

export const deadweightLoss = ({ a, b, c }, P) =>
  0.5 * (quantityAt({ a, b }, c) - quantityAt({ a, b }, P)) * (P - c);
