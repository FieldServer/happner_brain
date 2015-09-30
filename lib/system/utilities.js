var EventEmitter = require('events').EventEmitter;
var shortId = require('shortid');
var util = require('util');
var levels = ['trace','debug','info','warn','error','fatal'];
var guard = {
  trace: 'isTraceEnabled',
  debug: 'isDebugEnabled',
  info: 'isInfoEnabled',
  warn: 'isWarnEnabled',
  error: 'isErrorEnabled',
  fatal: 'isFatalEnabled',
};

module.exports = function (config) {
  return new Util(config);
}

function Util(config) {

  var emitter = new EventEmitter();
  var _this = this;
  _this.node = util;
  _this.components = {};   // what is this?

  var log4js = require('log4js');
  var logLayout, fileAppender;

  config = config || {};

  if (!config.logger) {

    if (config.logDateFormat && !config.logLayout) {
      // assemble default layout with date format
      config.logLayout = {
        type: 'pattern',
        pattern: '%d{'+config.logDateFormat+'} [%5.5p] - %m'
      };
    } 

    if (process.stdout.isTTY) {
      // to console, no date in log
      logLayout = logLayout || config.logLayout || {
        type: 'pattern',
        pattern: '[%[%5.5p%]] - %m'
      };
    }
    
    else {
      // piped to file, display date, no colour
      config.logDateFormat = config.logDateFormat || 'yyyy-MM-dd hh:mm:ss';
      logLayout = logLayout || config.logLayout || {
        type: 'pattern',
        pattern: '%d{'+config.logDateFormat+'} [%5.5p] - %m'
      };
    }

    config.logger = config.logger || {
      appenders: [{
        type: "console",
        layout: typeof logLayout == 'object' ? logLayout : {
          type: 'pattern',
          pattern: logLayout
        }
      }]
    };

    if (config.logFile) {
      config.logger.appenders.push(fileAppender = {
        "type": "file",
        "absolute": true,
        "filename": config.logFile,
        "maxLogSize": 20480,
        "backups": 10,
      });
      if (config.logLayout) {
        fileAppender.layout = typeof logLayout == 'object' ? logLayout : {
          type: 'pattern',
          pattern: config.logLayout
        };
      }
    }
  }

  config.logCache = 50;
  config.logLevel = process.env.LOG_LEVEL || config.logLevel || 'info';
  config.logTimeDelta = (typeof config.logTimeDelta == 'boolean') ? config.logTimeDelta : true;
  config.logStackTraces = config.logStackTraces;
  config.logComponents = process.env.LOG_COMPONENTS ? process.env.LOG_COMPONENTS.split(',') : config.logComponents || [];
  config.logMessageDelimiter = config.logMessageDelimiter || '\t';

  // if (['all', 'trace', 'debug'].indexOf(config.logLevel) > -1) {
  //   config.logTimeDelta = true;
  // }

  if (config.logger.appenders) {
    log4js.configure(config.logger);
    _this.logger = log4js.getLogger();
    _this.logger.setLevel(config.logLevel);
  }

  _this.logCache = [];
  _this.log = function(message, level, component, data, context){

    if (!_this.logger) return;
    if (config.logComponents.length > 0 &&
        config.logComponents.indexOf(component) < 0) return;

    var now, delim;

    try {

      level = level || 'info';

      if (_this.logger[guard[level]]()) {

        message = message || '';
        component = component || '';

        var originalMessage = message.toString();
        var originalComponent = component.toString();

        delim = config.logMessageDelimiter;

        emitter.emit('before');

        if (config.logTimeDelta) {
          message = ((now = Date.now()) - (_this.previous || now)) + 'ms' + delim + context + ' (' + component + ') ' + message;
          _this.previous = now;
        }
        else {
          message = context + ' (' + component + ') ' + message;
        }

        _this.logger[level](message);

        if (data) {
          if (data.stack && config.logStackTraces) {
            _this.logger[level](data.stack);
            return;
          }
          _this.logger[level](data);
        }

        while (_this.logCache.length > config.logCache)
          _this.logCache.pop();

        _this.logCache.unshift({timestamp:new Date(), "message":originalMessage, "component":originalComponent, "level":level});
        
        // used by the console to rewrite the prompt after a log message
        emitter.emit('after');

      }
    } catch(e) {
      console.warn('logger failed! But here is the message anyways:');
      console.warn(message);
      console.warn(level);
      console.warn(e);
    }
  }

  _this.log.on = function(event, fn) {
    emitter.on(event, fn);
  }

  _this.createContext = function(context) {
    var createLogger;  
    return {
      createLogger: createLogger = function(component, obj) {

        obj = obj || function Debug(message, data) {
          obj.$$DEBUG(message, data);
        };

        levels.forEach(function (level) {
          var on = guard[level];
          if (level == 'trace') {
            obj.$$TRACE = function(message, data) {
              if (!_this.logger) return;
              if (!_this.logger[on]()) return;
              if (config.logComponents.length > 0) { // can optimize with hash
                if (config.logComponents.indexOf(component.split('/')[0]) < 0) return;
              }
              var args = Array.prototype.slice.call(arguments);              
              if (args[args.length - 1] instanceof Error) {
                data = args.pop();
              } else {
                data = null;
              }
              message = util.format.apply(util, args);
              _this.log(message, level, component, data, context);
            }
            Object.defineProperty(obj.$$TRACE, '$happner', {value: {ignore: true}});
          }
          else if (level == 'debug') {
            obj.$$DEBUG = function(message, data) {
              if (!_this.logger) return;
              if (!_this.logger[on]()) return;
              if (config.logComponents.length > 0) {
                if (config.logComponents.indexOf(component.split('/')[0]) < 0) return;
              }
              var args = Array.prototype.slice.call(arguments);              
              if (args[args.length - 1] instanceof Error) {
                data = args.pop();
              } else {
                data = null;
              }
              message = util.format.apply(util, args);
              _this.log(message, level, component, data, context);
            }
            Object.defineProperty(obj.$$DEBUG, '$happner', {value: {ignore: true}});
          }
          else {
            obj[level] = function(message, data) {
              if (!_this.logger) return;
              if (!_this.logger[on]()) return;
              var args = Array.prototype.slice.call(arguments);              
              if (args[args.length - 1] instanceof Error) {
                data = args.pop();
              } else {
                data = null;
              }
              message = util.format.apply(util, args);
              _this.log(message, level, component, data, context);
            }
            Object.defineProperty(obj[level], '$happner', {value: {ignore: true}});
          }
        });
        obj.createLogger = createLogger;
        return obj;
      }
    }
  }

  _this.generateID = function(){
    return shortId.generate();
  }

  _this.getFunctionParameters = function(fn){
    var args = [];
    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /^\s*(_?)(.+?)\1\s*$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    if (typeof fn == 'function') {
      fnText = fn.toString().replace(STRIP_COMMENTS, '');
      argDecl = fnText.match(FN_ARGS);
      argDecl[1].split(FN_ARG_SPLIT).map(function(arg) {
        arg.replace(FN_ARG, function(all, underscore, name) {
          args.push(name);
        });
      });
      return args;
    } else return null;
  };
}