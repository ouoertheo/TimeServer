// Joda JS Library https://js-joda.github.io/js-joda/manual/LocalDate.html 
// Running Node on Windows: https://github.com/coreybutler/node-windows

const bodyParser = require('body-parser')
const express = require('express')
const mongoose = require('mongoose')
const config = require('./config')
const app = express()

// // Models
// const activity = require('./models/activity')
// const activity = require('./models/day')
// const activity = require('./models/session')
// const activity = require('./models/user')

const url = config.mongo_url

mongoose.connect(url,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(client => {
    console.log('Connected to Database')
    const db = mongoose.connection
    const jaminCollection = db.collection('jamin')

    app.use(bodyParser.urlencoded({extended:true}))
    app.use(bodyParser.json())

    app.listen(3000,function(){
        console.log("Listening on port 3000")
    })

    app.get("/test",(req,res) => {
        res.send("Yep")
    })

    app.get("/getToday/:name",(req,res) => {
        var name = req.params.name

        var today = new Date().toISOString().slice(0, 10)
        todayQueryString = '^'+today

        var match = {user: name, timestamp: RegExp(todayQueryString)}
        var group = {_id: '$user', total: {$sum: '$usage'}}
        var pipeline = [{$match: match}, {$group: group}]
        
        console.log(pipeline)
        jaminCollection.aggregate(pipeline).toArray().then(results =>{
            total = {total: results[0]['total']}
            console.log(total)
            res.send(total)
        }
        ).catch(err =>{
            res.send(err)
        })
    })

    app.get("/debugGetToday/:name",(req,res) => {
        var name = req.params.name
        var today = new Date().toISOString().slice(0, 10)
        todayQueryString = '^'+today
        var query = {user: name, timestamp: RegExp(todayQueryString)}
        //var query = {user: name}
        console.log(query)
        jaminCollection.find(query).toArray().then(results =>{
                res.send(results)
            }
        ).catch(err =>{
            res.send(err)
        })
    })

    app.post('/clearAll',(req,res) => {
        jaminCollection.deleteMany({}).then( result =>{
            console.log('Deleted: ' + result.deletedCount + " items.")
            res.send('Deleted: ' + result.deletedCount + " items.")
        }).catch(error => {
            console.log(error)
            res.send(error)
        })
    })

    app.post('/poll', (req,res) => {
        console.log("Received request. Submitting to Mongo")
        jaminCollection.insertOne(req.body).then(result => {
            console.log('Logged activity: ')
            console.log(req.body)
            res.send()
        }).catch(error => {
            console.log(error)
        })
    })
}).catch(error => console.error(error))

