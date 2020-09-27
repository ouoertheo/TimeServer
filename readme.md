# TimeServer

Simple server to track my kid's screen time. 

## Installation

Prerequisites: Node.JS, node-windows (install global)

1. Create a MongoDB url in config.js file and add `config.mongo_url = '';`
2. Run `npm install` in script directory
3. Run `npm link node-windows` then `node-windows-install.js` to configure as a Service for Windows.


## API Commands

* POST `/poll/:name` - the polling endpoint for the Windows client
* GET `/user` - list all users
* GET `/user/:name` - get the single user
* POST `/user/:name` - Create a new user
* PATCH `/user/:name` - Modify a user. 
* DELETE `/user/:name` - Remove a user
* POST `/user/:name/devices` - Add a device to a user
* DELETE `/user/:name/devices` - Remove a device from a user


User model:
```{
    name: the users name
    dailyLimit: limit in ms
    bonusLimit: bonus limit in ms (updated from habitica)
    devices: [
        {
            name: String,
            user: String,
            limit: Number
        }
    ],
    habiticaId: "habitica userId"
}```