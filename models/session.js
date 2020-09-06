const { Long } = require('mongodb')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const session = new Schema({
    start: Date,
    end: Date,
    user: String,
    device: String
})
module.exports = mongoose.model('session', session)