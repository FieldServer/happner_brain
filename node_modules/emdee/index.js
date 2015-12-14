var marked = require('./deps/marked');

var os = require('os');
var setted = false;
var failed = false;
var done = false;
var debug = require('debug')('emdee');

module.exports = function(object, opts) {

  if (done) {
    debug('already generated README\'s'); // todo, make this per path
    return;
  }

  if (!setted) {
    try {
      marked.setOptions({gfm: true, terminal: true});
      setted = true;
    } catch (e) {
      failed = true;
      debug('could not set marked options', e);
      return; // todo, rather generate the html instead ??
    }
  }

  opts = opts || {};
  opts.paths = opts.paths || ['README'];
  opts.suffix = opts.suffix || null; // create a newpropery as keySUFFIX instead of
                                    // replacing at key

  for (var i = 0; i < opts.paths.length; i++) {
    module.exports.convertAtPath(opts.paths[i], opts, object);
  }
}

module.exports.convertAtPath = function(keyPath, opts, object) {

  debug('convertAtPath \'%s\'', keyPath);

  var keys = keyPath.split('/');

  var recurse = function(remainingKeys, obj) {

    debug('recurse');

    if (remainingKeys.length == 0) return;

    var nextKey = remainingKeys.shift();
    var nextObj = obj[nextKey];

    debug('convertAt nextKey \'%s\', remaining: %d', nextKey, remainingKeys.length);

    if (remainingKeys.length == 0) {
      if (opts.suffix) {
        return module.exports.suffix(obj, nextKey, opts.suffix);
      } else {
        return module.exports.replace(obj, nextKey);
      }    
    }

    if (remainingKeys.length == 1) {
      if (opts.suffix) {
        return module.exports.suffix(nextObj, remainingKeys[0], opts.suffix);
      } else {
        return module.exports.replace(nextObj, remainingKeys[0]);
      }
    } 
    

    if (nextKey == '') recurse(remainingKeys);

  }

  recurse(keys, object);

}

var cant = function() {
  console.log();
  console.log('Readme not available...');
  console.log('see https://github.com/nomilous/emdee/blob/master/index.js#L4');
  console.log();
}

module.exports.replace = function(obj, key) {

  debug('create README at \'%s\'', key);

  if (!setted) {
    try {
      marked.setOptions({gfm: true, terminal: true});
      setted = true;
    } catch (e) {
      failed = true;
    }
  }

  var formatted = module.exports.parse(obj[key]);

  Object.defineProperty(obj, key, {
    enumerable: true,
    get: function() {
      if (failed) return cant();
      try {
        console.log(marked.parse( formatted ));
      } catch (e) {
        console.log(e);
        return cant();
      }
    }
  });

}

module.exports.suffix = function(obj, key, suffix) {

  debug('create README at \'%s\' with suffix \'%s\'', key, suffix);

  if (typeof obj[key + suffix] !== 'undefined') return;

  if (!setted) {
    try {
      marked.setOptions({gfm: true, terminal: true});
      setted = true;
    } catch (e) {
      failed = true;
    }
  }

  var formatted = module.exports.parse(obj[key]);

  if (suffix[0] == '.') {
    debug('nesting into \'%s\'', key + suffix);
    obj = obj[key] || {};
    key = suffix.substr(1);
  } else {
    key = key + suffix;
  }

  Object.defineProperty(obj, key, {
    enumerable: true,
    get: function() {
      if (failed) return cant();
      try {
        console.log(marked.parse( formatted ));
      } catch (e) {
        console.log(e);
        return cant();
      }
    }
  });
}

module.exports.parse = function(fn) {

  var leftSpace, lines = fn.toString().split(os.EOL);
  
  lines.shift(); // remove first line: function() {/*
  lines.pop();  // remove last line:   */} 

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].match(/#/)) {
      var leftSpace = lines[i].indexOf('#');
      break;
    }
  }

  return lines.map(function(line) {
    return line.substr(leftSpace);
  }).join(os.EOL);

}

