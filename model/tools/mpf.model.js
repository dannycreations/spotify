const client = require('./../index.model.js')

class MPFModel extends client.IndexModel {
  constructor() {
    super()
    this.config
  }
  
  // Mass Pull Followers
  async run(id, category, total, field, msg) {
    let count = 0, unfollow, tmpTime, totalTime = 0, arrayTime = []
    this.output(this.chalk`{bold.yellow Rip ${this._.capitalize(category)} ${id}}`)
    this.config = this.randAppConfig()
    const dataByr = await this.dbByr.find({ uid: id })
    .select({ 'record.count': 1 }).lean()
    for (let data of dataByr[0].record.count) {
      data = await this.dbBot.find({
        uid: data, 'info.blacklist.sts': false
      }).select({ uid: 1, login: 1 }).lean()
      if (data.length > 0) {
        tmpTime = Date.now()
        data = await this.checkToken(this.config, data[0])
        if (!data) continue
        if (['user', 'artist'].includes(category)){
          unfollow = await this.userProfile(id, category, data.login.token)
        } else {
          unfollow = await this.userPlaylist(id, data.login.token)
        } if (unfollow) {
          count++
          await this.dbByr.findOneAndUpdate({ uid: id }, { $pull: { 'record.count': data.uid } })
          this.output(this.chalk`[${count}] {green ${data.uid}}`)
          if (field && msg) {
            tmpTime = Date.now() - tmpTime
            totalTime += tmpTime, arrayTime.push(tmpTime)
            const field2 = `${field}\n🕒 ${this.progress(totalTime / arrayTime.length, count - 1, total)}`
            await msg.edit(field2)
          }
        } else this.output(this.chalk`{red ${data.uid}}`)
      } if (count >= total) {
        this.output(this.chalk`{bold.green ${this._.capitalize(category)} ${id}}`)
        return
      }
    }
  }
  
  async prompt() {
    const question = [{
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
        await this.run(id, category, answer.total)
      }
    } catch(err) {
      this.output(this.chalk`{bold.red ${err.message}}`)
    }
  }
  
  async userProfile(id, category, token) {
    try {
      this.config.app_headers['authorization'] = `Bearer ${token}`
      const res = await this.got.delete('https://api.spotify.com/v1/me/following', {
        headers: this.config.app_headers,
        searchParams: { ids: id, type: category }
      })
      return res.statusCode === 204 ? true : false
    } catch(err) {
      await this.errorHandle('mpf_userProfile', err)
      return this.userProfile(id, category, token)
    }
  }
  
  async userPlaylist(id, token) {
    try {
      this.config.app_headers['authorization'] = `Bearer ${token}`
      const res = await this.got.delete(`https://api.spotify.com/v1/playlists/${id}/followers`, {
        headers: this.config.app_headers
      })
      return res.statusCode === 200 ? true : false
    } catch(err) {
      await this.errorHandle('mpf_userPlaylist', err)
      return this.userPlaylist(id, token)
    }
  }
}

module.exports = new MPFModel()