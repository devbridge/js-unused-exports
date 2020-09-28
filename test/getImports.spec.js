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
        sourcePaths: []
      });

      const result = getImports([sourceFile], ctx);
      const srcPath = `src${path.sep}exports-sample.js`;

      const expected = [
        {
          imports: {
            // Exports are sorted
            [srcPath]: [
              'default',
              'Family',
              'firstName',
              'getName',
              'lastName'
            ].sort()
          },
          relativePath: `src${path.sep}imports-sample.js`,
          sourcePath: sourceFile
        }
      ];

      expect(result).toMatchObject(expected);
    });
  });
});
