var should = require('chai').should();
var fs = require('fs');
var Logger;

describe('Logger', function() {

  beforeEach(function() {
    delete global['happn-logger'];
    delete require.cache[require.resolve('../lib/logger')];
    delete require.cache[require.resolve('../')];
    delete require.cache[require.resolve('log4js')];
    Logger = require('../');
    this.origNow = Date.now;
  });

  afterEach(function() {
    Date.now = this.origNow;
    try {
      fs.unlinkSync('file.log');
    } catch (e) {}
  });

  context('configuration', function() {

    it('sets the configured flag', function() {
      Logger.configured.should.equal(false);
      Logger.configure();
      Logger.configured.should.equal(true);
    });

    it('defaults config', function() {
      Logger.configure();
      Logger.config.should.eql({
        logCacheSize: 50,
        logComponents: [],
        logLevel: 'info',
        logMessageDelimiter: '\t',
        logStackTraces: true,
        logTimeDelta: true,
        logDateFormat: null,
        logLayout: {
          pattern: '[%[%5.5p%]] - %m',
          type: 'pattern'
        },
        logFile: null,
        logFileLayout: null,
        logFileBackups: 10,
        logFileMaxSize: 20480,
        logFileNameAbsolute: true,
        logWriter: Logger.config.logWriter, // dodge object
        logger: {
          appenders: [{
            layout: {
              pattern: '[%[%5.5p%]] - %m',
              type: 'pattern'
            },
            makers: Logger.config.logger.appenders[0].makers, // dodge object
            type: 'console'
          }]
        },
        log: Logger.config.log // dodge function
      })
    });

  });

  context('log functions', function(){

    it('defines a function to emit a log message at each level', function() {
      Logger.configure();
      var log = Logger.createLogger();
      log.fatal   .should.be.an.instanceof(Function);
      log.error   .should.be.an.instanceof(Function);
      log.warn    .should.be.an.instanceof(Function);
      log.info    .should.be.an.instanceof(Function);
      log.debug   .should.be.an.instanceof(Function);
      log.$$DEBUG .should.be.an.instanceof(Function);
      log.trace   .should.be.an.instanceof(Function);
      log.$$TRACE .should.be.an.instanceof(Function);
    });

    it('calls the log function', function(done) {
      Logger.configure();
      log = Logger.createLogger();
      Logger.config.log = function() {
        done();
      };
      log.info('message');
    });

    it('tests of level is enabled before logging', function(done) {
      Logger.configure();
      var called = false;
      var log = Logger.createLogger();
      
      Logger.config.logWriter.isInfoEnabled = done;
      log.info('message');
    });

    it('formats the log text from multiple arguments', function(done) {
      Logger.configure();
      Logger.config.log = function(level, context, component, message) {
        message.should.equal('string: STRING, number NUMBER, json {"json":"data"}');
        done();
      }
      var log = Logger.createLogger();
      log.info('string: %s, number %s, json %j', 'STRING', 'NUMBER', {json: 'data'});
    });

    it('includes the array of log arguments in log call if logStackTraces is enabled', function(done) {
      Logger.configure({
        logStackTraces: true,
      });
      Logger.config.log =  function(level, context, component, message, array) {
        array.should.eql([
          'string: %s, number %s, json %j',
          'STRING',
          'NUMBER',
          {json: 'data'}
        ]);
        done();
      }
      var log = Logger.createLogger();
      log.info('string: %s, number %s, json %j', 'STRING', 'NUMBER', {json: 'data'});
    });

    it('default log to debug', function() {
      Logger.configure();
      var log = Logger.createLogger();
      Logger.config.log = function(level) {
        level.should.equal('debug');
        done();
      }
      log('message');
    });

    it('can build log functions onto an object', function() {
      var obj = {};
      Logger.configure()
      Logger.createLogger('component', obj);
      obj.fatal   .should.be.an.instanceof(Function);
      obj.error   .should.be.an.instanceof(Function);
      obj.warn    .should.be.an.instanceof(Function);
      obj.info    .should.be.an.instanceof(Function);
      obj.debug   .should.be.an.instanceof(Function);
      obj.$$DEBUG .should.be.an.instanceof(Function);
      obj.trace   .should.be.an.instanceof(Function);
      obj.$$TRACE .should.be.an.instanceof(Function);
    });

  });

  context('logging to console', function() {

    it('logs to console by default', function() {
      Logger.configure({logLevel: 'info'});
      var log = Logger.createLogger('component');
      log.info('XXXXX');
    });

  });

  context('logging to file', function() {

    it('logs to file if a filename is specified', function(done) {
      try {
        fs.unlinkSync('file.log');
      } catch (e) {}
      Logger.configure({
        logFile: 'file.log'
      });
      var log = Logger.createLogger('component');
      log.info('xxxxx');
      setTimeout(function() {
        var logged = fs.readFileSync('file.log').toString();
        logged.should.match(/\(component\) xxxxx/);
        fs.unlinkSync('file.log');
        done();
      }, 100);
    });

    it('can includes a stack trace if enabled and the last arg is an error', function(done) {
      try {
        fs.unlinkSync('file.log');
      } catch (e) {}
      Logger.configure({
        logFile: 'file.log'
      });
      var log = Logger.createLogger('component');
      log.info('xxxxx', new Error('Something'));
      setTimeout(function() {
        var logged = fs.readFileSync('file.log').toString();
        logged.should.match(/ \[ INFO\] - Error: Something/);
        fs.unlinkSync('file.log');
        done();
      }, 100);
    });

  });

  context('context', function() {

    it('can change the context', function(done) {

      Logger.configure({
        logFile: 'file.log',
        logFileLayout: {
          type: 'pattern',
          pattern: '%m'
        },
        logTimeDelta: false,
        logMessageDelimiter: ' '

      });

      var context = Logger.createContext();

      var log1 = context.createLogger('component1');
      var log2 = context.createLogger('component2');

      var log3 = log1.createLogger('component3');

      log1.info('message 1');
      log2.info('message 2');
      log3.info('message 3');
      
      context.context = 'xxx';

      log1.info('message 1');
      log2.info('message 2');
      log3.info('message 3');

      log2.context = 'yyy';

      log1.info('message 1');
      log2.info('message 2');
      log3.info('message 3');

      setTimeout(function() {
        var logged = fs.readFileSync('file.log').toString();
        logged.should.equal('(component1) message 1\n(component2) message 2\n(component3) message 3\nxxx (component1) message 1\nxxx (component2) message 2\nxxx (component3) message 3\nyyy (component1) message 1\nyyy (component2) message 2\nyyy (component3) message 3\n');
        fs.unlinkSync('file.log');
        done();
      }, 100);

    });

  });

  context('emitter', function() {

    it('emits an event before writing to log', function() {
      var befores = 0;
      Logger.emitter.on('before', function() {
        befores++;
      });
      Logger.configure({logLevel: 'info'});
      var log = Logger.createLogger();

      befores.should.equal(0);
      log.trace('xxx');
      befores.should.equal(0);
      log.debug('xxx');
      befores.should.equal(0);
      log.info('xxx');
      befores.should.equal(1);
      log.warn('xxx');
      befores.should.equal(2);
      log.error('xxx');
      befores.should.equal(3);
      log.fatal('xxx');
      befores.should.equal(4);
    });

    it('emits an event after writing to log', function() {
      var afters = 0;
      Logger.emitter.on('after', function() {
        afters++;
      });
      Logger.configure({logLevel: 'info'});
      var log = Logger.createLogger();

      afters.should.equal(0);
      log.trace('xxx');
      afters.should.equal(0);
      log.debug('xxx');
      afters.should.equal(0);
      log.info('xxx');
      afters.should.equal(1);
      log.warn('xxx');
      afters.should.equal(2);
      log.error('xxx');
      afters.should.equal(3);
      log.fatal('xxx');
      afters.should.equal(4);
    });

  });

  context('cache', function() {

    it('enables access to array of recent log messages', function() {
      Logger.configure({
        logCacheSize: 5,
        logLevel: 'all'
      });
      var count = 0;
      Date.now = function() {return count++}

      var log = Logger.createLogger();
      log.trace('A');
      log.debug('B');
      log.info('C');
      log.warn('D');
      log.error('E');
      log.fatal('F');

      Logger.cache.should.eql([
        {
          context: undefined,
          component: undefined,
          level: 'fatal',
          message: 'F',
          timestamp: 5,
          timedelta: 1,
        },
        {
          context: undefined,
          component: undefined,
          level: 'error',
          message: 'E',
          timestamp: 4,
          timedelta: 1,
        },
        {
          context: undefined,
          component: undefined,
          level: 'warn',
          message: 'D',
          timestamp: 3,
          timedelta: 1,
        },
        {
          context: undefined,
          component: undefined,
          level: 'info',
          message: 'C',
          timestamp: 2,
          timedelta: 1,
        },
        {
          context: undefined,
          component: undefined,
          level: 'debug',
          message: 'B',
          timestamp: 1,
          timedelta: 1,
        },
        
      ])

    });

  });

  context('component filter', function() {

    it('can filter to log only specified components', function(done) {
      try {
        fs.unlinkSync('file.log');
      } catch (e) {}
      Logger.configure({
        logFile: 'file.log',
        logComponents: ['component1', 'component4']
      });


      var component1 = Logger.createLogger('component1');
      var component2 = Logger.createLogger('component2');
      var component3 = Logger.createLogger('component3');
      
      component1.info('aaaaa');
      component2.info('bbbbb');
      component3.info('ccccc');

      setTimeout(function() {
        var logged = fs.readFileSync('file.log').toString();
        logged.should.match(/\(component1\) aaaaa/);
        logged.should.not.match(/\(component2\) bbbbb/);
        logged.should.not.match(/\(component3\) ccccc/);
        fs.unlinkSync('file.log');
        done();
      }, 100);
    });

    it('logs fatal, error and warn from even if filtered out', function(done) {
      try {
        fs.unlinkSync('file.log');
      } catch (e) {}
      Logger.configure({
        logFile: 'file.log',
        logComponents: ['component1']
      });

      var component1 = Logger.createLogger('component1');
      var component2 = Logger.createLogger('component2');
      var component3 = Logger.createLogger('component3');
      var component4 = Logger.createLogger('component4');
      
      component2.fatal('aaaaa');
      component3.error('bbbbb');
      component4.warn('ccccc');

      setTimeout(function() {
        var logged = fs.readFileSync('file.log').toString();
        logged.should.match(/\(component2\) aaaaa/);
        logged.should.match(/\(component3\) bbbbb/);
        logged.should.match(/\(component4\) ccccc/);
        fs.unlinkSync('file.log');
        done();
      }, 100);
    });

  });

  context('logger subconfig', function() {

    it('allows for entirely externally defined log4js config', function(done) {
      Logger.configure({
        logMessageDelimiter: ' ',
        logTimeDelta: false,
        logger: {
          appenders: [{
            type: 'file',
            filename: 'file.log',
            layout: {
              type: 'pattern',
              pattern: '--- %m ---'
            }
          }]
        }
      });

      var log = Logger.createLogger();
      log.info('XXX');

      setTimeout(function() {
        var logged = fs.readFileSync('file.log').toString();
        logged.should.equal('--- XXX ---\n');
        fs.unlinkSync('file.log');
        done();
      }, 100);


    });

  });

});
