const client = require('./../index.model.js')

class BDGModel extends client.IndexModel {
  constructor() {
    super()
  }
  
  // Bridge
  async run(db = 'v1') {
    const dataRaw = await this.dbRaw.find({
      'info.dbType': 'recovered', 'info.fail.rvd': false
    }).select({ raw: 1 }).lean()
    for (const data of dataRaw) {
      let dataBot = await this.dbBot.find({
        'raw.email': data.raw.email
      }).select({ _id: 1 }).lean()
      if (dataBot.length > 0) continue
      this.output(this.chalk`{bold.yellow Sign!} {bold.green ${data.raw.email}}`)
      const sign = await this.signin(data)
      if (sign) {
        await new this.dbBot({
          uid: sign.login.username,
          info: {
            dbType: db,
            feature: {
              hdn: false,
              hpp: false,
              hfr: false
            },
            blacklist: {
              sts: false
            }
          },
          login: {
            token: sign.login.token,
            refresh: Buffer.from(sign.login.refresh).toString(),
            updatedAt: this.moment().unix()
          },
          raw: {
            email: sign.raw.email,
            password: sign.raw.password,
            birthday: sign.raw.birthday,
            gender: sign.raw.gender,
            createdAt: parseInt(sign.raw.createdAt)
          }
        }).save()
        await this.dbRaw.findOneAndDelete({ 'raw.email': data.raw.email })
        const countRaw = await this.dbRaw.countDocuments({
          'info.dbType': 'recovered', 'info.fail.rvd': false
        }), countBot = await this.dbBot.countDocuments({
          'info.dbType': db, 'info.blacklist.sts': false
        })
        this.output(this.chalk`[${countRaw}] [${countBot}] {green ${sign.login.username}}`)
      }
    }
    this.output(this.chalk`{bold.yellow Sign Done!}`)
    process.exit()
  }
  
  async signin(data) {
    try {
      const res = await this.got.post('http://127.0.0.1:4000/login', {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        form: {
          email: data.raw.email,
          password: data.raw.password,
          birthday: data.raw.birthday,
          gender: data.raw.gender,
          createdAt: data.raw.createdAt
        },
        responseType: 'json'
      })
      if (res.body.status) {
        if (res.body.raw.email === data.raw.email) {
          const dataBot = await this.dbBot.find({
            uid: res.body.login.username
          }).select({ _id: 1 }).lean()
          if (dataBot.length === 0) return res.body
        }
        return false
      } else {
        this.output(this.chalk`{red ${res.body.message}} ${data.raw.email}`)
        return false
      }
    } catch(err) {
      await this.errorHandle('bdg_signin', err)
      return false
    }
  }
}

module.exports = new BDGModel()