import fs from 'fs';
import path from 'path';
import { getType, PathType } from 'enhanced-resolve/lib/util/path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  isImportNamespaceSpecifier,
  isImportDefaultSpecifier,
  isMemberExpression,
  isIdentifier,
  isImportDeclaration,
  isExportAllDeclaration,
  isExportNamedDeclaration,
  isExportSpecifier,
  isImportSpecifier,
} from '@babel/types';

export default function getImports(sourcePaths, ctx) {
  return sourcePaths
    .map((sourcePath) => {
      const source = fs.readFileSync(sourcePath, 'utf8');
      const importData = getImportData(source, sourcePath, ctx);
      const imports = groupImports(importData);

      return {
        sourcePath,
        imports,
      };
    })
    .filter(({ imports }) => Object.keys(imports).length);
}

function groupImports(importData) {
  return importData.reduce((acc, { from, specifiers }) => {
    if (!acc[from]) {
      acc[from] = specifiers;
    } else {
      // Duplicate import from the same path
      acc[from] = acc[from].concat(specifiers);
    }

    acc[from].sort();

    return acc;
  }, {});
}

function getImportData(source, srcPath, ctx) {
  const { config } = ctx;
  const ast = parse(source, config.parserOptions);
  const nodes = ast.program.body.filter(isImport);

  return nodes
    .flatMap((node) => getImportDetails(node, srcPath, ast, ctx))
    .filter(
      ({ specifiers, from }) => specifiers.length && !isIgnoredImport(from, ctx)
    );
}

function isIgnoredImport(importPath, ctx) {
  const { ignoreImportPatterns = [] } = ctx.config;
  return ignoreImportPatterns.some((pattern) =>
    new RegExp(pattern).test(importPath)
  );
}

function isImport(node) {
  return (
    (isImportDeclaration(node) ||
      // When import is used together with export:
      // export { default } from './my-file';
      isExportNamedDeclaration(node) ||
      // export * from './my-file';
      isExportAllDeclaration(node)) &&
    node.source &&
    node.source.value
  );
}

function getNamespaceSpecifierNames(node, ast) {
  if (!node.specifiers) return [];

  // Get namespace imports:
  // import * as something from './somewhere'
  const specifierNodes = node.specifiers.filter(isImportNamespaceSpecifier);

  // Get identifiers that are used from this namespace
  // May not be acurate
  if (!specifierNodes.length) return [];

  const namespaceSpecifierNames = [];
  const localSpecifierNames = specifierNodes.map(
    (specifierNode) => specifierNode.local.name
  );

  traverse(ast, {
    enter({ node: currentNode }) {
      if (
        isMemberExpression(currentNode) &&
        isIdentifier(currentNode.object) &&
        localSpecifierNames.includes(currentNode.object.name)
      ) {
        namespaceSpecifierNames.push(currentNode.property.name);
      }
    },
  });

  return namespaceSpecifierNames;
}

function getDefaultSpecifierNames(node) {
  if (!node.specifiers) return [];
  if (node.specifiers.some(isImportDefaultSpecifier)) {
    return ['default'];
  }
  return [];
}

export function getImportDetails(node, srcPath, ast, ctx) {
  if (!node.source || !node.source.value) {
    return { specifiers: [] };
  }
  const {
    source: { value: sourceValue },
    specifiers: nodeSpecifiers = [],
  } = node;
  const from = resolvePath(sourceValue, srcPath, ctx);

  if (!from) {
    return { specifiers: [] };
  }

  const flattenDetails = Array.isArray(from)
    ? (specifiers) => from.map((f) => ({ from: f, specifiers }))
    : (specifiers) => ({ from, specifiers });

  // Case: import sampleFile, { firstName } from './sample-file';
  if (isImportDeclaration(node)) {
    const specifiers = nodeSpecifiers
      .filter(isImportSpecifier)
      .map((specifier) => specifier.imported && specifier.imported.name)
      .filter(Boolean);

    return flattenDetails([
      ...getDefaultSpecifierNames(node, ast),
      ...specifiers,
      ...getNamespaceSpecifierNames(node, ast),
    ]);
  }

  // Case: export { default as sampleFile, firstName } from './sample-file';
  if (isExportNamedDeclaration(node)) {
    const specifiers = nodeSpecifiers
      .filter(isExportSpecifier)
      .map((specifier) => specifier.local.name);

    return flattenDetails(specifiers);
  }

  return flattenDetails([]);
}

export function isPackage(importValue) {
  return getType(importValue) !== PathType.Relative;
}

export function resolvePath(importValue, currentPath, ctx) {
  const { resolve } = ctx.config;
  const currentDir = path.dirname(currentPath);
  try {
    return resolve(currentDir, importValue);
  } catch (error) {
    if (isPackage(importValue)) {
      ctx.unknownPackages.push(importValue);
    } else {
      const filePath = path.resolve(currentDir, importValue);
      ctx.failedResolutions.push(filePath);
    }
  }
}
