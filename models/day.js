const { Long } = require('mongodb')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const day = new Schema({
    user: String,
    device: String,
    sessionCount: Number,
    usageTime: Number,
    date: Date
})
module.exports = mongoose.model('day', day)