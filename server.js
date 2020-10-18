// Joda JS Library https://js-joda.github.io/js-joda/manual/LocalDate.html 
// Running Node on Windows: https://github.com/coreybutler/node-windows

const cron = require('node-cron')
const bodyParser = require('body-parser')
const express = require('express')
const mongoose = require('mongoose')
const config = require('./config')
const { update } = require('./models/activity')
const app = express()



// Models
const activity = require('./models/activity')
const day = require('./models/day')
const session = require('./models/session')
const user = require('./models/user')
const { DateTimeException } = require('js-joda')

const url = config.mongo_url

mongoose.connect(url,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(client => {
    console.log('Connected to Database')
    const db = mongoose.connection
    const collection = db.collection('jamin')

    app.use(bodyParser.urlencoded({extended:true}))
    app.use(bodyParser.json())

    // Clear daily limit at 9PM every night
    cron.schedule('0 21 * * *', function() {
        console.info('wiping bonusLimits for the day');
        user.updateMany({bonusLimit:{$gt:0}},{bonusLimit:0}, (err, docs) => {
            if (err){
                console.info("Failed to clear user bonusLimits")
            } else {
                console.info("Updated bonusLimits")
                console.info(docs)
            }
        } )
        // Reset onBreak
        user.updateMany({onBreak: true},{onBreak: false}, (err, docs) => {
            if (err){
                console.info("Failed to update onBreak")
            } else {
                console.info("Updated onBreak")
                console.info(docs)
            }
        } )
        // Reset break.last
        user.updateMany({last:{$gt:0}},{last: 0}, (err, docs) => {
            if (err){
                console.info("Failed to update onBreak")
            } else {
                console.info("Updated onBreak")
                console.info(docs)
            }
        } )
    });


    app.listen(3000,function(){
        console.log("Listening on port 3000")
    })

    app.get("/test",(req,res) => {
        res.send("Yep")
    })

    app.post("/resetDailyStates",(req,res) => {
        console.info('wiping bonusLimits for the day');
        user.updateMany({bonusLimit:{$gt:0}},{bonusLimit:0}, (err, docs) => {
            if (err){
                console.info("Failed to clear user bonusLimits")
            } else {
                console.info("Updated bonusLimits")
                console.info(docs)
            }
        } )
        // Reset onBreak
        user.updateMany({onBreak: true},{onBreak: false}, (err, docs) => {
            if (err){
                console.info("Failed to update break.onBreak")
            } else {
                console.info("Updated break.onBreak")
                console.info(docs)
            }
        } )
        // Reset break.last
        user.updateMany({last:{$gt:0}},{last: 0}, (err, docs) => {
            if (err){
                console.info("Failed to update break.last")
            } else {
                console.info("Updated break.last")
                console.info(docs)
            }
        } )
        res.status(202).send("Reset daily states")
    })

    // Because no ISO to locale, so copy paste from stackExchange. But of course.
    function dateToISOLikeButLocal(date) {
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        const msLocal =  date.getTime() - offsetMs;
        const dateLocal = new Date(msLocal);
        const iso = dateLocal.toISOString();
        const isoLocal = iso.slice(0, 10);
        return isoLocal;
    }

    // Return total time for today
    app.get("/getToday/:name",(req,res) => {
        var name = req.params.name
        //
        // Get the user object associated with the current host. 
        //
        findUserQuery = user.findOne({"devices.user" : name})

        //
        // Get all the activities from today for that user
        //
        var today = new Date()
        todayQueryString = '^' + dateToISOLikeButLocal(today)

        var match = {user: name, timestamp: RegExp(todayQueryString)}
        var group = {_id: '$user', used: {$sum: '$usage'}}
        var pipeline = [{$match: match}, {$group: group}]
        // Make the call. 
        aggregateQuery = collection.aggregate(pipeline).toArray()

        // Wait for user and aggregate total. 
        Promise.all([findUserQuery,aggregateQuery]).then(values => {            
            // Get the total used time
            usedTime = values[1][0]['used']

            //
            // Get the total alotted time. This might not be populeted if the user is not registered,
            // if not, then we change the response logic to simply return how much time is spent, rather than left.
            //

            // User Exists
            if (values[0]){
                thisUser = values[0]
                let totalLimit = values[0].dailyLimit + values[0].bonusLimit

                console.debug("Device is associated with user, sending time left")
                console.debug("Queried: " + name + " | Response: " + values[0].name + " | Time used\\total: " + usedTime + "\\" + totalLimit)

                //
                // Handle breaks
                //
                if(thisUser.break.freeTime && thisUser.break.duration){
                    total = {state: "time left", total: totalLimit-usedTime}

                    // Next break is the last break timestamp + duration + freeTime
                    nextBreak = thisUser.break.last + thisUser.break.freeTime  + thisUser.break.duration

                    // Next free time is after the last break start and the freeTime
                    nextFreeTime = thisUser.break.last + thisUser.break.duration

                    onBreak = thisUser.break.onBreak
                    
                    console.debug("Break: now: " + Date.now() + " | nextBreak: " + nextBreak + " | nextFreeTime: " + nextFreeTime + " | onBreak: " + onBreak )

                    // First Break of the day, we expect break.last to be blank from the scheduled job. Ignores value of onBreak
                    if (thisUser.break.last === 0){
                        if (usedTime > thisUser.break.freeTime){
                            thisUser.break.last = Date.now()
                            onBreak = true
                        } 

                    // Handle returning from break. Currently on break.
                    } else if (Date.now() > nextFreeTime && onBreak === true){
                        onBreak = false

                    // Handle going on break after initial break. Currently on free time.
                    } else if (Date.now() > nextBreak && onBreak === false){
                        thisUser.break.last = Date.now()
                        onBreak = true
                    }
                    
                    if (onBreak){
                        // total = 0
                    }

                    thisUser.break.onBreak = onBreak
                    thisUser.save()                    

                } else {
                    console.info("No break configured")
                }

            // User does not exist
            } else {
                // Or just send current time total
                console.debug("Device is not associated with a user, sending time used")
                total = {state: "time used", total: usedTime}
            }

            console.info(total)
            res.send(total)
        }).catch(err =>{
            res.send(err)
        })
    })

    app.get("/getTodayDebug/:name",(req,res) => {
        var name = req.params.name
        var today = new Date().toISOString().slice(0, 10)
        todayQueryString = '^'+today
        var query = {user: name, timestamp: RegExp(todayQueryString)}
        //var query = {user: name}
        console.log(query)
        collection.find(query).toArray().then(results =>{
                res.send(results)
            }
        ).catch(err =>{
            res.send(err)
        })
    })

    // Get total time for specific date
    // Call should look like /getDate/username?date=Y-mm-dd
    app.get("/getDate/:name",(req,res) => {
        var name = req.params.name
        var date = req.query.date
        let total
        console.log(date)
        todayQueryString = '^'+date

        var match = {user: name, timestamp: RegExp(todayQueryString)}
        var group = {_id: '$user', total: {$sum: '$usage'}}
        var pipeline = [{$match: match}, {$group: group}]
        
        console.log(pipeline)
        collection.aggregate(pipeline).toArray().then(results =>{
            total = {total: results[0]['total']}
            console.log(total)
            res.send(total)
        }
        ).catch(err =>{
            res.send(err)
        })
        
    })

    // Get poll information for a user on a specific day
    // Call should look like /getDate/username?date=Y-mm-dd
    app.get("/getDateDebug/:name",(req,res) => {
        var name = req.params.name
        var date = req.query.date
        let total
        console.log(date)
        todayQueryString = '^'+date

        var query = {user: name, timestamp: RegExp(todayQueryString)}
        //var query = {user: name}
        console.log(query)
        collection.find(query).toArray().then(results =>{
                res.send(results)
            }
        ).catch(err =>{
            res.send(err)
        })
        
    })

    // Clear all polling data
    app.post('/clearAll',(req,res) => {
        collection.deleteMany({}).then( result =>{
            console.log('Deleted: ' + result.deletedCount + " items.")
            res.send('Deleted: ' + result.deletedCount + " items.")
        }).catch(error => {
            console.log(error)
            res.send(error)
        })
    })

    // Accept a poll from a client
    app.post('/poll', (req,res) => {
        console.log("Received request. Submitting to Mongo")
        collection.insertOne(req.body).then(result => {
            console.log('Logged activity: ')
            console.log(req.body)
            res.send()
        }).catch(error => {
            console.log(error)
        })
    })


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

    // Update a user
    app.patch('/user/:name', (req,res) =>{
        console.log(req.params.name)

        user.findOne({name: req.params.name}).then(doc => {
            console.debug("Retrieved user: " + req.params.name)
            console.debug(doc)

            if (req.body.dailyLimit || req.body.dailyLimit === 0 ) {
                doc.dailyLimit = req.body.dailyLimit
            }
            if (req.body.bonusLimit || req.body.bonusLimit === 0 ){
                doc.bonusLimit = req.body.bonusLimit
            }
            if (req.body.habiticaId){
                doc.habiticaId = req.body.habiticaId
            }
            if (req.body.devices){
                doc.devices = req.body.devices
            }
            if (req.body.break){
                doc.break = req.body.break
            }
    
            doc.save().then(doc => {
                console.debug("Updated user: " + req.params.name)
                console.debug(doc)
                res.status(201).send(doc)
            }).catch(err => {
                res.status(500).send("Error updating: " + err.message)
            })
        }).catch(err => {
            res.status(500).send("Error retrieving: " + err.message)
        })
    })



    
    // Get a user
    app.get('/user/:name', (req,res) => {
        user.findOne({name: req.params.name}).then(doc => {
            if (doc){
                res.status(200).send(doc)
            } else {
                res.status(404).send("User not found")
            }
        }).catch(err => {
            res.status(500).send("Error retrieving: " + err.message)
        })
    })

    // List all users
    app.get('/user',(req,res) => {
        user.find().then(doc => {
            if (doc){
                res.status(200).send(doc)
            } else {
                res.status(404).send("No users found")
            }
        }).catch(err => {
            res.status(500).send("Error retrieving: " + err.message)
        })
    })

    // Delete a user
    app.delete('/user/:name',(req,res) => {
        console.log(req.params.name)

        user.findOne({name: req.params.name}).then(doc => {
            console.debug("Retrieved user: " + req.params.name)
            console.debug(doc)
    
            doc.remove().then(() => {
                console.debug("Deleted user: " + req.params.name)
                console.debug(doc)
                res.status(201).send(doc)
            }).catch(err => {
                res.status(500).send("Error deleting: " + err.message)
            })
        }).catch(err => {
            res.status(500).send("Error retrieving: " + err.message)
        })
    })

    app.post('/scoreWebHook', (req,res) => {
        res.status(200).send("Hooked!")
        let reqHabiticaId = req.body.task.userId
        console.debug(reqHabiticaId)
        let taskType = req.body.task.type
        let taskName = req.body.task.text
        if (taskType === "reward" && taskName == "1 hour of screen time"){
            console.log("Increasing bonus time ")

            user.findOne({habiticaId: reqHabiticaId}).then(doc => {
                console.debug("Retrieved user: " + doc.name)
                console.debug(doc)

                doc.bonusLimit = doc.bonusLimit + 3600000
        
                doc.save().then(doc => {
                    console.debug("Updated user: " + doc.name)
                    console.debug(doc)
                    //res.status(201).send(doc)
                }).catch(err => {
                    console.error("Error updating: " + err.message)
                    //res.status(500).send("Error updating: " + err.message)
                })
            }).catch(err => {
                console.error("Error updating: " + err.message)
                //res.status(500).send("Error retrieving: " + err.message)
            })
        }
    })

    app.post('user/:name/devices', (req,res) => {
        req.send("Not implemented")
    })

    app.delete('user/:name/devices', (req,res) => {
        req.send("Not implemented")        
    })

}).catch(error => console.error(error))

