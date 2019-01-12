import extractUnusedExports from '../extractUnusedExports';

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
            { name: 'ArrowRight' }
          ]
        }
      ];

      const importedNames = [
        {
          relativePath: 'src/fileA',
          imports: { [relativePath]: ['ArrowLeft'] }
        },
        {
          relativePath: 'src/fileB',
          imports: { [relativePath]: ['ArrowRight'] }
        }
      ];

      const result = extractUnusedExports(exportedNames, importedNames);

      expect(result).toEqual([
        {
          relativePath,
          sourcePath,
          unusedExports: [{ name: 'ArrowCenter' }]
        }
      ]);
    });
  });
});
