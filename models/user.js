const { use } = require('js-joda')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const user = new Schema({
    name: String,
    dailyLimit: String,
    devices: [
        {
            name: String,
            limit: Number
        }
    ]
})
module.exports = mongoose.model('user', user)