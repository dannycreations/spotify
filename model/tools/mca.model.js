const client = require('./../index.model.js')
const tmg = require('./../moduls/tempmailgen.js')

class MCAModel extends client.IndexModel {
  constructor() {
    super()
    this.config
    this.verifySubject = [
      'confirm your account',
      'konfirmasikan akunmu',
      'please verify your email',
      'verifikasi emailmu'
    ]
    this.recoverySubject = [
      'log in to spotify',
      'reset your spotify password'
    ]
   }
  
  // Register
  async run(count = 0, delay = 30000) {
    while (true) {
      let countRegister = await this.dbRaw.countDocuments({ 'info.dbType': 'register' })
      if (countRegister < 20) {
        this.config = this.randAppConfig()
        const signup = await this.signup()
        if (signup) {
          await new this.dbRaw({
            info: {
              dbType: 'register',
              fail: {
                vry: false,
                rvy: false,
                rvd: false
              }
            },
            raw: {
              email: signup.email,
              password: signup.password,
              birthday: signup.birthday,
              gender: signup.gender,
              createdAt: this.moment().unix()
            }
          }).save(), count++
          countRegister = await this.dbRaw.countDocuments({ 'info.dbType': 'register' })
          this.output(this.chalk`[${count}] [${countRegister}] {green ${signup.email}}`)
          await this.delay(delay)
        }
      } else {
        delay = 60000 // 1 Menit
        this.output(this.chalk`{bold.yellow Break! Next Register in ${this.moment(Date.now() + delay).format('HH:mm:ss')}}`)
        await this.delay(delay)
      }
    }
  }
  
  // Verify
  async run2(delay = 35000) {
    while (true) {
      let countRegister = await this.dbRaw.countDocuments({ 'info.dbType': 'register' })
      let countVerify = await this.dbRaw.countDocuments({
        'info.dbType': 'verify', 'info.fail.vry': false
      })
      if (countRegister > 10 && countVerify < 20) {
        const dataRaw = await this.dbRaw.find({
          'info.dbType': 'register'
        }).select({ raw: 1 }).lean()
        for (const data of dataRaw) {
          tmg.randEmail()
          const total = this.moment().unix() - data.raw.createdAt
          if (total >= 300 && countVerify < 20) {
            this.config = this.randAppConfig()
            this.output(this.chalk`{bold.yellow Verify!} {bold.green ${data.raw.email}}`)
            const verify = await this.checkEmail({
              username: data.raw.email.split('@')[0],
              domain: data.raw.email.split('@')[1]
            }, 'verify')
            if (verify) {
              await this.dbRaw.findByIdAndUpdate(data._id, { 'info.dbType': 'verify' })
              countRegister = await this.dbRaw.countDocuments({ 'info.dbType': 'register' })
              countVerify = await this.dbRaw.countDocuments({
                'info.dbType': 'verify', 'info.fail.vry': false
              })
              this.output(this.chalk`• [${countRegister}] [${countVerify}] {green ${data.raw.email}}`)
              await this.delay(delay)
            } else {
              await this.dbRaw.findByIdAndUpdate(data._id, {
                'info.dbType': 'verify', 'info.fail.vry': true
              })
            }
          }
        }
      } else {
        delay = 60000 // 1 Menit
        this.output(this.chalk`{bold.yellow Break! Next Register in ${this.moment(Date.now() + delay).format('HH:mm:ss')}}`)
        await this.delay(delay)
      }
    }
  }
  
  // Recovery
  async run3() {
    while (true) {
      let countVerify = await this.dbRaw.countDocuments({
        'info.dbType': 'verify', 'info.fail.vry': false
      }), countRecovery
      if (countVerify > 0) {
        const dataRaw = await this.dbRaw.find({
          'info.dbType': 'verify', 'info.fail.vry': false
        }).select({ raw: 1 }).lean()
        for (const data of dataRaw) {
          tmg.randEmail()
          this.config = this.randAppConfig()
          this.output(this.chalk`{bold.yellow Recovery!} {bold.green ${data.raw.email}}`)
          const recovery = await this.recovery(data.raw)
          if (recovery) {
            const changepassword = await this.changePassword(recovery)
            if (changepassword) {
              await this.dbRaw.findByIdAndUpdate(data._id, {
                'info.dbType': 'recovery', 'raw.password': changepassword
              })
              countVerify = await this.dbRaw.countDocuments({
                'info.dbType': 'verify', 'info.fail.vry': false
              })
              countRecovery = await this.dbRaw.countDocuments({
                'info.dbType': 'recovery', 'info.fail.rvy': false
              })
              this.output(this.chalk`• [${countVerify}] [${countRecovery}] {green ${recovery.raw.email}}`)
              await this.delay(1000)
            }
          } else if (recovery === false) {
            await this.dbRaw.findByIdAndUpdate(data._id, {
              'info.dbType': 'recovery', 'info.fail.rvy': true
            })
          }
        }
      } else {
        const delay = 60000 // 1 Menit
        this.output(this.chalk`{bold.yellow Break! Next Register in ${this.moment(Date.now() + delay).format('HH:mm:ss')}}`)
        await this.delay(delay)
      }
    }
  }
  
  // Clean Inbox
  async run4(mode = 'recovery') {
    const dataRaw = await this.dbRaw.find({
      'info.dbType': mode, 'info.fail.vry': false,
      'info.fail.rvy': false, 'info.fail.rvd': false
    }).select({ raw: 1 }).lean()
    let count = dataRaw.length
    for (const data of dataRaw) {
      tmg.randEmail()
      this.output(this.chalk`{bold.yellow ${data.raw.email}}`)
      const getMessages = await tmg.getMessages({
        username: data.raw.email.split('@')[0],
        domain: data.raw.email.split('@')[1]
      })
      if (getMessages.total > 0) {
        this.output(this.chalk`• {green Found ${getMessages.total} Messages}`)
        for (const mail of getMessages.email) {
          const del = await tmg.deleteMessage(mail.email_id)
          if (del) this.output(this.chalk`• Deleted {green ${mail.email_id} => ${mail.subject}}`)
        }
        count--, this.output(this.chalk`• [${count}] {green ${data.raw.email}}`)
      } else this.output(this.chalk`• {red Message Not Found}`)
    }
    return this.output(this.chalk`{bold.yellow Clean Inbox Done!}`)
  }
  
  async checkEmail(data, mode) {
    if (tmg.protect >= tmg.total) {
      this.output(this.chalk`• {red Failed After 10 Minutes Retry}`)
      return mode === 'verify' ? false : null
    }
    const getMessages = await tmg.getMessages(mode === 'verify' ? data : data.tmg)
    if (getMessages.total > 0) {
      for (const mail of getMessages.email) {
        const subject = mode === 'verify' ? this.verifySubject : this.recoverySubject
        if (subject.includes(mail.subject.toLowerCase())) {
          mode === 'verify' ? data.id = mail.email_id : data.tmg.id = mail.email_id
          break
        }
      }
      if (typeof data.id !== 'undefined' || typeof data.tmg.id !== 'undefined') {
        const fetchMessage = await tmg.fetchMessage(mode === 'verify' ? data : data.tmg)
        try {
          this.output(this.chalk`• {green Message Found}`)
          for (const mail of getMessages.email) {
            await tmg.deleteMessage(mail.email_id)
          }
          if (mode === 'verify') {
            data.token = fetchMessage.split('/?t=')[1].split('&')[0]
            return this.verify(data)
          } else {
            data.rec.token = fetchMessage.split('#token=')[1].split('&')[0]
            data.rec.passwordToken = fetchMessage.split('&passwordToken=')[1].split('&')[0]
            data.rec.username = fetchMessage.split('&username=')[1].split('&')[0]
            return this.signin(data)
          }
        } catch(err) {
          console.log(fetchMessage)
          console.trace(err)
          process.exit()
        }
      } else {
        await tele.sendDocument('mca_checkEmail', JSON.stringify(getMessages, null, 2))
        for (const mail of getMessages.email) {
          await tmg.deleteMessage(mail.email_id)
        }
        return false
      }
    } else {
      tmg.protect++
      this.output(this.chalk`• [${tmg.protect}] {red Message Not Found}`)
      if (mode === 'recovery') {
        if (tmg.protect < tmg.total) await this.delay(60000)
        return this.checkEmail(data, mode)
      }
      return false
    }
  }
  
  async signup() {
    try {
      let email = tmg.randEmail(15)
      email = `${email.username}@${email.domain}`
      const password = this.randString(15)
      const name = this.randString(15)
      const bday = this.random.integer(1, 25)
      const bmonth = this.random.integer(1, 12)
      const byear = this.random.integer(1980, 2000)
      const birthday = `${bday}-${bmonth}-${byear}`
      let gender = ['male', 'female', 'neutral']
      gender = gender[this.random.integer(0, gender.length - 1)]
      this.config.app_headers['content-type'] = 'application/x-www-form-urlencoded'
      const res = await this.got.post('https://spclient.wg.spotify.com/signup/public/v1/account/', {
        headers: this.config.app_headers,
        form: {
          birth_year: byear,
          birth_day: bday,
          name: name,
          birth_month: bmonth,
          key: '142b583129b2df829de3656f9eb484e6',
          iagree: true,
          email: email,
          creation_point: 'client_mobile',
          password_repeat: password,
          password: password,
          gender: gender,
          platform: 'Android-ARM'
        },
        responseType: 'json'
      })
      if (res.statusCode === 200 && res.body.status === 1) {
        return { email, password, birthday, gender }
      }
      await tele.sendDocument('mca_signup', JSON.stringify(res, null, 2))
      return false
    } catch(err) {
      await this.errorHandle('mca_signup', err)
      return this.signup()
    }
  }
  
  async verify(data) {
    try {
      const title = 'Thanks for confirming your email address'
      const res = await this.got.get('https://www.spotify.com/us/email-verification/', {
        headers: this.config.web_headers,
        searchParams: { t: data.token }
      })
      if (res.statusCode === 200 && res.body.indexOf(title) >= 0) {
        this.output(this.chalk`• {green Email Verified}`)
        return data
      }
      await tele.sendDocument('mca_verify', JSON.stringify(res, null, 2))
      return false
    } catch(err) {
      await this.errorHandle('mca_verify', err)
      return this.verify(data)
    }
  }
  
  async recovery(data) {
    try {
      this.config.app_headers['content-type'] = 'application/json; charset=UTF-8'
      const res = await this.got.post('https://spclient.wg.spotify.com/accountrecovery/v3/magiclink/', {
        headers: this.config.app_headers,
        body: JSON.stringify({ emailOrUsername: data.email, template: 'login-autosend' })
      })
      if (res.statusCode === 202) {
        this.output(this.chalk`• {green Magiclink Generated}`)
        await this.delay(50000)
        return this.checkEmail({
          tmg: {
            username: data.email.split('@')[0],
            domain: data.email.split('@')[1]
          },
          raw: data,
          rec: {},
          login: {}
        }, 'recovery')
      }
      await tele.sendDocument('mca_recovery', JSON.stringify(res, null, 2))
      return null
    } catch(err) {
      await this.errorHandle('mca_recovery', err)
      return this.recovery(data)
    }
  }
  
  async signin(data) {
    try {
      this.config.app_headers['content-type'] = 'application/x-protobuf'
      const res = await this.got.post('https://login5.spotify.com/v3/login', {
        headers: this.config.app_headers,
        body: this.protobuf.RecoveryRequest.encode({
          client_info: this.config.client_info,
          recovery: { token: data.rec.token }
        })
      })
      if (res.statusCode === 200) {
        if (res.body.indexOf('\x10\x01') >= 0) {
          this.output(this.chalk`• {red Failed to Signin!}`)
          return false
        }
        this.output(this.chalk`• {green Signed to Spotify}`)
        const decode = this.protobuf.LoginResponse.decode(res.rawBody)
        data.login.token = decode.response.token
        return data
      }
      await tele.sendDocument('mca_signin', JSON.stringify(res, null, 2))
      return false
    } catch(err) {
      await this.errorHandle('mca_signin', err)
      return this.signin(data)
    }
  }
  
  async changePassword(data) {
    try {
      const password = this.randString(15)
      this.config.app_headers['content-type'] = 'application/json; charset=UTF-8'
      this.config.app_headers['authorization'] = `Bearer ${data.login.token}`
      const res = await this.got.put('https://spclient.wg.spotify.com/accountrecovery/v2/password/', {
        headers: this.config.app_headers,
        body: JSON.stringify({ password: password, oneTimeToken: data.rec.passwordToken })
      })
      if (res.statusCode === 200) {
        this.output(this.chalk`• {green Changed ${data.raw.password} => ${password}}`)
        return password
      }
      await tele.sendDocument('mca_changePassword', JSON.stringify(res, null, 2))
      return false
    } catch(err) {
      await this.errorHandle('mca_changePassword', err)
      return this.changePassword(data)
    }
  }
}

module.exports = new MCAModel()