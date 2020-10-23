let got = require('got')
const fs = require('fs')
const _ = require('lodash')
const util = require('util')
const chalk = require('chalk')
const delay = require('delay')
const moment = require('moment')
const inquirer = require('inquirer')
const discord = require('discord.js')
const useragent = require('user-agents')
let protobuf = require('protocol-buffers')
let humanize = require('humanize-duration')
const android = require('android-device-list')
const { Random, MersenneTwister19937 } = require('random-js')

const mongo = require('./moduls/mongoose.js')
const dconfig = require('./discord/others/configs.json')

const dclient = new discord.Client()
humanize = humanize.humanizer({ round: true })
got = got.extend({ timeout: 60000, retry: { limit: 0 } })
const random = new Random(MersenneTwister19937.autoSeed())
protobuf = protobuf(fs.readFileSync(`${process.cwd()}/model/others/spotify.proto`))

class IndexModel {
  constructor() {
    this._ = _
    this.fs = fs
    this.got = got
    this.util = util
    this.chalk = chalk
    this.delay = delay
    this.moment = moment
    this.random = random
    this.android = android
    this.inquirer = inquirer
    this.humanize = humanize
    this.protobuf = protobuf
    this.useragent = useragent
    
    this.discord = discord
    this.dconfig = dconfig
    this.dclient = dclient
    
    this.dbRaw = mongo.client.model('raw', mongo.schemaRaw)
    this.dbBot = mongo.client.model('bot', mongo.schemaBot)
    this.dbByr = mongo.client.model('byr', mongo.schemaByr)
    this.dbSlr = mongo.client.model('slr', mongo.schemaSlr)
    this.dbLog = mongo.client.model('log', mongo.schemaLog)
  }
  
  async errorHandle(name, err, message = null) {
    process.stdout.clearLine()
    this.output(this.chalk`{bold.red ${name.split('_')[1].toUpperCase()}!} {red ${err.message}}`)
    if (name.indexOf('discord') >= 0) {
      const field = '```Name: ' + err.message + '```'
      console.trace(err.response)
      return message.channel.send(field)
    } else if (typeof err.response !== 'undefined') {
      if (err.response.statusCode === 401) {
        console.trace(err.response)
        process.exit()
      } else if (err.response.statusCode === 429) {
        if (name === 'mca_recovery') return this.delay(600000) // 10 Menit
        else if (name === 'mca_verify') return this.delay(120000) // 2 Menit
      }
    }
    return this.delay(10000)
  }
  
  output(msg = '', inline = false) {
    const time = `| ${this.moment().format('HH:mm:ss')} | `
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write('\x1B[?25l')
    if (inline) {
      process.stdout.write(`${time}${msg}`)
    } else {
      console.log(`${time}${msg}`)
    }
  }
  
  print(msg) {
    console.log(this.util.inspect(msg, false, null, true))
  }
  
  percent(val, max, min = 0) {
    const value = val - min
    const range = Math.abs(max - min)
    const percent = (100.0 * parseFloat(value) / parseFloat(range)) / 100
    return `${(percent * 100).toFixed(2)}%`
  }
  
  estimated(total, current, time) {
    return this.humanize(((total - current) / time))
  }
  
  randString(max) {
    let random = ''
    for (let i = 0; i < max; i++) {
      const string = [
        String.fromCharCode(this.random.integer(65, 90)),
        String.fromCharCode(this.random.integer(97, 122))
      ]
      random += string[this.random.integer(0, string.length - 1)]
      random += String.fromCharCode(this.random.integer(48, 57))
    }
    return random.slice(0, max)
  }
  
  randAppConfig() {
    const app = 'Spotify', spotify_ver = '8.5.62'
    const android_ver = this.random.integer(19, 29)
    let android_model = this.android.getDevicesByBrand('Xiaomi')
    android_model = android_model[this.random.integer(0, android_model.length - 1)].model
    const useragent = new this.useragent({ deviceCategory: 'mobile' })
    const client_info = {
      id: '7e7cf598605d47caba394c628e2735a2'
    }
    const app_headers = {
      'accept-language': 'en-US',
      'user-agent': `${app}/${spotify_ver} Android/${android_ver} (${android_model})`,
      'spotify-app-version': spotify_ver,
      'x-client-id': client_info.id,
      'app-platform': 'Android'
    }
    return {
      client_info: client_info,
      app_headers: app_headers,
      web_headers: {
        'user-agent': useragent.toString()
      }
    }
  }
  
  async checkToken(config, bot) {
    const total = this.moment().unix() - bot.login.updatedAt
    if (total < 3600) return bot
    return this.refreshToken(config, bot)
  }
  
  async refreshToken(config, bot) {
    try {
      config.app_headers['content-type'] = 'application/x-protobuf'
      const res = await this.got.post('https://login5.spotify.com/v1/login', {
        headers: config.app_headers,
        body: this.protobuf.RefreshRequest.encode({
          client_info: config.client_info,
          refresh: {
            username: bot.uid,
            token: bot.login.refresh
          }
        })
      })
      if (res.statusCode === 200) {
        if (res.body.indexOf('\x10\x01') >= 0) {
          await this.dbBot.findOneAndUpdate({ uid: bot.uid }, {
            'info.blacklist.sts': true,
            'info.blacklist.dte': this.moment().unix()
          })
          this.output(this.chalk`• {bold.red Blacklisted ${bot.uid}}`)
          return false
        }
        const decode = this.protobuf.LoginResponse.decode(res.rawBody)
        return this.dbBot.findOneAndUpdate({ uid: bot.uid }, {
          'login.token': decode.response.token,
          'login.refresh': decode.response.refresh,
          'login.updatedAt': this.moment().unix()
        }, { new: true }).select({ uid: 1, login: 1 }).lean()
      }
    } catch(err) {
      await this.errorHandle('index_refreshToken', err)
      return this.refreshToken(config, bot)
    }
  }
  
  // Discord Function
  async checkSeller(message) {
    let field = `<@${message.author.id}> `
    const dataSlr = await this.dbSlr.find({
      uid: message.author.id
    }).select({ info: 1 }).lean()
    if (dataSlr.length > 0) {
      if (dataSlr[0].info.blacklist.sts) {
        field += 'Sorry your account got blacklisted.'
        await message.channel.send(field)
        return false
      }
      return dataSlr[0]
    } else {
      field += 'Sorry you don\'t have any seller role.'
      await message.channel.send(field)
      return false
    }
  }
}

exports.IndexModel = IndexModel