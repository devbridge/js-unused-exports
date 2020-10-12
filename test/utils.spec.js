import path from 'path';
import { getSourcePaths } from '../src/utils';

function getFullPaths(sourcePaths, projectRoot) {
  return sourcePaths.map((sourcePath) => path.join(projectRoot, sourcePath));
}

describe('utils', () => {
  describe('getSourcePaths()', () => {
    describe('sample', () => {
      const projectRoot = path.join(__dirname, 'sample-project');

      it('get sources', () => {
        const config = { projectRoot };
        const result = getSourcePaths(['src/*.js'], config);

        const expectedSourcePaths = getFullPaths(
          [
            'src/all-export.js',
            'src/exports-sample.js',
            'src/imports-sample.js',
          ],
          projectRoot
        );

        expect(result).toHaveLength(expectedSourcePaths.length);
        result.forEach((sourcePath) =>
          expect(expectedSourcePaths).toContain(sourcePath)
        );
      });

      it('get sources with ignorePaths', () => {
        const config = { projectRoot, ignorePaths: ['**/*export.js'] };
        const result = getSourcePaths(['src/*.js'], config);

        const expectedSourcePaths = getFullPaths(
          ['src/exports-sample.js', 'src/imports-sample.js'],
          projectRoot
        );

        expect(result).toHaveLength(expectedSourcePaths.length);
        result.forEach((sourcePath) =>
          expect(expectedSourcePaths).toContain(sourcePath)
        );
      });
    });

    describe('monorepo', () => {
      const projectRoot = path.join(__dirname, 'monorepo-project');

      it('get sources', () => {
        const config = { projectRoot };
        const result = getSourcePaths(['packages/*/**/*.js'], config);
        const expectedSourcePaths = getFullPaths(
          [
            'packages/client-native/entry.js',
            'packages/client-web/entry.js',
            'packages/common/index.js',
            'packages/common/native.js',
            'packages/common/web.js',
            'packages/common/src/logic.js',
            'packages/common/src/AppState.native.js',
            'packages/common/src/AppState.web.js',
          ],
          projectRoot
        );

        expect(result).toHaveLength(expectedSourcePaths.length);
        result.forEach((sourcePath) =>
          expect(expectedSourcePaths).toContain(sourcePath)
        );
      });

      it('get sources with ignorePaths', () => {
        const config = { projectRoot, ignorePaths: ['packages/common/*.js'] };
        const result = getSourcePaths(['packages/*/*.js'], config);

        const expectedSourcePaths = getFullPaths(
          ['packages/client-native/entry.js', 'packages/client-web/entry.js'],
          projectRoot
        );

        expect(result).toHaveLength(expectedSourcePaths.length);
        result.forEach((sourcePath) =>
          expect(expectedSourcePaths).toContain(sourcePath)
        );
      });
    });
  });
});
