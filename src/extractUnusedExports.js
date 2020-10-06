function createLookupTable(importedIdentifiers) {
  const table = new Set();
  const getKey = (sourcePath, name) => `${sourcePath}:${name}`;

  // Build a set for quick lookup, where key is combined using path and name
  importedIdentifiers.forEach(({ imports }) =>
    Object.entries(imports).forEach(([importedFrom, names]) =>
      names.forEach((name) => table.add(getKey(importedFrom, name)))
    )
  );

  return (sourcePath, name) => {
    if (Array.isArray(name)) {
      return name.some((n) => table.has(getKey(sourcePath, n)));
    }
    return table.has(getKey(sourcePath, name));
  };
}

export default function extractUnusedExports(
  exportedNames,
  importedIdentifiers
) {
  const isImported = createLookupTable(importedIdentifiers);

  return exportedNames
    .map(({ sourcePath, exports }) => {
      const unusedExports = exports.filter(
        ({ name }) => !isImported(sourcePath, name)
      );

      return { sourcePath, unusedExports };
    })
    .filter(({ unusedExports }) => unusedExports.length);
}
