// Should support duplicate imports from the same source
import sample, { firstName } from './exports-sample';
import { getName as getFullName, Family } from './exports-sample';
import { lastName } from './exports-sample.js';

// Scoped package import
import { parse } from '@babel/parser';

// eslint-disable-next-line no-unused-vars
const fakeFunction = () => {
  sample(firstName, lastName, getFullName, Family, parse);
};
