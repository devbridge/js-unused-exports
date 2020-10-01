import extractUnusedExports from '../src/extractUnusedExports';

describe('extractUnusedExports', () => {
  describe('extractUnusedExports()', () => {
    it('gets exported identifiers from source file', () => {
      const sourcePath = '/project/src/Arrows';

      const exportedNames = [
        {
          sourcePath,
          exports: [
            { name: 'ArrowLeft' },
            { name: 'ArrowCenter' },
            { name: 'ArrowRight' },
          ],
        },
      ];

      const importedNames = [
        {
          sourcePath: '/project/src/fileA',
          imports: { [sourcePath]: ['ArrowLeft'] },
        },
        {
          sourcePath: '/project/src/fileB',
          imports: { [sourcePath]: ['ArrowRight'] },
        },
      ];

      const result = extractUnusedExports(exportedNames, importedNames, []);

      expect(result).toEqual([
        {
          sourcePath,
          unusedExports: [{ name: 'ArrowCenter' }],
        },
      ]);
    });

    it('includes unused exports from tests', () => {
      const sourcePath = '/project/src/Arrows';

      const exportedNames = [
        {
          sourcePath,
          exports: [
            { name: 'ArrowLeft' },
            { name: 'ArrowCenter' },
            { name: 'ArrowRight' },
          ],
        },
      ];

      const importedNames = [
        {
          sourcePath: '/project/src/fileA',
          imports: { [sourcePath]: ['ArrowLeft'] },
        },
        {
          sourcePath: '/project/tests/Arrows/fileB',
          imports: { [sourcePath]: ['ArrowRight'] },
        },
      ];

      const testFiles = ['/project/tests/Arrows/fileB'];

      const result = extractUnusedExports(
        exportedNames,
        importedNames,
        testFiles
      );

      expect(result).toEqual([
        {
          sourcePath,
          unusedExports: [{ name: 'ArrowCenter' }, { name: 'ArrowRight' }],
        },
      ]);
    });
  });
});
