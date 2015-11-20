var repl = require('repl');
var history = require('repl.history');
var fs = require('fs-extra');
var path = require('path');

var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var historyFile = path.normalize(home + '/.happner/repl_history');

/* var help = function() {


  Start REPL to gain access to local MeshNode in process.


} */

var doneReadme = false;

module.exports = function(opts, callback) {

  var canHistory = true;

  try {
    fs.ensureDirSync(path.dirname(historyFile));
  } catch(e) {
    opts.$happn.log.warn('no read/write at ' + historyFile);
    opts.$happn.log.info('continuing without history');
    canHistory = false;
  }

  callback(null, {

    description: 'Start REPL on local process.',

    // help: ((help = help.toString().split('\n')).slice(1,help.length-1)).join('\n'),

    run: function(args, done) {

      if (opts.help) {
        console.log('\n');
        console.log('  To see the inline readme');
        console.log('  ------------------------');
        console.log();
        console.log('  __node> README   <return>');
        console.log();
        console.log();
      }
      opts.prompt.clearListener();
      opts.prompt.node = true;

      var r = repl.start({

        prompt: "__node> ",
        input: process.stdin,
        output: process.stdout,
        useGlobal: true,
        ignoreUndefined: true,

      }).on('exit', function() {

        opts.prompt.setStreams(process.stdin, console._stdout, true, false, false);
        process.stdin.resume();
        opts.prompt.node = false;
        done();

      });

      r.context.README = function() {/*
        <br/>
        ## Welcome to your Happner Terminal

        From here you can gain console access into your running system.
        
        You can store and retrieve data in the **Data Layer**, publish 
        and subscribe to events with the **Event Api** and call methods 
        both local and remote on the **Exchange Api**.

        All access is via the **$happn** variable.

            $happn.README
            (pending) $happn.data.README
            (pending) $happn.event.README
            (pending) $happn.exchange.README
        

        Also included is a set of utilities that alleviate the pains of
        accessing asyncronous functions from the console.

            (pending) $callback.README
            (pending) $collect.README
            (pending) $promise.README


        Tip: You can use TAB to autocomplete commands as you type them.

      */}

      try {
        r.context.Happner = require('../../../../');
      } catch (e) {}

      r.context.$happn = opts.$happn;

      if (canHistory) history(r, historyFile);
      
      var stack = [];
      var tags = {};

      r.context.$callback = function CallbackStub(err, res) {
        var tag = 'last';

        var callback = function(err, res) {
          var result = {tag:tag,err:err,res:res};
          stack.push(result);
          tags[tag] = result;
          r.context.$callback.err = err;
          r.context.$callback.res = res;

          if (err) {
            console.log('ERROR:\n' + (err.stack || err.toString()) + '\n');
            return;
          }
          console.log('RESULT:\n' + JSON.stringify(res, null, 2) + '\n');
        }

        if (typeof err == 'string') {
          // hope there are no more throwings of 'string'...
          tag = err;
          return callback;
        }
          
        callback(err, res);
      }

      r.context.$callback.______ = 'run $callback.README()'

      r.context.$callback.README = function() {/*

        ## heading

      */}

      r.context.$callback.err = null;
      r.context.$callback.res = null;

      Object.defineProperty(r.context.$callback, 'stack', {
        get: function() {
          return stack;
        },
        enumerable: true
      });

      Object.defineProperty(r.context.$callback, 'tags', {
        get: function() {
          return tags;
        },
        enumerable: true
      });

      if (doneReadme) return;

      try {
        opts.emdee(r.context, {
          paths: [
            'README',
            '$happn/README'
          ]
        });
      } catch (e) {}

      doneReadme = true;

    }
  });
}
