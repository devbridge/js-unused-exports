import fs from 'fs';
import assert from 'assert';
import resolve from 'enhanced-resolve';
import { isPlainObject } from './utils';

export const defaultParserOptions = {
  sourceType: 'module',
  plugins: [
    'objectRestSpread',
    'jsx',
    'flow',
    'classProperties',

    // Required by frontend
    'decorators-legacy',
    'exportDefaultFrom',
  ],
};

const CONFIG_DEFAULTS = {
  sourcePaths: ['src/**/*.js'],
  testPaths: ['src/**/*.spec.js'],
  ignoreImportPatterns: ['node_modules', '(png|gif|jpg|jpeg|css|scss)$'],
  aliases: {},
  parserOptions: defaultParserOptions,
};

export default function createContext(userConfig) {
  const config = {
    ...CONFIG_DEFAULTS,
    ...userConfig,
    projectRoot: userConfig.projectRoot || process.cwd(),
    resolve:
      userConfig.resolve ||
      resolve.create.sync({
        alias: userConfig.aliases,
        extensions: ['.js', '.jsx'],
      }),
  };

  assertConfig(config);

  return {
    config,
    unknownPackages: [],
    failedResolutions: [],
  };
}

function assertConfig(config) {
  assert(
    typeof config.projectRoot === 'string',
    'Conifg "projectRoot" value must be a string'
  );

  assert(
    Array.isArray(config.sourcePaths),
    'Conifg "sourcePaths" must be an array'
  );

  assert(
    isPlainObject(config.parserOptions),
    'Missing valid "parserOptions" value'
  );

  assert(
    fs.existsSync(config.projectRoot),
    'Path "projectRoot" does not exist: ' + config.projectRoot
  );
}
