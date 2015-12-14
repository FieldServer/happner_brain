/*
 * Only one logger per process.
 * If already defined, use that one.
 *
 */

if (typeof global['happn-logger'] == 'undefined') {
  Object.defineProperty(global, 'happn-logger', {
    value: require('./lib/logger'),
    configurable: true
  });
}

module.exports = global['happn-logger'];
