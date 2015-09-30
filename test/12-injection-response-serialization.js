// Object.keys(require.cache).forEach(function(key) {
//   delete require.cache[key]
// });

var sep = require('path').sep;
var libFolder = __dirname + sep + 'lib' + sep;
var maximumPings = 1000;
var libFolder ;

describe('Bounces a message between two components, demonstrates how the events layer works', function(done) {
///events/testComponent2Component/component1/maximum-pings-reached
///events/testComponent2Component/component1/maximum-pings-reached

  require('./lib/0-hooks')();

  var config = {
    name:"testInjectionResponse",
    dataLayer: {
      authTokenSecret: 'a256a2fd43bf441483c5177fc85fd9d3',
      systemSecret: 'mesh',
      log_level: 'info|error|warning',
      //setOptions:{}
    },
    endpoints: {},
    modules: {
      "module1":{
        path:libFolder + "12-module1",
        construct:{
          type:"sync",
          parameters:[
            {value:{maximumPings:maximumPings}}
          ]
        }
      }
    },
    components: {
      "component1": {
        moduleName:"module1"
      }
    }
  };

  var mesh;

  it('starts the mesh, listens for the ping pong completed event, that module1 emits', function(done) {
    
    mesh = this.Mesh();

    this.timeout(15000);

    var onEventRef;

    mesh.initialize(config, function(err) {

      if (err) {
        console.log(err.stack);
        done(err);
      }else{
        mesh.exchange.component1.exposedMethod('a message', function(e, response){
          setTimeout(function(){
            done();
          }, 12000);
        });
      }
    });
  });
});









