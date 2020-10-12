import fs from 'fs';
import { escapeRegExp } from './utils';

export default function fixExports(unusedExports, config) {
  Object.values(unusedExports).forEach((unused) => {
    const indentifierNames = unused.unusedExports.map((exp) => exp.name);
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
  const identifiers = identifierNames.map(escapeRegExp).join('|');

  const re = new RegExp(
    `export\\s+((const|function)\\s+(${identifiers}))\\b`,
    'g'
  );

  return source.replace(re, '$1');
}
