import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import {
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExportAllDeclaration,
  isVariableDeclaration,
  isFunctionDeclaration,
  isClassDeclaration,
  isTypeAlias,
  isOpaqueType,
  isInterfaceDeclaration,
} from '@babel/types';

function createIsNotIgnoredFile(ignoreExportPatterns = []) {
  const ignores = ignoreExportPatterns.map((pattern) => new RegExp(pattern));
  return (sourcePath) => !ignores.some((regExp) => regExp.test(sourcePath));
}

export default function getExports(sourcePaths, ctx) {
  const { ignoreExportPatterns = [] } = ctx.config;
  const isNotIgnored = createIsNotIgnoredFile(ignoreExportPatterns);

  return sourcePaths.filter(isNotIgnored).flatMap((sourcePath) => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    return getExportData(source, sourcePath, ctx);
  });
}

export function getExportData(source, sourcePath, ctx) {
  const exports = getExportedIdentifiers(source, sourcePath, ctx);

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
    isExportNamedDeclaration(node) ||
    isExportDefaultDeclaration(node) ||
    isExportAllDeclaration(node)
  );
}

/**
 * Returns an array of exported identifiers
 * with their name and location information.
 *
 * @param {string} source Source code as string
 * @param {Object} parserOptions Parser options
 */
export function getExportedIdentifiers(source, sourcePath, ctx) {
  const { parserOptions } = ctx.config;

  const ast = parse(source, parserOptions);
  return ast.program.body
    .filter(isExportDeclaration)
    .flatMap((node) => getExportName(node, sourcePath, ctx));
}

/**
 * Extracts exported identifier name and location.
 * May return single value or array of values.
 *
 * @param {AstNode} node
 */
export function getExportName(node, sourcePath, ctx) {
  const { loc, declaration } = node;
  if (isExportDefaultDeclaration(node)) {
    return {
      name: 'default',
      loc,
    };
  }

  if (isExportAllDeclaration(node)) {
    const { resolve } = ctx.config;
    const { value: sourceValue } = node.source;

    const getExportNamesFromImport = (importedSourcePaths) => {
      return importedSourcePaths
        .flatMap((importedSourcePath) => {
          const importedSource = fs.readFileSync(importedSourcePath, 'utf8');
          return getExportedIdentifiers(
            importedSource,
            importedSourcePath,
            ctx
          ).flatMap(({ name }) => name);
        })
        .filter((name, index, arr) => !arr.includes(name, index + 1));
    };

    try {
      const importedSourcePaths = resolve(
        path.dirname(sourcePath),
        sourceValue
      );

      const names = getExportNamesFromImport(
        Array.isArray(importedSourcePaths)
          ? importedSourcePaths
          : [importedSourcePaths]
      );

      return names.map((name) => ({ name, loc }));
    } catch (error) {
      return [];
    }
  }

  if (isVariableDeclaration(declaration)) {
    return declaration.declarations.map((declaration) => ({
      name: declaration.id.name,
      loc,
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
      loc,
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
