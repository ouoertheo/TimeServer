// Joda JS Library https://js-joda.github.io/js-joda/manual/LocalDate.html 
// Running Node on Windows: https://github.com/coreybutler/node-windows


// Node
const cron = require('node-cron')
const mongoose = require('mongoose')

// Express
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

// Models
const activity = require('./models/activity')
const day = require('./models/day')
const session = require('./models/session')
const user = require('./models/user')

// Internal
const config = require('./config')
const service = require('./service')

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
        // Reset breaks
        user.updateMany({$set: {'break.lastFreeDuration': 0, 'break.lastBreakTime': 0, "break.onBreak": false}}, (err, docs) => {
            if (err){
                console.info("Failed to update breaks")
            } else {
                console.info("Updated breaks")
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
        user.updateMany({$set: {'break.lastFreeDuration': 0, 'break.lastBreakTime': 0, "break.onBreak": false,'bonusLimit':0}}, (err, docs) => {
            if (err){
                console.info("Failed to update breaks: " + err)
            } else {
                console.info("Updated breaks")
                console.info(docs)
            }
        })
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
        startOfDay = new Date(new Date().setHours(0,0,0,0))
        endOfDay = new Date(new Date().setHours(23,59,59,999))


        var match = {user: name, timestamp: {'$gte': startOfDay, '$lte':endOfDay}}
        var group = {_id: '$user', used: {$sum: '$usage'}}
        var pipeline2 = [{$match: match}, {$group: group}]

        // Make the call. 
        aggregateQueryNew = activity.aggregate(pipeline2)

        // Wait for user and aggregate total. 
        Promise.all([findUserQuery,aggregateQueryNew]).then(values => {            
            // Get the total used time
            usedTime = values[1][0]['used']

            // Set initial response to client
            responseJson = {
                state: "N/A", 
                total: 0, 
                nextBreak: -1, 
                nextFreeTime: -1,
                breakTimeLeft: -1,
                freeTimeLeft: -1,
                onBreak: false
            }

            //
            // Get the total alotted time. This might not be populeted if the user is not registered,
            // if not, then we change the response logic to simply return how much time is spent, rather than left.
            // Oh yeah, also added break logic here. 
            //

            // User Exists
            if (values[0]){
                responseJson.state = "time left"
                thisUser = values[0]
                let totalLimit = thisUser.dailyLimit + thisUser.bonusLimit
                responseJson.total = totalLimit - usedTime

                console.debug("Device is associated with user, sending time left")
                console.debug("Queried: " + name + " | Response: " + values[0].name + " | Time used\\total: " + usedTime + "\\" + totalLimit)

                //
                // Handle breaks
                //
                if(thisUser.break.freeDuration && thisUser.break.breakDuration){

                    nextBreak = thisUser.break.lastFreeDuration + thisUser.break.freeDuration
                    nextFreeTime = thisUser.break.lastBreakTime + thisUser.break.breakDuration

                    onBreak = thisUser.break.onBreak
                    
                    // First Break of the day, we expect break.last to be blank from the scheduled job. Ignores value of onBreak
                    if (thisUser.break.lastFreeDuration === 0 && thisUser.break.lastBreakTime == 0){
                        if (usedTime > thisUser.break.freeDuration){
                            console.debug("-------Initial Break Time---------")
                            thisUser.break.lastBreakTime = Date.now()
                            onBreak = true
                        } 

                    // Start free time. Handle returning from break. Currently on break.
                    } else if (Date.now() >= nextFreeTime && onBreak === true){
                        console.debug("-------Start Free Time---------")
                        thisUser.break.lastFreeDuration = usedTime
                        onBreak = false

                    // Start break. Handle going on break after initial break. Currently on free time.
                    } else if (usedTime >= nextBreak && onBreak === false){
                        console.debug("-------Start Break Time---------")
                        thisUser.break.lastBreakTime = Date.now()
                        onBreak = true
                    }
                    
                    if (onBreak){
                        responseJson.total = 0
                    } else {

                    }


                    // Update response to client
                    responseJson.nextBreak = nextBreak
                    responseJson.nextFreeTime = nextFreeTime
                    responseJson.onBreak = onBreak
                    responseJson.breakTimeLeft = Math.max(nextFreeTime - Date.now(), 0)
                    responseJson.freeTimeLeft = Math.max(nextBreak - usedTime, 0)

                    
                    console.debug("lastFreeDuration: " + thisUser.break.lastFreeDuration + " lastBreakTime: " + thisUser.break.lastBreakTime + " now: " + Date.now())
                    console.debug("Time until break is up: " + (nextFreeTime - Date.now()))

                    thisUser.break.onBreak = onBreak
                    thisUser.save()                    

                } else {
                    console.info("No break configured")
                }

            // User does not exist
            } else {
                // Or just send current time total
                console.debug("Device is not associated with a user, sending time used")
                responseJson.state = "time used"
            }

            console.info(responseJson)
            res.send(responseJson)
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


    app.get('/totalOverTime',(req,res) => {
        name = req.params.name
        start = req.params.start
        end = req.params.end
        getTotalOverTime(name,start,end).then(doc => {            
            es.statusCode(200).send(doc)
        }).catch(err => {

        })

    })

    // Returns the total time used between start and stop timestamps
    function getTotalOverTime(name, start, end){
        
        var match = {user: name, timestamp: {gt: RegExp(start), lt: RegExp(end)}}
        var group = {_id: '$user', total: {$sum: '$usage'}}
        var pipeline = [{$match: match}, {$group: group}]

        collection.aggregate(pipeline).toArray().then(results =>{
            total = {total: results[0]['total']}
            console.log(total)
            res.send(total)
        }
        ).catch(err =>{
            res.send(err)
        })
    }



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
        this_activity = new activity(req.body)
        console.log(this_activity)
        this_activity.save().then(() => {
            //console.log('Logged activity: ')
            // console.log(req.body)
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
                if (req.body.break.breakDuration || req.body.break.breakDuration === 0){
                    doc.break.breakDuration = req.body.break.breakDuration
                }
                if (req.body.break.freeDuration || req.body.break.freeDuration === 0){
                    doc.break.freeDuration = req.body.break.freeDuration
                }
                if (req.body.break.onBreak || req.body.break.onBreak === false){
                    doc.break.onBreak = req.body.break.onBreak                    
                }
                if (req.body.break.lastBreakDuration || req.body.break.lastBreakDuration === 0){
                    doc.break.lastBreakDuration = req.body.break.lastBreakDuration
                }
                if (req.body.break.lastBreakTime || req.body.break.lastBreakTime === 0){
                    doc.break.lastBreakTime = req.body.break.lastBreakTime
                }
            }
    
            doc.save().then(doc => {
                console.debug("Updated user: " + req.params.name)
                console.debug(doc)

                // convert reponse to minutes
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

