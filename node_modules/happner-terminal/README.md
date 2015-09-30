# happner-terminal

Terminal for happner (comes bundled).

Provides a prompt into your running mesh.

Not a remote prompt.

#### To activate

##### in the config:

```javascript
meshConfig = {
  ...
  components: {
    terminal: {},
    ...
    ...
  }   
  ...
}
```

##### in the mesh initialization:

```javascript

// start your meshnode
                                                 // good practice...
var happner = require('happner');               //
happner.start( require('./your/meshConfig.js').config )

.then(function(mesh) {

  // meshnode is up, start the terminal

  mesh.exchange.terminal.start({
    prefix: '> ',  // the prompt
    help: true    // show the intro help
  }, function optionalCallback() {}) // or .then... (promise)

})

.catch...

```


__Note__: By putting the terminal component first, other components running their startMethods can detect and use the terminal. eg. To install commands into it.


#### Typical startMethod installing a command into the terminal

This in some other mesh component:

```javascript
Module.prototype.start = function($happn, callback) {

  var terminal;

  if (terminal = $happn.exchange.terminal) {

    // terminal is present.

    terminal.register('hello', {
    
      // creates a 'hello' command available in the terminal

      description: 'example',

      help: '\n\n\n',

      run: function(args, callback) {

        // if you don't call the callback you dont het the prompt back, ever!
        // (and you'll need to kill the process from the outside)

        callback(null, '\nHello ' + args[0] + '.\n');
      },

      autoComplete(args, callback) {
        var possible = ['world', 
                        'solarsystem',
                        'galaxy',
                        'universe']; // use args to determine next possibilities
        callback(null, possible);
      }

    });

  }

  callback(null);

}
```


#### Some useful $ things available in terminal.

