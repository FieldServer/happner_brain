[![Build Status](https://travis-ci.org/happner/happn-logger.svg?branch=master)](https://travis-ci.org/happner/happn-logger)

# happn-logger

`npm install happn-logger --save`

Logger using log4js.

One instance of the logger is shared processwide. (global)

## Usage

With context and component.

```javascript
var Logger = require('happn-logger');
var context = Logger.createContext('ContextName');
var log = context.createLogger('ComponentName');

log.info('message');
// [ INFO] - 1ms    ContextName (ComponentName) message

// log can create a new component logger in the same context
var log2 = log.createLogger('AnotherComponent');

```

With component only.

```javascript
var Logger = require('happn-logger');
var log = Logger.createLogger('ComponentName');

log.info('message');
// [ INFO] - 1ms    (ComponentName) message
```

Creating log functions on existing object.

```javascript
var Logger = require('happn-logger');

var thing = new Thing();
Logger.createLogger('thing', thing);

thing.info('message');
// [ INFO] - 1ms    (thing) message
```

### Context

The context of the logger can be modified. The change is applied to all loggers in that context.

```javascript
var Logger = require('happn-logger');
var logContext = Logger.createContext('ContextName');
var log1 = logContext.createLogger('ComponentName1');
var log2 = logContext.createLogger('ComponentName2');

log1.info('message');
log2.info('message');
// [ INFO] - 0ms    ContextName (ComponentName1) message
// [ INFO] - 0ms    ContextName (ComponentName2) message

logContext.context = 'Renamed';
log1.info('message');
log2.info('message');
// [ INFO] - 0ms    Renamed (ComponentName1) message
// [ INFO] - 0ms    Renamed (ComponentName2) message
```

The context can be renamed from any one of the loggers and it will apply to all in the context.

```javascript
log1.context('RenamedAgain');

log1.info('message');
log2.info('message');
// [ INFO] - 0ms    RenamedAgain (ComponentName1) message
// [ INFO] - 0ms    RenamedAgain (ComponentName2) message
```

### Format string

When logging it is best not to pre-assemble the string to be logged because the cost of doing so is incurred even when the level being logged-to is not enabled.

eg. `log.debug('number: ' + theNumber);`

Instead, use a format string in the first argument. The logger will perform the string assembly internally __only if the log level is enabled__.

eg. `log.debug('number: %d, string: %s, json: %j', theNumber, theString, theObject);`

### Levels

```javascript
log.fatal('message');
log.error('message');
log.warn('message');
log.info('message');
log.debug('message');
log.trace('message');

log.log('message'); // goes to debug
```

Debug and trace messages can also be logged as follows

```javascript
log.$$DEBUG('message');
log.$$TRACE('message');
```

This allows for confident matchability to enable substituting all debug and trace calls out of production deployments. 

### Configuration

__It is important. The configure() must be called at least once.__

Shown with default values below.

```javascript
var Logger = require('happn-logger');

Logger.configure({
  logCacheSize: 50,
  logLevel: 'info',
  logTimeDelta: true,
  logStackTraces: true,
  logComponents: [],
  logMessageDelimiter: '\t',
  logDateFormat: null,
  logLayout: null,
  logFile: null,
  logFileMaxSize: 20480,
  logFileBackups: 10,
  logFileNameAbsolute: true,
  logger: null
});
```

#### logCacheSize

An array of recent log event messages is kept in `Logger.cache`. This specifies the size of that array.

Environment variable __LOG_CACHE_SIZE__ overrides.

eg. `LOG_CACHE_SIZE=5000 node myServer.js`

#### logLevel

off, fatal, error, warn, info, debug, trace, all

Environment variable __LOG_LEVEL__ overrides.

eg. `LOG_LEVEL=off node myServer.js`

#### logTimeDelta

Log the number of milliseconds since the previous log message.

#### logStackTraces

If the last argument to the logger is an error, log the stack trace in a second message.

#### logComponents

An array of log component names. Filters out all info, debug and trace messages from all component not in the list.

Environment variable __LOG_COMPONENTS__ overrides.

eg. `LOG_COMPONENTS=component1,component2 node myServer.js`

#### logMessageDelimiter

The delimiter appears between the timeDelta and the message.

#### logDateFormat

By default no date appears in the log to console. However, dates are looged when the console is redirected (piped) to file. By specifying this format dates also be written to console.

eg. `'yyyy-MM-dd hh:mm:ss.SSS'`

#### logLayout

This allows for specifying of the full log line layout. 

eg.
```javascript
  ...
  logLayout: {
    type: 'pattern',
    pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%[%5.5p%]] - %m'
  },
  ...
```

#### logFile

If specified - the logger logs to file and console. 

__Note: Using the file logger will in most cases fail to capture a logged fatal event that brought your server down. The file write is asynchronous and the exiting process does not wait. The log from console redirected to file will include the error because console writes are synchronous.__

#### logFileMaxSize, logFileBackups

Limit disk resources used by log file. This specifies how big the log file is allowed to get before 'archiving' it, and how many archive backups should be kept.

It creates `.log` (the current log), `.log.1` (the previous log), `.log.2` (older), etc

#### logFileLayout

Same as logLayout above - but for the logFile not the console.

#### logFileNameAbsolute

Specifies if the specified logFile is an "absolute" filename. Don't know why it matters. It's a log4js parameter.

#### logger

Enables passing in a full log4js config. All log4js config fragments from the preceding list are ignored in favour of this full config.

eg.
```javascript
  ...
  logger: {
    appenders: [
      {
        type: "console",
        layout: {
          type: 'pattern',
          pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%[%5.5p%]] - %m'
        }
      }
    ]
  },
  ...
```


### Events

The logger emits an event before and after each log message. This enables console applications, terminals and similar to prepare for and/or recover from the logger performing a console write.

eg.
```javascript

Logger.emitter.on('before', function() {
  // Runs immediately before every log write.
});

Logger.emitter.on('after', function() {
  // Runs immediately after every log write.
});

```

