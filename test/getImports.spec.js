import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import resolve from 'enhanced-resolve';

import getImports, {
  getImportDetails,
  isPackage,
  resolvePath,
} from '../src/getImports';
import createContext from '../src/createContext';

describe('getImports', () => {
  describe('getImports()', () => {
    it('extracts imports from file', () => {
      const projectRoot = path.join(__dirname, 'sample-project');
      const sourceFile = path.join(projectRoot, 'src/imports-sample.js');
      const ctx = createContext({ projectRoot });

      const result = getImports([sourceFile], ctx);
      const exportAllSrcPath = path.join(projectRoot, 'src/all-export.js');
      const exportSrcPath = path.join(projectRoot, 'src/exports-sample.js');

      const expected = [
        {
          imports: {
            [exportSrcPath]: [
              'Family',
              'default',
              'firstName',
              'getName',
              'lastName',
            ],
            [exportAllSrcPath]: ['firstName', 'lastName'],
          },
          sourcePath: sourceFile,
        },
      ];

      expect(result).toMatchObject(expected);
    });
  });

  describe('getExportName()', () => {
    const projectRoot = path.join(__dirname, 'sample-project');
    const ctx = createContext({ projectRoot });

    const testGetImportDetails = (source, expectations) => {
      const ast = parse(source, ctx.config.parserOptions);
      const node = ast.program.body[0];
      const sourcePath = path.join(projectRoot, 'index.js');
      const { specifiers } = getImportDetails(node, sourcePath, ast, ctx);

      expect(specifiers).toHaveLength(expectations.length);
      specifiers.forEach((specifier) =>
        expect(expectations).toContain(specifier)
      );
    };

    it('ImportDefaultSpecifier', () => {
      testGetImportDetails(`import exportSample from './src/exports-sample'`, [
        'default',
      ]);
    });

    it('ImportDeclaration', () => {
      testGetImportDetails(`import { firstName } from './src/exports-sample'`, [
        'firstName',
      ]);
    });

    it('ImportDeclaration multiple', () => {
      testGetImportDetails(
        `import { firstName, lastName } from './src/exports-sample'`,
        ['firstName', 'lastName']
      );
    });

    it('ImportDeclaration default with rename', () => {
      testGetImportDetails(
        `import { default as exportSample } from './src/exports-sample'`,
        ['default']
      );
    });

    it('ImportDeclaration default with rename', () => {
      testGetImportDetails(
        `import { firstName as givenName } from './src/exports-sample'`,
        ['firstName']
      );
    });

    it('ImportNamespaceSpecifier', () => {
      testGetImportDetails(
        `
import * as something from './src/exports-sample';
something.firstName;
something.lastName;
`,
        ['firstName', 'lastName']
      );
    });

    it('ImportDefaultSpecifier with ImportNamespaceSpecifier', () => {
      testGetImportDetails(
        `
import exportSample, * as something from './src/exports-sample';
something.firstName;
something.lastName;
`,
        ['default', 'firstName', 'lastName']
      );
    });

    it('ImportDefaultSpecifier with ImportSpecifier', () => {
      testGetImportDetails(
        `import exportSample, { firstName, lastName } from './src/exports-sample';`,
        ['default', 'firstName', 'lastName']
      );
    });

    it('ImportDeclaration as something jsx', () => {
      testGetImportDetails(
        `
  import * as something from './src/exports-sample';

  <div>
    {something.firstName}
    {something.lastName}
  </div>`,
        ['firstName', 'lastName']
      );
    });

    it('ExportNamedDeclaration', () => {
      testGetImportDetails(`export { firstName } from './src/exports-sample'`, [
        'firstName',
      ]);
    });

    it('ExportNamedDeclaration multiple', () => {
      testGetImportDetails(
        `export { firstName, lastName } from './src/exports-sample'`,
        ['firstName', 'lastName']
      );
    });

    it('ExportNamedDeclaration multiple with rename', () => {
      testGetImportDetails(
        `export { firstName as givenName, lastName as familyName } from './src/exports-sample'`,
        ['firstName', 'lastName']
      );
    });

    it('ExportNamedDeclaration with default rename', () => {
      testGetImportDetails(
        `export { default as sampleFile } from './src/exports-sample'`,
        ['default']
      );
    });

    it('ExportAllDeclaration', () => {
      testGetImportDetails(`export * from './src/exports-sample'`, []);
    });

    it('Unknown', () => {
      testGetImportDetails(`{}`, []);
    });
  });

  describe('getExportName() with custom resolver', () => {
    const projectRoot = path.join(
      __dirname,
      'monorepo-project/packages/common'
    );

    const resolveWeb = resolve.create.sync({ extensions: ['.web.js'] });
    const resolveNative = resolve.create.sync({ extensions: ['.native.js'] });

    const ctx = createContext({
      projectRoot,
      resolve: (...args) => [resolveWeb(...args), resolveNative(...args)],
    });

    const testGetImportDetails = (source, listOfExpectations) => {
      const ast = parse(source, ctx.config.parserOptions);
      const node = ast.program.body[0];
      const sourcePath = path.join(projectRoot, 'index.js');

      getImportDetails(node, sourcePath, ast, ctx).forEach(
        ({ specifiers }, index) => {
          const expectations = listOfExpectations[index] || [];
          expect(specifiers).toHaveLength(expectations.length);
          specifiers.forEach((specifier) =>
            expect(expectations).toContain(specifier)
          );
        }
      );
    };

    it('ExportAllDeclaration', () => {
      testGetImportDetails(`export * from './src/AppState'`, []);
    });
  });

  describe('isPackage()', () => {
    it('package', () => {
      expect(isPackage('enhanced-resolve')).toBe(true);
    });

    it('package with path', () => {
      expect(isPackage('enhanced-resolve/lib/util/path')).toBe(true);
      expect(isPackage('enhanced-resolve/lib/util/path.js')).toBe(true);
    });

    it('scoped package', () => {
      expect(isPackage('@babel/parser')).toBe(true);
    });

    it('scoped package with path', () => {
      expect(isPackage('@babel/parser//lib/index')).toBe(true);
      expect(isPackage('@babel/parser//lib/index.js')).toBe(true);
    });

    it('sibling file', () => {
      expect(isPackage('./otherFile')).toBe(false);
      expect(isPackage('./otherFile.js')).toBe(false);
    });

    it('parent file', () => {
      expect(isPackage('../otherFile')).toBe(false);
      expect(isPackage('../otherFile.js')).toBe(false);
    });

    it('parent folder', () => {
      expect(isPackage('../folder/otherFile')).toBe(false);
      expect(isPackage('../folder/otherFile.js')).toBe(false);
    });

    describe('resolvePath()', () => {
      const projectRoot = path.join(__dirname, 'sample-project');
      const sourceFile = path.join(projectRoot, 'src/imports-sample.js');
      const ctx = createContext({ projectRoot });

      it('package', () => {
        const resolvedPath = resolvePath('enhanced-resolve', sourceFile, ctx);
        expect(typeof resolvedPath).toBe('string');
      });

      it('package with path', () => {
        const resolvedPath = resolvePath(
          'enhanced-resolve/lib/util/path',
          sourceFile,
          ctx
        );
        expect(typeof resolvedPath).toBe('string');
      });

      it('missing package', () => {
        const resolvedPath = resolvePath('not-found', sourceFile, ctx);
        expect(typeof resolvedPath).toBe('undefined');
        expect(ctx.unknownPackages).toContain('not-found');
      });

      it('file', () => {
        const resolvedPath = resolvePath('./all-export', sourceFile, ctx);
        expect(typeof resolvedPath).toBe('string');
      });

      it('missing file', () => {
        const resolvedPath = resolvePath('./file-not-found', sourceFile, ctx);
        expect(typeof resolvedPath).toBe('undefined');
        expect(ctx.failedResolutions).toContain(
          path.join(projectRoot, 'src/file-not-found')
        );
      });
    });

    describe('resolvePath() monorepo custom resolve', () => {
      const projectRoot = path.join(__dirname, 'monorepo-project');
      const sourceFile = path.join(projectRoot, 'packages/client-web/entry.js');
      const mockResolve = jest.fn(() =>
        path.join(projectRoot, 'packages/common')
      );
      const ctx = createContext({ projectRoot, resolve: mockResolve });

      it('aliases', () => {
        resolvePath('@monorepo/common', sourceFile, ctx);
        expect(mockResolve).toHaveBeenCalled();
      });
    });

    describe('resolvePath() monorepo with aliases', () => {
      const projectRoot = path.join(__dirname, 'monorepo-project');
      const sourceFile = path.join(projectRoot, 'packages/client-web/entry.js');

      const ctx = createContext({
        projectRoot,
        aliases: {
          '@monorepo/common': path.join(projectRoot, 'packages/common'),
        },
      });

      it('aliases', () => {
        const resolvedPath = resolvePath('@monorepo/common', sourceFile, ctx);
        expect(typeof resolvedPath).toBe('string');
      });
    });

    describe('resolvePath() monorepo with workspaces', () => {
      const projectRoot = path.join(__dirname, 'monorepo-project');
      const moduleDir = path.join(projectRoot, 'node_modules');
      const packagesDir = path.join(moduleDir, '@monorepo');
      const commonDir = path.join(packagesDir, 'common');

      beforeEach(() => {
        if (!fs.existsSync(moduleDir)) {
          fs.mkdirSync(moduleDir);
        }
        fs.mkdirSync(packagesDir);
        fs.symlinkSync('../../packages/common', commonDir);
      });

      afterEach(() => {
        fs.unlinkSync(commonDir);
        fs.rmdirSync(packagesDir);
        fs.rmdirSync(moduleDir);
      });

      const sourceFile = path.join(projectRoot, 'packages/client-web/entry.js');

      const ctx = createContext({ projectRoot });

      it('symlinked', () => {
        const resolvedPath = resolvePath('@monorepo/common', sourceFile, ctx);
        expect(typeof resolvedPath).toBe('string');
      });
    });
  });
});
