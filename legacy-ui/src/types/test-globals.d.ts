// Local ambient declarations so the project's tsconfig (which only
// bundles node/vite types) can typecheck the test helper file, which uses
// jest-style globals (expect / describe / it) rather than the remote's
// node:test + assert style.
//
// Clean, zero-install approach: avoids modifying tsconfig "types" and
// avoids needing @types/jest / @types/mocha.

export {};

declare global {
  const expect: {
    (actual: unknown): {
      toBe: (expected: unknown) => void;
      toEqual: (expected: unknown) => void;
      not: {
        toBe: (expected: unknown) => void;
        toEqual: (expected: unknown) => void;
      };
    };
    not: {
      toBe: (expected: unknown) => void;
      toEqual: (expected: unknown) => void;
    };
    each: () => void;
    toBeCalled: () => void;
  };
  const describe: (name: string, fn: () => void) => void;
  const it: (name: string, fn: () => void) => void;
  const fit: (name: string, fn: () => void) => void;
  const beforeAll: (fn: () => void) => void;
  const afterAll: (fn: () => void) => void;
  const beforeEach: (fn: () => void) => void;
  const afterEach: (fn: () => void) => void;
  const jest: { spyOn: () => void; mock: () => void };
}
