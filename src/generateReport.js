import fs from 'fs';
import { forEach } from 'lodash';
import { codeFrameColumns } from '@babel/code-frame';

export default function generateReport(unusedExports) {
  const frameOptions = {
    highlightCode: true,
    linesAbove: 0,
    linesBelow: 0,
  };

  const maxItems = 5000;

  let counter = 0;

  forEach(unusedExports, (unused, i) => {
    console.log(`${i}: ${unused.relativePath}`);
    const src = fs.readFileSync(unused.sourcePath, 'utf8');

    forEach(unused.unusedExports, (exp) => {
      counter += 1;

      // console.log(`    - ${exp.name}`);
      if (exp.loc) {
        const loc = { start: exp.loc.start };
        console.log(codeFrameColumns(src, loc, frameOptions));
      } else {
        console.log(`    - ${exp.name}`);
      }
    });
    console.log('');

    // Stop iteration at max items
    return counter < maxItems;
  });
}
