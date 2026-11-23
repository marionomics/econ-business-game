import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptClick } from '../js/clickguard.js';
test('double-clicks and clicks right after a render are ignored', () => {
  assert.equal(acceptClick({ detail: 2 }, 1000, 0), false); assert.equal(acceptClick({ detail: 1 }, 100, 0), false);
  assert.equal(acceptClick({ detail: 1 }, 1000, 0), true); assert.equal(acceptClick({ detail: 0 }, 1000, 0), true);
});
