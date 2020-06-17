import lodash from 'lodash';
import fs from 'fs';
import { parse } from '@babel/parser';
import { toRelativePath } from './utils';

export default function getExports(sourcePaths, ctx) {
  return sourcePaths.reduce((result, sourcePath) => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const exportData = getExportData(source, sourcePath, ctx);

    const ignoreExportPatterns = ctx.config.ignoreExportPatterns;
    if (
      !ignoreExportPatterns ||
      ignoreExportPatterns.every((pattern) => !RegExp(pattern).test(sourcePath))
    ) {
      result.push(exportData);
    }

    return result;
  }, []);
}

function getExportData(source, sourcePath, ctx) {
  const { config } = ctx;
  const exports = getExportedIdentifiers(source, config.parserOptions);
  const toRelative = toRelativePath(config.projectRoot);

  return {
    sourcePath,
    relativePath: toRelative(sourcePath),
    exports
  };
}

/**
 * Checks if node is export declaration.
 *
 * @param {AstNode} node
 */
function isExportDeclaration(node) {
  return (
    node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportDefaultDeclaration'
  );
}

/**
 * Returns an array of exported identifiers
 * with their name and location information.
 *
 * @param {string} source Source code as string
 * @param {Object} parserOptions Parser options
 */
export function getExportedIdentifiers(source, parserOptions) {
  const ast = parse(source, parserOptions);
  const declarations = ast.program.body.filter(isExportDeclaration);

  return lodash.flatMap(declarations, getExportName);
}

/**
 * Extracts exported identifier name and location.
 * May return single value or array of values.
 *
 * @param {AstNode} node
 */
function getExportName(node) {
  if (node.type === 'ExportDefaultDeclaration') {
    return {
      name: 'default',
      loc: node.loc
    };
  }

  if (!node.declaration) {
    return node.specifiers.map(specifier => ({
      name: specifier.exported.name,
      loc: specifier.exported.loc
    }));
  }

  const { type } = node.declaration;

  switch (type) {
    case 'VariableDeclaration':
      return node.declaration.declarations.map(declaration => ({
        name: declaration.id.name,
        loc: node.loc
      }));
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'TypeAlias':
    case 'OpaqueType':
    case 'InterfaceDeclaration':
      return {
        name: node.declaration.id.name,
        loc: node.loc
      };
    default:
      throw new Error(`Unknow declaration type: ${type}`);
  }
}
