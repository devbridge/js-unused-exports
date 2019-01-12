import path from 'path';
import getImports from '../getImports';
import createContext from '../createContext';

describe('getImports', () => {
  describe('getImports()', () => {
    it('extracts imports from file', () => {
      const projectRoot = path.join(__dirname, 'fixtures');
      const sourceFile = path.join(projectRoot, 'imports-sample.js');

      const ctx = createContext({
        projectRoot,
        aliases: {},
        sourcePaths: []
      });

      const result = getImports([sourceFile], ctx);

      const expected = [
        {
          imports: {
            // Exports are sorted
            'exports-sample.js': [
              'default',
              'Family',
              'firstName',
              'getName',
              'lastName'
            ].sort()
          },
          relativePath: 'imports-sample.js',
          sourcePath: sourceFile
        }
      ];

      expect(result).toMatchObject(expected);
    });
  });
});
