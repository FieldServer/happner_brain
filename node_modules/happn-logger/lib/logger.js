var util = require('util');

var Cache = [];

Object.defineProperty(module.exports, 'cache', {
  get: function() {
    return Cache;
  },
  enumerable: true
});

var configured = false;

var Config = {

  // keep a cache (array) of most recent n messages
  logCacheSize: process.env.LOG_CACHE_SIZE ? parseInt(process.env.LOG_CACHE_SIZE) : 50,

  // level defaults to info (fatal, error, warn, info, debug, trace)
  logLevel: process.env.LOG_LEVEL || 'info',

  // optionally display time difference between log messages
  logTimeDelta: true,

  // optionally log stack trace if last arg to log call is error instance
  logStackTraces: true,

  // specify to only log messages from specific components (lognames)
  logComponents: process.env.LOG_COMPONENTS ? process.env.LOG_COMPONENTS.split(',') : [],

  // specify log message parts delimiter
  logMessageDelimiter: '\t',

  // log date format (eg. 'yyyy-MM-dd hh:mm:ss.SSS')
  // it uses this above format if loging or redirecting to file
  logDateFormat: null,

  // layout (eg.see below)
  logLayout: null,

  // if config.logFile is specified:
  logFile: null,
  logFileLayout: null,
  logFileMaxSize: 20480,     // limit the file size
  logFileBackups: 10,        // keep history of 10 logfiles
  logFileNameAbsolute: true, // is the log filename an absolute path?

};

Object.defineProperty(module.exports, 'configured', {
  get: function() {
    return configured;
  },
  enumerable: true
});

Object.defineProperty(module.exports, 'config', {
  get: function() {
    return Config;
  }
});

var EventEmitter = require('events').EventEmitter;

var emitter = new EventEmitter();

Object.defineProperty(module.exports, 'emitter', {
  value: emitter
});

module.exports.configure = function(config) {
  var log4js, fileAppender, previous, defaulting;
  defaulting = false;
  configured = true;

  config = config || {};

  if (typeof config.logCacheSize == 'number')    Config.logCacheSize         = process.env.LOG_CACHE_SIZE ? parseInt(process.env.LOG_CACHE_SIZE) : config.logCacheSize;
  if (config.logLevel)                           Config.logLevel             = process.env.LOG_LEVEL || config.logLevel;
  if (typeof config.logTimeDelta == 'boolean')   Config.logTimeDelta         = config.logTimeDelta;
  if (typeof config.logStackTraces == 'boolean') Config.logStackTraces       = config.logStackTraces;
  if (config.logComponents)                      Config.logComponents        = process.env.LOG_COMPONENTS ? process.env.LOG_COMPONENTS.split(',') : config.logComponents;
  if (config.logMessageDelimiter)                Config.logMessageDelimiter  = config.logMessageDelimiter;
  if (config.logDateFormat)                      Config.logDateFormat        = config.logDateFormat;
  if (config.logLayout)                          Config.logLayout            = config.logLayout;
  if (config.logFile)                            Config.logFile              = config.logFile;
  if (config.logFileLayout)                      Config.logFileLayout        = config.logFileLayout;
  if (config.logFileMaxSize)                     Config.logFileMaxSize       = config.logFileMaxSize;
  if (config.logFileBackups)                     Config.logFileBackups       = config.logFileBackups;
  if (config.logFilelogFileNameAbsolute)         Config.logFileNameAbsolute  = config.logFileNameAbsolute;
  if (config.logger)                             Config.logger               = config.logger; 

  // only build the log4js config if not defined 
  if (!Config.logger) {

    defaulting = true;

    // create the necessary layout if date format is specified
    if (Config.logDateFormat && !Config.logLayout) {
      Config.logLayout = {
        type: 'pattern',
        pattern: '%d{' + Config.logDateFormat + '} [%5.5p] - %m'
      };
    }

    // if TTY create default format for console
    if (process.stdout.isTTY) {
      if (!Config.logLayout) {
        Config.logLayout = {
          type: 'pattern',
          pattern: '[%[%5.5p%]] - %m'
        };
      }
    }

    // if stdout is piped to file, display date, no colour
    else {
      if (!Config.logLayout) {
        Config.logLayout = {
          type: 'pattern',
          pattern: '%d{' + (Config.logDateFormat || 'yyyy-MM-dd hh:mm:ss.SSS') + '} [%5.5p] - %m'
        }
      }
    }

    // default logger includes console
    Config.logger = {
      appenders: [{
        type: "console",
        layout: Config.logLayout
      }]
    };
  }

  // create additional appender for logFile if specified
  if (Config.logFile && defaulting) {
    Config.logger.appenders.push(fileAppender = {
      "type": "file",
      "absolute": Config.logFileNameAbsolute,
      "filename": Config.logFile,
      "maxLogSize": Config.logFileMaxSize,
      "backups": Config.logFileBackups,
    });
    if (Config.logFileLayout) {
      fileAppender.layout = Config.logFileLayout
    } else {
      fileAppender.layout = {
        type: 'pattern',
        pattern: '%d{' + (Config.logDateFormat || 'yyyy-MM-dd hh:mm:ss.SSS') + '} [%5.5p] - %m'
      }
    }
  }

  log4js = require('log4js');
  log4js.configure(Config.logger);

  Config.logWriter = log4js.getLogger();
  Config.logWriter.setLevel(Config.logLevel);

  previous = previous || Date.now();

  Config.log = function(level, context, component, message, array) {

    var now, ms, string, last;

    if (Config.logComponents.length > 0) {
      if (level != 'fatal' && level != 'error' && level != 'warn') {
        if (Config.logComponents.indexOf(component) == -1) return;
      }
    }

    string = '';
    now = Date.now();

    if (Config.logTimeDelta) {
      ms = now - previous;
      string = string + ms + 'ms' + Config.logMessageDelimiter;
      previous = now;
    } else {
      previous = now;
    }

    if (Config.logCacheSize > 0) {
      Cache.unshift({
        timestamp: now,
        timedelta: ms,
        level: level,
        context: context,
        component: component,
        message: message
      });
      while (Cache.length > Config.logCacheSize) Cache.pop();
    }

    if (context) string = string + context + ' ';
    if (component) string = string + '(' + component + ') ';
    string = string + message;

    emitter.emit('before');

    Config.logWriter[level](string);

    if (Config.logStackTraces) {
      if (last = array[array.length -1]) {
        if (last.name && last.name == 'MeshError') {
          if (last.data && last.data.stack) {
            Config.logWriter[level](last.data.stack);
          }
        }
        else if (last.stack) {
          Config.logWriter[level](last.stack);
        }
      }
    }

    emitter.emit('after');

  };
} 

module.exports.createContext = function(context) {
  var thisContext = {
    value: context
  }

  var thisInstance = {
    createLogger: function(component, obj) {
      return module.exports.createLogger(component, obj, thisContext);
    }
  }

  Object.defineProperty(thisInstance, 'context', {
    set: function(v) {
      thisContext.value = v;
    },
    get: function() {
      return thisContext.value;
    },
    enumerable: true,
  });

  return thisInstance;
}

module.exports.createLogger = function(component, obj, thisContext) {

  var thisContext = thisContext || {
    value: undefined,
  }

  var logger = obj || function() {
    logger.debug.apply(this, arguments);
  }

  if (!obj) {
    logger.createLogger = function(component) {
      return module.exports.createLogger(component, null, thisContext);
    }
  }

  if (!obj) {
    Object.defineProperty(logger, 'context', {
      set: function(v) {
        thisContext.value = v;
      },
      get: function() {
        return thisContext.value;
      },
      enumerable: true,
    });
  }

  logger.on = function(event, handler) {
    emitter.on(event, handler);
  }

  logger.fatal = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isFatalEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('fatal', thisContext.value, component, message, array);
  }

  logger.error = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isErrorEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('error', thisContext.value, component, message, array);
  }

  logger.warn = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isWarnEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('warn', thisContext.value, component, message, array);
  }

  logger.info = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isInfoEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('info', thisContext.value, component, message, array);
  }

  logger.debug = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isDebugEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('debug', thisContext.value, component, message, array);
  }

  logger.$$DEBUG = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isDebugEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('debug', thisContext.value, component, message, array);
  }

  logger.trace = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isTraceEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('trace', thisContext.value, component, message, array);
  }

  logger.$$TRACE = function() {
    if (!Config.logWriter) return;
    if (!Config.logWriter.isTraceEnabled()) return;
    var array, message = util.format.apply(this, arguments);
    if (Config.logStackTraces) array = Array.prototype.slice.call(arguments);
    Config.log('trace', thisContext.value, component, message, array);
  }

  return logger;
}
