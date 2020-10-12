// Array.prototype.flatMap
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap

if (!Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, 'flatMap', {
    configurable: true,
    value: function flatMap(mapCallback, thisArg) {
      return this.reduce((acc, currentValue, index, array) => {
        const mapped = mapCallback.call(thisArg, currentValue, index, array);
        if (Array.isArray(mapped)) {
          acc.push(...mapped);
        } else {
          acc.push(mapped);
        }

        return acc;
      }, []);
    },
    writable: true,
  });
}
