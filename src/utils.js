import lodash from 'lodash';
import glob from 'glob';
import path from 'path';

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

  return lodash.flatMap(globPatterns, (globPattern) =>
    glob.sync(globPattern, options)
  );
}

/**
 * Returns function which converts absolute path to relative.
 *
 * @param {string} projectRoot Project root directory path
 */
export function toRelativePath(projectRoot) {
  return (sourcePath) => path.relative(projectRoot, sourcePath);
}
