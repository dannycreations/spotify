const client = require('./../index.model.js')
const tele = require('./../moduls/telegram.js')

class MVDModel extends client.IndexModel {
  constructor() {
    super()
    this.config
  }
  
  // Mass Verify dbBot
  async run(database = ['v1', 'v2']) {
    while(true) {
      let field = `# Blacklist Report\n`
      for (const db of database) {
        let count = 0, tmpTime, totalTime = 0
        this.config = this.randAppConfig()
        const dataBot = await this.dbBot.find({
          'info.dbType': db, 'info.blacklist.sts': false
        }).select({ uid: 1, login: 1 }).lean()
        this.output(this.chalk`{bold.yellow Mvd dbBot ${db} (${dataBot.length})}`)
        for (let data of dataBot) {
          tmpTime = Date.now()
          data = await this.checkToken(this.config, data)
          count++, totalTime += Date.now() - tmpTime
          if (data) this.output(this.chalk`• [${this.percent(count, dataBot.length)}] {green ${this.humanize(totalTime)}}`, true)
        }
        count = await this.dbBot.countDocuments({
          'info.dbType': db, 'info.blacklist.sts': true
        }), field += `• Spotify-${db} ${count.toLocaleString()} of ${(dataBot.length - count).toLocaleString()}\n`
      }
      await tele.sendMessage(field)
      const dataBot = await this.dbBot.find({ 'info.blacklist.sts': true }).select({ raw: 1 }).lean()
      if (dataBot.length > 0) await tele.sendDocument(`blacklist_${this.moment().unix()}`, JSON.stringify(dataBot, null, 2))
      const delay = 21600000 // 6 Jam
      this.output(this.chalk`{yellow Break! Next Refresh in ${this.moment(Date.now() + delay).format('HH:mm:ss')}}`)
      await this.delay(delay)
      this.output()
    }
  }
}

module.exports = new MVDModel()