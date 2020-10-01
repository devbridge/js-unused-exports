import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import JSON5 from 'json5';
import './polyfill';
import { getSourcePaths } from './utils';
import extractUnusedExports from './extractUnusedExports';
import fixExports from './fixExports';
import printReport from './generateReport';
import createContext from './createContext';
import getExports from './getExports';
import getImports from './getImports';
import { isPlainObject } from './utils';

const warn = chalk.yellow;
const info = chalk.green;

export function execute(args) {
  const userConfig = getConfig(args.config);

  const ctx = createContext(userConfig);
  const { config } = ctx;

  printBox(`Current Configuration`);
  console.log(JSON.stringify(ctx.config, null, 2));

  const timeStart = Date.now();

  const sourceFiles = getSourcePaths(config.sourcePaths, config);
  const testFiles = getSourcePaths(config.testPaths, config);
  const exportedNames = getExports(sourceFiles, ctx);
  const importedNames = getImports(sourceFiles, ctx);
  const importedNamesTest = getImports(testFiles, ctx);
  const unusedExports = extractUnusedExports(
    exportedNames,
    importedNames,
    importedNamesTest
  );

  warnForUnknownPackages(ctx.unknownPackages);
  warnForFailedResolutions(ctx.failedResolutions);

  if (args.fix) {
    fixExports(unusedExports, config);
  } else {
    printBox(`Report`);
    printReport(unusedExports, config.projectRoot);
  }

  const { outDir } = args;

  if (outDir) {
    printBox('Save Results');

    const dirPath = path.resolve(outDir);

    if (path.existsSync(dirPath)) {
      writeToFile(exportedNames, dirPath, 'exports.json');
      writeToFile(importedNames, dirPath, 'imports.json');
      writeToFile(unusedExports, dirPath, 'unused.json');
    } else {
      printWarning(`WARNING: output dir deas not exist - ${dirPath}`);
    }
  }

  const timeEnd = Date.now();
  const timeTook = timeEnd - timeStart;

  const summary = {
    sourceFileCount: sourceFiles.length,
    testFileCount: testFiles.length,
    unusedExports,
    timeTook,
  };

  printSummary(summary);
}

function getConfig(configPath) {
  if (typeof configPath !== 'string') {
    return isPlainObject(configPath) ? configPath : {};
  }

  const absolutPath = path.resolve(configPath);

  if (!fs.existsSync(configPath)) {
    printWarning('Unable to find config file: ' + absolutPath);
    return null;
  }

  return JSON5.parse(fs.readFileSync(absolutPath, 'utf8'));
}

function print(message) {
  console.log(info(message));
}

function printSummary(summary) {
  const { timeTook, sourceFileCount, testFileCount, unusedExports } = summary;

  const unusedExportCount = unusedExports.reduce(
    (acc, exp) => acc + exp.unusedExports.length,
    0
  );

  const fileCount = unusedExports.length;

  printBox(`Unused Exports Summary`);
  print(`   Unused export count: ${unusedExportCount}  `);
  print(`   Affected file count: ${fileCount}          `);
  print(`    Total source files: ${sourceFileCount}    `);
  print(`      Total test files: ${testFileCount}      `);
  print(`          Completed in: ${timeTook} ms        `);
}

function printBox(value) {
  const width = 60;
  const padding = (width - value.length) / 2;
  const startPadding = Math.floor(padding);
  const endPaddig = Math.ceil(padding);

  print(`┌${'─'.repeat(width)}┐`);
  print(`|${' '.repeat(startPadding)}${value}${' '.repeat(endPaddig)}|`);
  print(`└${'─'.repeat(width)}┘`);
}

function printWarning(message) {
  console.log(warn(message));
}

function warnForUnknownPackages(unknownPackages) {
  const unresolvePackages = unknownPackages;

  if (unresolvePackages.length === 0) {
    return;
  }

  const message =
    'Unknown packages found. Add package to ' +
    'package.json dependency list or specify an alias';

  printWarning(message);

  unresolvePackages.forEach((pkg) => {
    printWarning(`  ${pkg} `);
  });
}

function warnForFailedResolutions(failedResolutions) {
  if (!failedResolutions.length) {
    return;
  }

  const message = [
    'Unable to resolve following import paths. Please',
    'specify "alias" if needed or add pattern to',
    '"ignoreImportPatterns" in provided config file.',
  ].join(' ');

  printWarning(message);

  [...failedResolutions].sort().forEach((importPath) => {
    printWarning(`  ${importPath} `);
  });
}

function writeToFile(contents, outDir, fileName) {
  const resultsPath = path.join(outDir, fileName);
  print(resultsPath);
  fs.writeFileSync(resultsPath, JSON.stringify(contents, null, 2));
}
