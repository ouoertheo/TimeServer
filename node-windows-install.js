// https://github.com/coreybutler/node-windows

var Service = require('node-windows').Service;

var svc = new Service({
    name:'Jamin TimeServer',
    description: 'Runs Node.js server to receive API calls from TimeServerClient',
    script: require('path').join(__dirname,'server.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
});

svc.on('install',function(){
    svc.start();
});

svc.install();
