const client = require('./../index.model.js')
const tele = require('./../moduls/telegram.js')

class MCPModel extends client.IndexModel {
  constructor() {
    super()
    this.config
  }
  
  // Mass Hdn & Hpp dbBot
  async run() {
    return
    this.config = this.randAppConfig()
    const datas = await this.db_users.find({
      db_type: 'v2', $or: [{ 'info.is_dn': false }, { 'info.is_pp': false }]
    })
    let count = 0, total = datas.length, randomuser = await this.getFakeName()
    for (let data of datas) {
      data = await this.checkToken(this.config, data)
      if (!data) continue
      this.output(this.chalk`{bold.yellow ${data.login.username}}`)
      const images = await this.getImages()
      const name = `${randomuser[count].name.first} ${randomuser[count].name.last}`.replace(/[^A-Za-z ]/g, '')
      const change = await this.changeProfile(images, name, data)
      if (!change) {
        this.output(this.chalk`{bold.red ${data.login.username}}`)
        continue
      }
      count++, total--
      this.output(this.chalk`[${count}] [${total}] {bold.green ${data.login.username}}`)
      if (count >= randomuser.length - 1) {
        count = 0, randomuser = await this.getFakeName()
      }
    }
    this.output(this.chalk`{bold.yellow Mass Profile Changer Done!}`)
  }
  
  async getFakeName() {
    try {
      const res = await this.got.get('https://randomuser.me/api/', {
        searchParams: {
          inc: 'name',
          nat: 'au,br,ca,ch,de,dk,es,fi,fr,gb,ie,no,nl,nz,us',
          results: 5000
        },
        responseType: 'json'
      })
      return res.body.results
    } catch(err) {
      await this.errorHandle('mcp_getFakeName', err)
      return this.getFakeName()
    }
  }
  
  async getImages() {
    try {
      const res = await this.got.get('https://source.unsplash.com/random/200x200')
      return res.rawBody
    } catch(err) {
      await this.errorHandle('mcp_getImages', err)
      return this.getImages()
    }
  }
  
  async changeProfile(images, name, data) {
    try {
      this.config.app_headers['content-type'] = 'image/jpeg'
      this.config.app_headers['authorization'] = `Bearer ${data.login.token}`
      let res = await this.got.post('https://image-upload.spotify.com/v4/user-profile', {
        headers: this.config.app_headers,
        body: images,
        responseType: 'json'
      })
      if (res.statusCode === 200) {
        res = await this.got.post(`https://spclient.wg.spotify.com/identity/v2/profile-image/${data.username}/${res.body.uploadToken}`, {
          headers: this.config.app_headers,
        })
        if (res.statusCode === 200) {
          await this.db_users.findOneAndUpdate({
            'login.username': data.login.username
          }, { 'info.is_pp': true })
          this.output(this.chalk` {green Image Changed}`)
          delete this.config.app_headers['content-type']
        }
        res = await this.got.put(`https://spclient.wg.spotify.com/identity/v1/user/${data.username}/display_name`, {
          headers: this.config.app_headers,
          body: name
        })
        if (res.statusCode === 200) {
          await this.db_users.findOneAndUpdate({
            'login.username': data.login.username
          }, { 'info.is_dn': true })
          this.output(this.chalk` {green Name Changed to ${name}}`)
          return true
        }
      }
      await tele.sendDocument('mcp_changeProfile', JSON.stringify(res, null, 2))
      return false
    } catch(err) {
      await this.errorHandle('mcp_changeProfile', err)
      return this.changeProfile(images, name, data)
    }
  }
}

module.exports = new MCPModel()