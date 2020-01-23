import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { toRelativePath } from './utils';

const nativeModules = getNativeModuleMap();

export default function getImports(sourcePaths, ctx) {
  const { projectRoot } = ctx.config;
  const toRelative = toRelativePath(projectRoot);
  const hasImports = imp => !_.isEmpty(imp.imports);

  return sourcePaths
    .map(sourcePath => {
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
        imports
      };
    })
    .filter(hasImports);
}

function getImportData(source, srcPath, ctx) {
  const { config } = ctx;
  const ast = parse(source, config.parserOptions);
  const isRelative = node => isRelativeImport(node.source.value, ctx);
  const nodes = ast.program.body.filter(isImportDeclaration).filter(isRelative);

  return nodes
    .map(node => getImportDetails(node, srcPath, ast, ctx))
    .filter(details => details.specifiers.length > 0);
}

function isRelativeImport(importPath, ctx) {
  const { aliases, ignoreImportPatterns } = ctx.config;

  const parts = importPath.split('/');
  const importIsAliased = (value, alias) => importPath.startsWith(alias);

  if (_.some(aliases, importIsAliased)) {
    return true;
  }

  // Check if module name is scoped package, e.g. @babel/core
  const moduleName =
    importPath.startsWith('@') && parts.length > 1
      ? _.first(parts) + '/' + parts[1]
      : _.first(parts);

  if (
    ignoreImportPatterns &&
    _.some(ignoreImportPatterns, pattern => RegExp(pattern).test(importPath))
  ) {
    return false;
  }

  if (moduleName.startsWith('.')) {
    return true;
  }

  if (aliases[moduleName]) {
    return true;
  }

  // If import is not listed in dependencies, devDependencies
  // or is not native NodeJS module, add to unknown packages list
  if (!(ctx.dependencies[moduleName] || nativeModules[moduleName])) {
    ctx.unknownPackages[moduleName] = true;
  }

  return false;
}

function isImportDeclaration(node) {
  return (
    node.type === 'ImportDeclaration' ||
    // When import is used together with export:
    // export { default } from './my-file';
    (node.type === 'ExportNamedDeclaration' && node.source && node.source.value)
  );
}

function getImportDetails(node, srcPath, ast, ctx) {
  const importedName = _.property('imported.name');
  const createFilter = type => specifier => specifier.type === type;
  const isNamespaceSpecifier = createFilter('ImportNamespaceSpecifier');
  const isDefaultSpecifier = createFilter('ImportDefaultSpecifier');
  const isImportSpecifier = createFilter('ImportSpecifier');

  // Get namespace imports:
  // import * as something from './somewhere'
  const specifierNodes = node.specifiers.filter(isNamespaceSpecifier);
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
      }
    });
  }

  const specifiers = _.compact(
    node.specifiers
      .filter(isImportSpecifier)
      .map(specifier => importedName(specifier))
  );

  if (node.specifiers.find(isDefaultSpecifier)) {
    specifiers.push('default');
  }

  // Case: export { default } from './sample-file';
  if (
    node.type === 'ExportNamedDeclaration' &&
    node.source &&
    node.source.value
  ) {
    specifiers.push('default');
  }

  return {
    specifiers: [...specifiers, ...nsSpecifiers],
    from: resolvePath(node.source.value, srcPath, ctx)
  };
}

function resolvePath(importValue, currentPath, ctx) {
  const { config } = ctx;
  const { aliases, projectRoot } = config;

  assert(aliases, 'Aliases is not provided');

  let importPath = null;

  _.forEach(aliases, (aliasPath, alias) => {
    if (importValue === alias) {
      importPath = path.join(projectRoot, aliasPath);
      return;
    }

    if (importValue.startsWith(alias + '/')) {
      importPath = path.join(
        projectRoot,
        aliasPath,
        importValue.substring(alias.length)
      );
    }
  });

  if (importPath === null) {
    importPath = path.resolve(path.dirname(currentPath), importValue);
  }

  // Supported extensions: .js, .jsx
  if (RegExp('(\\.jsx?)$').test(importPath) && fs.existsSync(importPath)) {
    return path.relative(projectRoot, importPath);
  }

  const jsPath = `${importPath}.js`;

  if (fs.existsSync(jsPath)) {
    return path.relative(projectRoot, jsPath);
  }

  const jsPathIndex = `${importPath}/index.js`;

  if (fs.existsSync(jsPathIndex)) {
    return path.relative(projectRoot, jsPathIndex);
  }

  // Add to failed resolutions list
  ctx.failedResolutions[importValue] = true;

  return path.relative(projectRoot, importPath);
}

function getNativeModuleMap() {
  return _.keyBy([
    'assert',
    'async_hooks',
    'buffer',
    'child_process',
    'cluster',
    'console',
    'constants',
    'crypto',
    'dgram',
    'dns',
    'domain',
    'events',
    'fs',
    'http',
    'http2',
    'https',
    'inspector',
    'module',
    'net',
    'os',
    'path',
    'perf_hooks',
    'process',
    'punycode',
    'querystring',
    'readline',
    'repl',
    'stream',
    'string_decoder',
    'timers',
    'tls',
    'trace_events',
    'tty',
    'url',
    'util',
    'v8',
    'vm',
    'zlib'
  ]);
}
