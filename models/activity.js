const { Long } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema

const activity = new Schema({
    user: String,
    device: String,
    timestamp: Date,
    activity: String,
    usage: Number
})
module.exports = mongoose.model('activity', activity)