const config = require('./config');
const mongoose = require('mongoose')

module.exports.connect = () => {
    return mongoose.connect(config.mongo_url,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
};

module.exports.config = config.mongo_url;