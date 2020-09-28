import fs from 'fs';
import path from 'path';
import resolve from 'enhanced-resolve';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { getExportedIdentifiers } from './getExports';
import { toRelativePath } from './utils';

export default function getImports(sourcePaths, ctx) {
  const { projectRoot } = ctx.config;
  const toRelative = toRelativePath(projectRoot);

  return sourcePaths
    .map((sourcePath) => {
      const source = fs.readFileSync(sourcePath, 'utf8');
      const relativePath = toRelative(sourcePath);
      const importData = getImportData(source, sourcePath, ctx);

      const imports = importData.reduce((acc, { from, specifiers }) => {
        if (!acc[from]) {
          acc[from] = specifiers;
        } else {
          // Duplicate import from the same path
          acc[from] = acc[from].concat(specifiers);
        }

        acc[from].sort();

        return acc;
      }, {});

      return {
        sourcePath,
        relativePath,
        imports,
      };
    })
    .filter(({ imports }) => Object.keys(imports).length);
}

function getImportData(source, srcPath, ctx) {
  const { config } = ctx;
  const ast = parse(source, config.parserOptions);
  const nodes = ast.program.body.filter(isImportDeclaration);

  return nodes
    .map((node) => getImportDetails(node, srcPath, ast, ctx))
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

function isImportDeclaration(node) {
  return (
    node.type === 'ImportDeclaration' ||
    // When import is used together with export:
    // export { default } from './my-file';
    ((node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportAllDeclaration') &&
      node.source &&
      node.source.value)
  );
}

function getImportDetails(node, srcPath, ast, ctx) {
  const createFilter = (type) => (specifier) => specifier.type === type;
  const isNamespaceSpecifier = createFilter('ImportNamespaceSpecifier');
  const isDefaultSpecifier = createFilter('ImportDefaultSpecifier');
  const isImportSpecifier = createFilter('ImportSpecifier');
  const isExportSpecifier = createFilter('ExportSpecifier');

  const { specifiers = [] } = node;

  // Get namespace imports:
  // import * as something from './somewhere'
  const specifierNodes = specifiers.filter(isNamespaceSpecifier);
  const nsSpecifiers = [];

  // Get identifiers that are used from this namespace
  // May not be acurate
  if (specifierNodes.length) {
    const nsMap = specifierNodes.reduce(
      (accumulator, specifierNode) =>
        accumulator.set(specifierNode.local.name, true),
      new Map()
    );

    traverse(ast, {
      enter(nodePath) {
        if (
          nodePath.node.type === 'MemberExpression' &&
          nodePath.node.object.type === 'Identifier' &&
          nsMap.has(nodePath.node.object.name)
        ) {
          nsSpecifiers.push(nodePath.node.property.name);
        }
      },
    });
  }

  const specifierNames = specifiers
    .filter(isImportSpecifier)
    .map((specifier) => specifier.imported && specifier.imported.name)
    .filter(Boolean);

  if (specifiers.some(isDefaultSpecifier)) {
    specifierNames.push('default');
  }

  // Case: export { default } from './sample-file';
  if (
    node.type === 'ExportNamedDeclaration' &&
    node.source &&
    node.source.value
  ) {
    const localNamedExports = node.specifiers
      .filter(isExportSpecifier)
      .map((specifier) => specifier.local.name);

    specifierNames.push(...localNamedExports);
  }

  // Case: export * from './sample-file';
  if (
    node.type === 'ExportAllDeclaration' &&
    node.source &&
    node.source.value
  ) {
    const { config } = ctx;

    const sourcePath = resolvePath(node.source.value, srcPath, ctx);
    const source = fs.readFileSync(sourcePath, 'utf8');

    const allExportNames = getExportedIdentifiers(
      source,
      config.parserOptions
    ).map(({ name }) => name);
    specifierNames.push(...allExportNames);
  }

  return {
    specifiers: [...specifierNames, ...nsSpecifiers],
    from: resolvePath(node.source.value, srcPath, ctx),
  };
}

function resolvePath(importValue, currentPath, ctx) {
  try {
    return resolve.sync(path.dirname(currentPath), importValue);
  } catch (error) {
    // Add to failed resolutions list
    ctx.failedResolutions[importValue] = true;
    return importValue;
  }
}
