import lodash from 'lodash';

export default function extractUnusedExports(
  exportedNames,
  importedIdentifiers,
  importedIdentifiersTest
) {
  const testPaths = new Set(
    importedIdentifiersTest.map((identifier) => identifier.sourcePath)
  );

  const identifierIsNotATest = (importedIdentifier) =>
    !testPaths.has(importedIdentifier.sourcePath);

  // Build map for quick lookup, where key is combined using path and name
  const importsByKey = importedIdentifiers
    .filter(identifierIsNotATest)
    .reduce((map, imp) => {
      lodash.forEach(imp.imports, (importedNames, importedFrom) => {
        importedNames.forEach((importedName) => {
          map.set(`${importedFrom}:${importedName}`, true);
        });
      });

      return map;
    }, new Map());

  return exportedNames.reduce((accumulator, exported) => {
    const { relativePath, sourcePath } = exported;

    const unusedExports = exported.exports.reduce((names, exp) => {
      const exportKey = `${relativePath}:${exp.name}`;

      // Quick lookup to check if it is used anywhere
      if (!importsByKey.has(exportKey)) {
        names.push(exp);
      }

      return names;
    }, []);

    if (unusedExports.length) {
      accumulator.push({
        sourcePath,
        relativePath,
        unusedExports,
      });
    }

    return accumulator;
  }, []);
}
