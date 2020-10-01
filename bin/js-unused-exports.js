#!/usr/bin/env node

const program = require('commander');
const pkg = require('../package.json');
const { execute } = require('../lib/cli');

program
  .version(pkg.version, '-v, --version')
  .usage('[options]')
  .option('-c, --config [path]', 'path to the JSON config file')
  .option('-o --out-dir [path]', 'path to print scan results as JSON')
  .option('-f, --fix', 'automatically remove "export" directive where possible')
  .option('-v, --verbose', 'use verbose logging')
  .parse(process.argv);

execute(program);
