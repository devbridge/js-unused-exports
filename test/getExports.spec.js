import path from 'path';
import fs from 'fs';
import getExports, {
  getExportData,
  getExportedIdentifiers,
} from '../src/getExports';
import createContext, { defaultParserOptions } from '../src/createContext';

describe('getExports', () => {
  const projectRoot = path.join(__dirname, 'sample-project');

  describe('getExports()', () => {
    const testGetExports = (sourcePaths, ignoreExportPatterns = []) => {
      const ctx = createContext({
        projectRoot,
        sourcePaths,
        ignoreExportPatterns,
      });
      const results = getExports(sourcePaths, ctx);

      expect(results).toHaveLength(
        sourcePaths.length - ignoreExportPatterns.length
      );

      results.forEach(({ sourcePath }) =>
        expect(sourcePaths).toContain(sourcePath)
      );
    };

    it('from source file', () => {
      testGetExports([path.join(projectRoot, 'src/exports-sample.js')]);
    });

    it('from multiple source files', () => {
      testGetExports([
        path.join(projectRoot, 'src/exports-sample.js'),
        path.join(projectRoot, 'src/all-export.js'),
      ]);
    });

    it.skip('from multiple source files, with ignore pattern', () => {
      testGetExports(
        [
          path.join(projectRoot, 'src/exports-sample.js'),
          path.join(projectRoot, 'src/all-export.js'),
          path.join(projectRoot, 'src/dummy.js'),
        ],
        ['dummy.js$']
      );
    });
  });

  describe('getExportData()', () => {
    const testExportData = (source, exportNames) => {
      const sourcePath = path.join(projectRoot, 'index.js');

      const ctx = createContext({ projectRoot, sourcePaths: [sourcePath] });
      const { exports: results } = getExportData(source, sourcePath, ctx);

      expect(results).toHaveLength(exportNames.length);
      results.forEach(({ name }) => expect(exportNames).toContain(name));
    };

    it('nothing', () => {
      testExportData(``, []);
    });

    it('default', () => {
      testExportData(
        `
const A = 123;
export default A;`,
        ['default']
      );
    });

    it('named exports', () => {
      testExportData(
        `
export const A = 123;
export const B = 456;
export const C = 789;`,
        ['A', 'B', 'C']
      );
    });

    it('named export from', () => {
      testExportData(
        `export { firstName, lastName, getName } from './src/imports-sample-.js';`,
        ['firstName', 'lastName', 'getName']
      );
    });

    it.skip('all export from', () => {
      testExportData(`export * from './src/imports-sample-.js';`, [
        'firstName',
        'lastName',
        'getFullName',
        'getName',
        'Family',
        'default',
      ]);
    });
  });

  describe('getExportedIdentifiers()', () => {
    it('gets exported identifiers from source file', () => {
      const filePath = path.join(projectRoot, 'src/exports-sample.js');
      const source = fs.readFileSync(filePath, 'utf8');

      const result = getExportedIdentifiers(source, defaultParserOptions);
      const identifiers = result.map((item) => item.name);

      expect(identifiers).toEqual([
        'firstName',
        'lastName',
        'getFullName',
        'getName',
        'Family',
        'default',
      ]);
    });
  });
});
