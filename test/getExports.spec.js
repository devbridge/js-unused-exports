import path from 'path';
import fs from 'fs';
import getExports, { getExportedIdentifiers } from '../src/getExports';
import createContext, { defaultParserOptions } from '../src/createContext';

describe('getExports', () => {
  const projectRoot = path.join(__dirname, 'sample-project');

  describe('getExports()', () => {
    it('gets exported identifiers from source file', () => {
      const filePath = path.join(projectRoot, 'src/exports-sample.js');
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
      const filePath = path.join(projectRoot, 'src/exports-sample.js');
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
