import path from 'path';
import getImports from '../src/getImports';
import createContext from '../src/createContext';

describe('getImports', () => {
  describe('getImports()', () => {
    it('extracts imports from file', () => {
      const projectRoot = path.join(__dirname, 'sample-project');
      const sourceFile = path.join(projectRoot, 'src/imports-sample.js');

      const ctx = createContext({
        projectRoot,
        aliases: {},
        sourcePaths: [],
      });

      const result = getImports([sourceFile], ctx);
      const exportAllSrcPath = path.join(projectRoot, 'src/export-all.js');
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
            [exportAllSrcPath]: ['A', 'B', 'C'],
          },
          relativePath: path.join('src', 'imports-sample.js'),
          sourcePath: sourceFile,
        },
      ];

      expect(result).toMatchObject(expected);
    });
  });
});
