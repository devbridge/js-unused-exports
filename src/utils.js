import path from 'path';
import glob from 'glob';

/**
 *
 * @param {string[]} globPatterns Array of glob patterns
 * @param {Object} config         Glob options
 */
export function getSourcePaths(globPatterns, config) {
  const options = {
    cwd: config.projectRoot,
    ignore: config.ignorePaths,
    absolute: true,
  };

  return globPatterns
    .flatMap((globPattern) => glob.sync(globPattern, options))
    .map((sourcePath) => path.normalize(sourcePath));
}

// Lifted from lodash
function isObjectLike(value) {
  return typeof value === 'object' && value !== null;
}

export function isPlainObject(value) {
  if (!isObjectLike(value) || String(value) !== '[object Object]') {
    return false;
  }
  if (Object.getPrototypeOf(value) === null) {
    return true;
  }
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(value) === proto;
}

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExpChar = RegExp(reRegExpChar.source);

export function escapeRegExp(string) {
  return string && reHasRegExpChar.test(string)
    ? string.replace(reRegExpChar, '\\$&')
    : string || '';
}
