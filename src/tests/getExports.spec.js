import path from 'path';
import fs from 'fs';
import getExports, { getExportedIdentifiers } from '../getExports';
import createContext, { defaultParserOptions } from '../createContext';

describe('getExports', () => {
  describe('getExports()', () => {
    it('gets exported identifiers from source file', () => {
      const projectRoot = path.join(__dirname, 'fixtures');
      const filePath = path.join(__dirname, './fixtures/exports-sample.js');
      const sourcePaths = [filePath];

      const ctx = createContext({
        projectRoot,
        sourcePaths
      });

      const result = getExports(sourcePaths, ctx);

      expect(result.length).toBe(1);
    });
  });

  describe('getExportedIdentifiers()', () => {
    it('gets exported identifiers from source file', () => {
      const filePath = path.join(__dirname, './fixtures/exports-sample.js');
      const source = fs.readFileSync(filePath, 'utf8');

      const result = getExportedIdentifiers(source, defaultParserOptions);
      const identifiers = result.map(item => item.name);

      expect(identifiers).toEqual([
        'firstName',
        'lastName',
        'getFullName',
        'getName',
        'Family',
        'default'
      ]);
    });
  });
});
