import path from 'path';
import fs from 'fs';
import { parse } from '@babel/parser';
import resolve from 'enhanced-resolve';

import getExports, {
  getExportData,
  getExportedIdentifiers,
  getExportName,
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

    it('from multiple source files, with ignore pattern', () => {
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
      results.forEach(({ name }, index) => {
        if (Array.isArray(name)) {
          name.forEach((n) => expect(exportNames[index]).toContain(n));
        } else {
          expect(exportNames).toContain(name);
        }
      });
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
        `export { firstName, lastName, getName } from './src/imports-sample.js';`,
        ['firstName', 'lastName', 'getName']
      );
    });

    it('named export from with renaming', () => {
      testExportData(
        `export { firstName as givenName, lastName as familyName } from './src/imports-sample.js';`,
        ['givenName', 'familyName']
      );
    });

    it('all export from', () => {
      testExportData(`export * from './src/all-export.js';`, [
        [
          'firstName',
          'lastName',
          'getFullName',
          'getName',
          'Family',
          'default',
        ],
      ]);
    });
  });

  describe('getExportData() with custom resolver', () => {
    const projectRoot = path.join(
      __dirname,
      'monorepo-project/packages/common'
    );

    const createResolver = () => {
      const resolveWeb = resolve.create.sync({ extensions: ['.web.js'] });
      const resolveNative = resolve.create.sync({ extensions: ['.native.js'] });

      return (...args) => [resolveWeb(...args), resolveNative(...args)];
    };

    const testExportData = (source, exportNames) => {
      const sourcePath = path.join(projectRoot, 'index.js');

      const ctx = createContext({ projectRoot, resolve: createResolver() });
      const { exports: results } = getExportData(source, sourcePath, ctx);

      expect(results).toHaveLength(exportNames.length);
      results.forEach(({ name }, index) => {
        name.forEach((n) => expect(exportNames[index]).toContain(n));
      });
    };

    it('ExportAllDeclaration', () => {
      testExportData(`export * from './src/AppState'`, [
        ['default', 'Platform', 'OnlyWeb', 'OnlyNative'],
      ]);
    });
  });

  describe('getExportedIdentifiers()', () => {
    it('gets exported identifiers from source file', () => {
      const sourcePath = path.join(projectRoot, 'src/exports-sample.js');
      const ctx = createContext({ projectRoot, sourcePaths: [sourcePath] });
      const source = fs.readFileSync(sourcePath, 'utf8');

      const result = getExportedIdentifiers(source, sourcePath, ctx);
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

  describe('getExportName()', () => {
    const testGetExportName = (source, expectedName) => {
      const ast = parse(source, defaultParserOptions);
      const node = ast.program.body[0];
      const exportName = getExportName(node);
      const expected = Array.isArray(expectedName)
        ? expectedName
        : [expectedName];

      const check = ({ name }) => expect(expected).toContain(name);

      if (Array.isArray(exportName)) {
        exportName.forEach(check);
      } else {
        check(exportName);
      }
    };

    it('VariableDeclaration', () => {
      testGetExportName('export const A = 123', 'A');
    });

    it('ExportDefaultDeclaration', () => {
      testGetExportName('export default 123', 'default');
    });

    it('FunctionDeclaration', () => {
      testGetExportName('export function B() {}', 'B');
    });

    it('ExportNamedDeclaration', () => {
      testGetExportName(
        `export { firstName, lastName, getName } from './src/imports-sample.js';`,
        ['firstName', 'lastName', 'getName']
      );
    });

    it('ClassDeclaration', () => {
      testGetExportName('export class C {};', 'C');
    });

    it('TypeAlias', () => {
      testGetExportName('export type D = number', 'D');
    });

    it('OpaqueType', () => {
      testGetExportName('export opaque type E = string;', 'E');
    });

    it('InterfaceDeclaration', () => {
      testGetExportName('export interface F { serialize(): string };', 'F');
    });

    it('Unknown', () => {
      const ast = parse('{}', defaultParserOptions);
      const node = ast.program.body[0];
      expect(() => getExportName(node)).toThrow();
    });
  });
});
