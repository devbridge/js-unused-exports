import fs from 'fs';
import { parse } from '@babel/parser';
import {
  isExportDefaultDeclaration,
  isVariableDeclaration,
  isFunctionDeclaration,
  isClassDeclaration,
  isTypeAlias,
  isOpaqueType,
  isInterfaceDeclaration,
} from '@babel/types';

export default function getExports(sourcePaths, ctx) {
  return sourcePaths.reduce((result, sourcePath) => {
    const { ignoreExportPatterns = [] } = ctx.config;
    const isIgnored = (pattern) => new RegExp(pattern).test(sourcePath);

    if (ignoreExportPatterns.some(isIgnored)) {
      return result;
    }

    const source = fs.readFileSync(sourcePath, 'utf8');
    const exportData = getExportData(source, sourcePath, ctx);

    result.push(exportData);
    return result;
  }, []);
}

export function getExportData(source, sourcePath, ctx) {
  const { parserOptions } = ctx.config;
  const exports = getExportedIdentifiers(source, parserOptions);

  return {
    sourcePath,
    exports,
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
  return ast.program.body.filter(isExportDeclaration).flatMap(getExportName);
}

/**
 * Extracts exported identifier name and location.
 * May return single value or array of values.
 *
 * @param {AstNode} node
 */
export function getExportName(node) {
  if (isExportDefaultDeclaration(node)) {
    return {
      name: 'default',
      loc: node.loc,
    };
  }

  const { declaration } = node;

  if (isVariableDeclaration(declaration)) {
    return declaration.declarations.map((declaration) => ({
      name: declaration.id.name,
      loc: node.loc,
    }));
  }

  if (
    isFunctionDeclaration(declaration) ||
    isClassDeclaration(declaration) ||
    isTypeAlias(declaration) ||
    isOpaqueType(declaration) ||
    isInterfaceDeclaration(declaration)
  ) {
    return {
      name: declaration.id.name,
      loc: node.loc,
    };
  }

  if (!declaration && node.specifiers) {
    return node.specifiers.map((specifier) => ({
      name: specifier.exported.name,
      loc: specifier.exported.loc,
    }));
  }

  const { type } = declaration || node;
  throw new Error(`Unknow declaration type: ${type}`);
}
