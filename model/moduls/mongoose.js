const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/spotify', {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
})

mongoose.pluralize(null)

const customOptions = {
  schema: {
    strict: false
    //autoIndex: false
  },
  index: {
    unique: true
  }
}

const schemaRaw = new mongoose.Schema({
  info: {
    dbType: String,
    fail: {
      vry: Boolean,
      rvy: Boolean,
      rvd: Boolean
    }
  },
  raw: {
    email: String,
    password: String,
    birthday: String,
    gender: String,
    createdAt: Number
  }
}, customOptions.schema)

const schemaBot = new mongoose.Schema({
  uid: String,
  info: {
    dbType: String,
    feature: {
      hdn: Boolean,
      hpp: Boolean,
      hfr: Boolean
    },
    blacklist: {
      sts: Boolean,
      dte: Number
    }
  },
  login: {
    token: String,
    refresh: String,
    updatedAt: Number
  },
  raw: {
    email: String,
    password: String,
    birthday: String,
    gender: String,
    createdAt: Number
  }
}, customOptions.schema)

schemaBot.index({ uid: 1 }, customOptions.index)

const schemaByr = new mongoose.Schema({
  uid: String,
  info: {
    idType: String,
    blacklist: {
      sts: Boolean,
      uid: String,
      rsn: String,
      dte: Number
    }
  },
  record: {
    trial: [{
      tag: String,
      dbt: String,
      ttl: Number,
      dte: Number
    }],
    order: [{
      tag: String,
      dbt: String,
      ttl: Number,
      dly: Number,
      dte: Number
    }],
    count: [String]
  }
}, customOptions.schema)

schemaByr.index({ uid: 1 }, customOptions.index)

const schemaSlr = new mongoose.Schema({
  uid: String,
  info: {
    idType: Number,
    register: {
      uid: String,
      dte: Number
    },
    blacklist: {
      sts: Boolean,
      uid: String,
      rsn: String,
      dte: Number
    }
  },
  record: {
    trial: [String],
    order: [{
      tag: String,
      pay: {
        sts: Boolean,
        uid: String,
        dte: Number
      }
    }],
    pull: [{
      uid: String,
      ttl: Number,
      dte: Number
    }]
  }
}, customOptions.schema)

schemaSlr.index({ uid: 1 }, customOptions.index)

const schemaLog = new mongoose.Schema({
  tmpByr: Array,
  logSlr: Array
}, customOptions.schema)

module.exports = {
  client: mongoose,
  schemaRaw: schemaRaw,
  schemaBot: schemaBot,
  schemaByr: schemaByr,
  schemaSlr: schemaSlr,
  schemaLog: schemaLog
}