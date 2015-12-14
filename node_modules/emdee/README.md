# emdee

Inline README's for repl goodness.

`npm install emdee --save`


#### Create a README in source.

```javascript

var obj = {};

obj.README = function() {/*
    <br/>
    ## Sneaky way to do free text accessable in source

    You'll **notice** this is *markdown*

    [can't click](http://in/the/console/tho...)

*/}

// Run emdee conversion.

var emdee = require('emdee');

emdee(obj, {
  paths: [
    'README'
    // 'nested/deeper/README',
    // 'myObjectInstance/myFunction' // use with suffix
  ],
  // suffix: '.README'
});

```

The `obj.README` function has now been converted to a property and will 
render the markdown to console upon accessing.

```javascript

repl> obj.README

```

#### Options:

__Paths__

* Array of object paths. Each should point directly to a readme function as outlined above.

__Suffix__

* Creates `path/to/function.README' if `suffix = '.README'` (nests with first .)
* The suffix, if present, applies to all paths.
* __Note that although the suffix supports nesting a readme onto a function, the parser that converts the function into a readme assumes the function is always exactly like this:

```javascript
function() {/*

    ### readme body

    In other words, a much cleverer parser needs to be made.

    One that can pick out the comments from among the code.

    And other stuff.

    This is a rabbit hole.

    Make magic...

    p.s. The parser is exported, you can change it before calling emdee()

    p.s. If this leads you to making something awesome, please let me know, 
         i might like to use it.


    ### why does it use '/' instead of '.' as the path delimiter?

    It's a hint://

*/}
```