import fs from 'fs';
import path from 'path';
import { codeFrameColumns } from '@babel/code-frame';

export default function generateReport(unusedExports, projectRoot) {
  const frameOptions = {
    highlightCode: true,
    linesAbove: 0,
    linesBelow: 0,
  };

  const maxFilesToDisplay = 50;
  const entries = Object.entries(unusedExports);

  entries
    .slice(0, maxFilesToDisplay)
    .forEach(([key, { sourcePath, unusedExports }]) => {
      const relativePath = path.relative(projectRoot, sourcePath);

      console.log(`${key}: ${relativePath}`);
      const src = fs.readFileSync(sourcePath, 'utf8');

      Object.values(unusedExports).forEach((exp) => {
        if (exp.loc) {
          const loc = { start: exp.loc.start };
          console.log(codeFrameColumns(src, loc, frameOptions));
        } else {
          console.log(`    - ${exp.name}`);
        }
      });
      console.log('');
    });

  if (entries.length > maxFilesToDisplay) {
    console.log('');
    console.log(
      `Showing ${maxFilesToDisplay} of ${entries.length} affected files`
    );
    console.log('');
  }
}
