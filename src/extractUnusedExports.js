function createLookupTable(importedIdentifiers, testFiles) {
  const table = new Set();
  const getKey = (sourcePath, name) => `${sourcePath}:${name}`;

  // Build a set for quick lookup, where key is combined using path and name
  importedIdentifiers
    .filter(({ sourcePath }) => !testFiles.includes(sourcePath))
    .forEach(({ imports }) =>
      Object.entries(imports).forEach(([importedFrom, names]) =>
        names.forEach((name) => table.add(getKey(importedFrom, name)))
      )
    );

  return (sourcePath, name) => table.has(getKey(sourcePath, name));
}

export default function extractUnusedExports(
  exportedNames,
  importedIdentifiers,
  testFiles
) {
  const isImported = createLookupTable(importedIdentifiers, testFiles);

  return exportedNames
    .map(({ sourcePath, exports }) => {
      const unusedExports = exports.filter(
        ({ name }) => !isImported(sourcePath, name)
      );

      return { sourcePath, unusedExports };
    })
    .filter(({ unusedExports }) => unusedExports.length);
}
