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

export function checkUnused(ctx) {
  const { config } = ctx;
  const timeStart = Date.now();

  const sourceFiles = getSourcePaths(config.sourcePaths, config);
  const testFiles = getSourcePaths(config.testPaths, config);
  const filteredSourceFiles = sourceFiles.filter(
    (sourceFile) => !testFiles.includes(sourceFile)
  );

  const exportedNames = getExports(filteredSourceFiles, ctx);
  const importedNames = getImports(filteredSourceFiles, ctx);
  const unusedExports = extractUnusedExports(
    exportedNames,
    importedNames,
    testFiles
  );

  const timeEnd = Date.now();
  const timeTook = timeEnd - timeStart;

  const { unknownPackages, failedResolutions } = ctx;

  return {
    sourceFileCount: sourceFiles.length,
    testFileCount: testFiles.length,
    exportedNames,
    importedNames,
    unusedExports,
    unknownPackages,
    failedResolutions,
    timeTook,
  };
}

export default function execute(args) {
  const userConfig = getConfig(args.config);
  const ctx = createContext(userConfig);
  const { config } = ctx;

  if (args.verbose) {
    printBox(`Current Configuration`);
    console.log(JSON.stringify(ctx.config, null, 2));
  }

  const summary = checkUnused(ctx);
  const {
    unusedExports,
    exportedNames,
    importedNames,
    unknownPackages,
    failedResolutions,
  } = summary;

  warnForUnknownPackages(unknownPackages);
  warnForFailedResolutions(failedResolutions, config.projectRoot);

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

    if (fs.existsSync(dirPath)) {
      writeToFile(exportedNames, dirPath, 'exports.json');
      writeToFile(importedNames, dirPath, 'imports.json');
      writeToFile(unusedExports, dirPath, 'unused.json');
    } else {
      printWarning(`WARNING: output dir deas not exist - ${dirPath}`);
    }
  }

  printSummary(summary);

  return summary;
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

function warnForFailedResolutions(failedResolutions, projectRoot) {
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
    const relativePath = path.relative(projectRoot, importPath);
    printWarning(`  ${relativePath} `);
  });
}

function writeToFile(contents, outDir, fileName) {
  const resultsPath = path.join(outDir, fileName);
  print(resultsPath);
  fs.writeFileSync(resultsPath, JSON.stringify(contents, null, 2));
}
