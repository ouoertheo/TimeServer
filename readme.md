# TimeServer

Simple server to track my kid's screen time. 

## Installation

Prerequisites: Node.JS, node-windows (install global)

1. Create a MongoDB url in config.js file and add `config.mongo_url = '';`
2. Run `npm install` in script directory
3. Run `npm link node-windows` then `node-windows-install.js` to configure as a Service for Windows.