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

  return globPatterns.flatMap((globPattern) => glob.sync(globPattern, options));
}
