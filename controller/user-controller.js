
// Express
const app = require('../app');

// Service
// const userService = require('../service/user-service');


// Create a user
app.post('/user', (req,res) => {
    let thisUser = new user({
        name: req.body.name,
        dailyLimit: req.body.dailyLimit,
        bonusLimit: req.body.bonusLimit,
        break: req.body.break,
        devices: req.body.devices,
        habiticaId: req.body.habiticaId       
    })
    
    thisUser.save().then(doc => {
        res.status(201).send(doc)
    }).catch(err => {
        res.status(500).send(err.message)
    })
})