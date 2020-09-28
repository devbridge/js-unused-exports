import path from 'path';
import fs from 'fs';
import assert from 'assert';
import lodash from 'lodash';

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
  };

  assertConfig(config);

  const pkgJsonPath = path.join(config.projectRoot, 'package.json');
  const { dependencies, devDependencies } = JSON.parse(
    fs.readFileSync(pkgJsonPath, 'utf8')
  );

  return {
    config,
    dependencies: { ...dependencies, ...devDependencies },
    unknownPackages: {},
    failedResolutions: {},
  };
}

function assertConfig(config) {
  assert(
    lodash.isString(config.projectRoot),
    'Conifg "projectRoot" value must be a string'
  );

  assert(
    lodash.isArray(config.sourcePaths),
    'Conifg "sourcePaths" must be an array'
  );

  assert(
    lodash.isPlainObject(config.parserOptions),
    'Missing valid "parserOptions" value'
  );

  assert(
    fs.existsSync(config.projectRoot),
    'Path "projectRoot" does not exist: ' + config.projectRoot
  );
}
