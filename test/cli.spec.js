import path from 'path';
import resolve from 'enhanced-resolve';
import { checkUnused } from '../src/cli';
import createContext from '../src/createContext';

function testUnusedExports(unusedExports, expectations) {
  Object.entries(expectations).forEach(
    ([relativePath, expectedUnusedNames]) => {
      const unusedExport = unusedExports.find(({ sourcePath }) =>
        sourcePath.endsWith(path.normalize(relativePath))
      );

      if (!unusedExport) {
        throw new Error(`No unused export with path ${relativePath}`);
      }
      const unusedNames = unusedExport.unusedExports.map(({ name }) => name);
      expect(unusedNames).toHaveLength(expectedUnusedNames.length);
      expectedUnusedNames.forEach((name) =>
        expect(unusedNames).toContain(name)
      );
    }
  );
}

describe('checkUnused()', () => {
  it('sample-project', () => {
    const ctx = createContext({
      projectRoot: path.join(__dirname, 'sample-project'),
      sourcePaths: ['src/**/*.js'],
    });
    const { unusedExports, unknownPackages, failedResolutions } = checkUnused(
      ctx
    );

    expect(unknownPackages).toEqual(['not-found']);
    expect(failedResolutions).toEqual([
      path.join(__dirname, 'sample-project/src/file-not-found'),
    ]);

    testUnusedExports(unusedExports, {
      'sample-project/src/imports-sample.js': ['fakeFunction'],
    });
  });

  it('monorepo-project', () => {
    const projectRoot = path.join(__dirname, 'monorepo-project');

    const ctx = createContext({
      projectRoot,
      sourcePaths: ['packages/*/**/*.js'],
      aliases: {
        '@monorepo/common': path.join(projectRoot, 'packages/common'),
      },
    });
    const { unusedExports, unknownPackages, failedResolutions } = checkUnused(
      ctx
    );

    expect(unknownPackages).toEqual(['not-found']);
    expect(failedResolutions).toEqual([
      path.join(__dirname, 'monorepo-project/packages/common/file-not-found'),
      path.join(__dirname, 'monorepo-project/packages/common/src/AppState'),
    ]);

    testUnusedExports(unusedExports, {
      'monorepo-project/packages/common/src/AppState.native.js': [
        'OnlyNative',
        'Platform',
        'default',
      ],
      'monorepo-project/packages/common/src/AppState.web.js': [
        'OnlyWeb',
        'Platform',
        'default',
      ],
      'monorepo-project/packages/common/src/logic.js': ['DEFAULTS', 'logic'],
    });
  });

  it('monorepo-project with custom resolver', () => {
    const createResolve = (alias) => {
      const standardResolve = resolve.create.sync({
        extensions: ['.js'],
        alias,
      });
      const resolveWeb = resolve.create.sync({
        extensions: ['.web.js'],
        alias,
      });
      const resolveNative = resolve.create.sync({
        extensions: ['.native.js', '.ios.js', '.android.js'],
        alias,
      });

      return (...args) => {
        try {
          return standardResolve(...args);
        } catch (error) {
          // do nothing
        }

        return [resolveWeb(...args), resolveNative(...args)];
      };
    };

    const projectRoot = path.join(__dirname, 'monorepo-project');

    const ctx = createContext({
      projectRoot,
      sourcePaths: ['packages/*/**/*.js'],
      resolve: createResolve({
        '@monorepo/common': path.join(projectRoot, 'packages/common'),
      }),
    });
    const { unusedExports, unknownPackages, failedResolutions } = checkUnused(
      ctx
    );

    expect(unknownPackages).toEqual(['not-found']);
    expect(failedResolutions).toEqual([
      path.join(__dirname, 'monorepo-project/packages/common/file-not-found'),
    ]);

    testUnusedExports(unusedExports, {
      'monorepo-project/packages/common/src/AppState.native.js': [
        'OnlyNative',
        'default',
      ],
      'monorepo-project/packages/common/src/AppState.web.js': [
        'OnlyWeb',
        'default',
      ],
      'monorepo-project/packages/common/src/logic.js': ['DEFAULTS', 'logic'],
    });
  });
});
