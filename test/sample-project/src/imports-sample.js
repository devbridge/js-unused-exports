/* eslint-disable no-unused-vars */
// Should support duplicate imports from the same source
import sample, { firstName } from './exports-sample';
import { getName as getFullName, Family } from './exports-sample';
import { lastName } from './exports-sample.js';

import { firstName as givenName, lastName as familyName } from './all-export';

// Scoped package import
import { parse } from '@babel/parser';

export const fakeFunction = () => {
  sample(firstName, lastName, getFullName, Family, parse);
};
