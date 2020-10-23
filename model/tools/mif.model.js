const client = require('./../index.model.js')

class MIFModel extends client.IndexModel {
  constructor() {
    super()
    this.config
  }
  
  // Mass Inject Followers
  async run(db, tag, mode, id, category, total, delay, field, msg) {
    let count = 0, follow, tmpTime, totalTime = 0, arrayTime = []
    this.output(this.chalk`{bold.yellow Inject ${this._.capitalize(category)} ${id}}`)
    this.output(this.chalk`{bold.yellow #${tag}: ${this._.capitalize(mode)} ${db} ${total} Followers}`)
    this.config = this.randAppConfig()
    while (true) {
      const dataRecord = await this.checkRecord(db, tag, mode, id, category, total, delay)
      const dataBot = await this.dbBot.find({
        'info.dbType': db, 'info.blacklist.sts': false
      }).skip(dataRecord.length).limit(total).select({ uid: 1, login: 1 }).lean()
      for (let data of dataBot) {
        if (!dataRecord.includes(data.uid)) {
          tmpTime = Date.now()
          data = await this.checkToken(this.config, data)
          if (!data) continue
          if (['user', 'artist'].includes(category)){
            follow = await this.userProfile(id, category, data.login.token)
          } else {
            follow = await this.userPlaylist(id, data.login.token)
          } if (follow) {
            await this.dbByr.findOneAndUpdate({
              uid: id }, { $push: { 'record.count': data.uid } })
            count++, this.output(this.chalk`[${count}] {green ${data.uid}}`)
            await this.delay(delay)
            if (field && msg) {
              tmpTime = Date.now() - tmpTime
              totalTime += tmpTime, arrayTime.push(tmpTime)
              const field2 = `${field}\n🕒 ${this.progress(totalTime / arrayTime.length, count - 1, total)}`
              await msg.edit(field2)
            }
          } else this.output(this.chalk`{red ${data.uid}}`)
        }
      }
      if (count >= total) {
        this.output(this.chalk`{bold.green Inject ${this._.capitalize(category)} ${id}}`)
        this.output(this.chalk`{bold.green #${tag}: ${this._.capitalize(mode)} ${db} ${total} Followers}`)
        return
      }
    }
  }
  
  // Mass Hfr dbBot
  async run2(count, db = 'v1') {
    this.config = this.randAppConfig()
    let dataBot = await this.dbBot.find({
      'info.dbType': db, 'info.feature.hfr': false, 'info.blacklist.sts': false
    }).select({ uid: 1 }).lean()
    count = dataBot.length
    for (const user of dataBot) {
      let tmpTime, totalTime = 0, tmpLog = []
      let count2 = 0, skip = 0, total = this.random.integer(45, 678)
      this.output(this.chalk`{bold.yellow Hfr ${total} ${user.uid}}`)
      while (true) {
        skip = this.random.integer(count2 + skip, 5000)
        dataBot = await this.dbBot.find({
          'info.dbType': db, 'info.blacklist.sts': false
        }).skip(skip).limit(total).select({ uid: 1, login: 1 }).lean()
        for (let data of dataBot) {
          tmpTime = Date.now()
          if (data.uid !== user.uid && !tmpLog.includes(data.uid)) {
            data = await this.checkToken(this.config, data)
            if (!data) continue
            const follow = await this.userProfile(user.uid, 'user', data.login.token)
            if (follow) {
              tmpTime = Date.now() - tmpTime
              totalTime += tmpTime, tmpLog.push(data.uid)
              count2++, this.output(this.chalk`• [${this.percent(count2, total)}] {green ${this.humanize(totalTime)}}`, true)
            } else this.output(this.chalk`{red ${data.uid}}`)
          }
        }
        if (count2 >= total) break
        if (count2 >= dataBot.length) break
      }
      await this.dbBot.findOneAndUpdate({ uid: user.uid }, { 'info.feature.hfr': true })
      console.log(), count--, this.output(this.chalk`• [${count}] {green ${user.uid}}`)
      await this.delay(1000)
    }
    this.output(this.chalk`{bold.yellow Mass Hfr dbBot Done!}`)
  }
  
  async checkRecord(db, tag, mode, id, category, total, delay) {
    let dataByr = await this.dbByr.find({ uid: id })
    .select({ _id: 1 }).lean()
    if (dataByr.length === 0) {
      await new this.dbByr({
        uid: id,
        info: {
          idType: category,
          blacklist: {
            sts: false
          }
        }
      }).save()
    }
    if (mode === 'trial') {
      await this.dbByr.findOneAndUpdate({
        uid: id
      }, {
        $push: {
          'record.trial': {
            tag: tag,
            dbt: db,
            ttl: total,
            dte: this.moment().unix()
          }
        }
      })
    } else {
      await this.dbByr.findOneAndUpdate({
        uid: id
      }, {
        $push: {
          'record.order': {
            tag: tag,
            dbt: db,
            ttl: total,
            dly: delay,
            dte: this.moment().unix()
          }
        }
      })
    }
    dataByr = await this.dbByr.find({
      uid: id, 'record.count': { $exists: true }
    }).select({ 'record.count': 1 }).lean()
    return dataByr.length > 0 ? dataByr[0].record.count : []
  }
  
  async prompt() {
    const question = [{
      type: 'input',
      name: 'database',
      message: 'Insert Database:',
      validate: function(value) {
        if (!value) return 'Can\'t Empty'
        if (!['v1', 'v2'].includes(value)) return 'Wrong Database!'
        return true
      }
    }, {
      type: 'input',
      name: 'total',
      message: 'Input Total:',
      validate: function(value) {
        value = value.match(/[0-9]/)
        return value ? true : 'Use Number Only!'
      }
    }, {
      type: 'input',
      name: 'link',
      message: 'Insert Link:',
      validate: function(value) {
        return value ? true : 'Can\'t Empty'
      }
    }]
    try {
      const answer = await this.inquirer.prompt(question)
      const id = answer.link.split('/')[4].split('?')[0]
      const category = answer.link.split('/')[3]
      if (['user', 'artist', 'playlist'].includes(category)) {
        while (true) {
          const randTag = this.randString(8).toUpperCase()
          const dataByr = await this.dbByr.find({
            $or: [{ 'record.trial.tag': randTag }, { 'record.order.tag': randTag }],
          }).select({ _id: 1 }).lean()
          if (dataByr.length === 0) {
            return this.run(answer.database, randTag, 'order', id, category, answer.total, 0)
          }
        }
      }
    } catch(err) {
      this.output(this.chalk`{bold.red ${err.message}}`)
    }
  }
  
  async userProfile(id, category, token) {
    try {
      this.config.app_headers['authorization'] = `Bearer ${token}`
      const res = await this.got.put('https://api.spotify.com/v1/me/following', {
        headers: this.config.app_headers,
        searchParams: { ids: id, type: category }
      })
      return res.statusCode === 204 ? true : false
    } catch(err) {
      await this.errorHandle('mif_userProfile', err)
      return this.userProfile(id, category, token)
    }
  }
  
  async userPlaylist(id, token) {
    try {
      this.config.app_headers['authorization'] = `Bearer ${token}`
      const res = await this.got.put(`https://api.spotify.com/v1/playlists/${id}/followers`, {
        headers: this.config.app_headers,
      })
      return res.statusCode === 200 ? true : false
    } catch(err) {
      await this.errorHandle('mif_userPlaylist', err)
      return this.userPlaylist(id, token)
    }
  }
}

module.exports = new MIFModel()