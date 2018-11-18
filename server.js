///Browser support for Chrome 43+, 
// Firefox 42+, Safari 10+, Edge and IE 10+.
var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(8080, function(){
    console.log('Server running on 8080...');
});