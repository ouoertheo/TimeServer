const { use } = require('js-joda')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const user = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    dailyLimit: {
        type: Number,
        required: true
    },
    bonusLimit: {
        type: Number,
    },
    devices: [
        {
            name: String,
            user: String,
            limit: Number
        }
    ],
    habiticaId: String
})
module.exports = mongoose.model('user', user)