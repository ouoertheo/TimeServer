const mongoose = require('mongoose');

async function createUser(userModel){
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
}