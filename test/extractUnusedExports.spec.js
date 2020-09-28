import extractUnusedExports from '../src/extractUnusedExports';

describe('extractUnusedExports', () => {
  describe('extractUnusedExports()', () => {
    it('gets exported identifiers from source file', () => {
      const sourcePath = '/project/src/Arrows';
      const relativePath = 'src/Arrows';

      const exportedNames = [
        {
          sourcePath,
          relativePath,
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
          relativePath: 'src/fileA',
          imports: { [relativePath]: ['ArrowLeft'] },
        },
        {
          sourcePath: '/project/src/fileB',
          relativePath: 'src/fileB',
          imports: { [relativePath]: ['ArrowRight'] },
        },
      ];

      const result = extractUnusedExports(exportedNames, importedNames, []);

      expect(result).toEqual([
        {
          relativePath,
          sourcePath,
          unusedExports: [{ name: 'ArrowCenter' }],
        },
      ]);
    });

    it('includes unused exports from tests', () => {
      const sourcePath = '/project/src/Arrows';
      const relativePath = 'src/Arrows';

      const exportedNames = [
        {
          sourcePath,
          relativePath,
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
          relativePath: 'src/fileA',
          imports: { [relativePath]: ['ArrowLeft'] },
        },
        {
          sourcePath: '/project/tests/Arrows/fileB',
          relativePath: 'tests/Arrows/fileB',
          imports: { [relativePath]: ['ArrowRight'] },
        },
      ];

      const importNamesTest = [
        {
          sourcePath: '/project/tests/Arrows/fileB',
          relativePath: 'tests/Arrows/fileB',
          imports: { [relativePath]: ['ArrowRight'] },
        },
      ];

      const result = extractUnusedExports(
        exportedNames,
        importedNames,
        importNamesTest
      );

      expect(result).toEqual([
        {
          relativePath,
          sourcePath,
          unusedExports: [{ name: 'ArrowCenter' }, { name: 'ArrowRight' }],
        },
      ]);
    });
  });
});
