import lodash from 'lodash';
import fs from 'fs';

export default function fixExports(unusedExports, config) {
  lodash.forEach(unusedExports, unused => {
    const indentifierNames = unused.unusedExports.map(exp => exp.name);
    const sourceBefore = fs.readFileSync(unused.sourcePath, 'utf8');

    const sourceAfter = removeExportDeclarations(
      sourceBefore,
      indentifierNames,
      config
    );

    fs.writeFileSync(unused.sourcePath, sourceAfter);
  });
}

export function removeExportDeclarations(source, identifierNames) {
  const identifiers = identifierNames.map(lodash.escapeRegExp).join('|');

  const re = new RegExp(
    `export\\s+((const|function)\\s+(${identifiers}))\\b`,
    'g'
  );

  return source.replace(re, '$1');
}
