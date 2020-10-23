process.env.NTBA_FIX_319 = 1
process.env.NTBA_FIX_350 = 1

const client = require('./../index.model.js')
const telegram = require('node-telegram-bot-api')

class Telegram extends client.IndexModel {
  constructor() {
    super()
    this.ownerid = '649435980'
    this.client = new telegram('')
  }
  
  async sendMessage(message) {
    try {
      await this.client.sendMessage(this.ownerid, message)
    } catch(err) {
      await this.errorHandle('telegram_sendMessage', err)
      return this.sendMessage(message)
    }
  }
  
  async sendDocument(name, message) {
    try {
      await this.client.sendDocument(this.ownerid, Buffer.from(message), {}, {
        filename: `${name}.txt`
      })
    } catch(err) {
      await this.errorHandle('telegram_sendDocument', err)
      return this.sendDocument(message)
    }
  }
}

module.exports = new Telegram()