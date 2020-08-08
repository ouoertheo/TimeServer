// Data source hosted on https://cloud.mongodb.com
// Joda JS Library https://js-joda.github.io/js-joda/manual/LocalDate.html 
// Running Node on Windows: https://github.com/coreybutler/node-windows


console.log("Hello world")
const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const app = express();

const url = config.mongo_url;

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
        res.sendFile(__dirname+'/index.html')
    })

    app.get("/getToday/:name/:date",(req,res) => {
        var name = req.params.name
        console.log(name);
    })

    app.post('/clearAll',(req,res) => {
        jaminCollection.deleteMany({}).then( result =>{
            console.log('Deleted: ' + result.deletedCount + " items.");
            res.send('Deleted: ' + result.deletedCount + " items.")
        }).catch(error => {
            console.log(error)
            res.send(error)
        });
    })

    app.post('/poll', (req,res) => {
        console.log("Received request. Submitting to Mongo")
        jaminCollection.insertOne(req.body).then(result => {
            console.log('Logged activity: ')
            console.log(req.body)
        }).catch(error => {
            console.log(error)
        })
    })
}).catch(error => console.error(error))

