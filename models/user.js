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
        type: Number
    },
    break: {
        breakDuration: Number,
        freeDuration: Number,
        lastFreeDuration: Number,
        lastBreakTime: Number,
        onBreak: Boolean
    },
    downTime: [
        {
            start: Number,
            end: Number
        }
    ],
    devices: [
        {
            device: {
                type: String,
                required: true
            },
            user: {
                type: String,
                required: true
            },
            limit: Number
        }
    ],
    habiticaId: String
})
module.exports = mongoose.model('user', user)