// https://github.com/coreybutler/node-windows

var Service = require('node-windows').Service;

var svc = new Service({
    name:"Jamin TimeServer!",
    script: require('path').join(__dirname,'server.js')
});

svc.on('uninstall',function(){
    console.log('Uninstall complete.');
    console.log('The service exists: ',svc.exists);
});

svc.uninstall();