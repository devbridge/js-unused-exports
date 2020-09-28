import fixExports, { removeExportDeclarations } from '../src/fixExports';
import fs from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('fixExports', () => {
  describe('fixExports()', () => {
    it('replaces file content with updated content', () => {
      fs.readFileSync.mockImplementation(() => 'export const a = 1;');

      const unusedExports = [
        {
          sourcePath: 'fake-path',
          unusedExports: ['a'],
        },
      ];

      fixExports(unusedExports);

      expect(fs.writeFileSync).toBeCalledWith('fake-path', 'const a = 1;');
    });
  });

  describe('removeExportDeclarations()', () => {
    it('removes export declarations', () => {
      const identifierNames = ['constA', 'funcA'];

      const source = `
          export const constA = 25;
          export function funcA () {};
          export const constB = 25;
          export function funcB () {};
        `;

      const result = removeExportDeclarations(source, identifierNames);

      const expected = `
          const constA = 25;
          function funcA () {};
          export const constB = 25;
          export function funcB () {};
        `;

      expect(result).toBe(expected);
    });
  });
});
