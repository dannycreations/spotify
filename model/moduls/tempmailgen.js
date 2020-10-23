const client = require('./../index.model.js')

class TMGModel extends client.IndexModel {
  constructor() {
    super()
    this.total = 10
    this.protect = 0
    this.config = this.randAppConfig()
    this.domain = [
      'gurumail.xyz',
      'senduvu.com',
      'mailree.live',
      'mailpoly.xyz'
    ]
  }
  
  randEmail(total = 1) {
    this.protect = 0
    return {
      username: this.randString(total),
      domain: this.domain[this.random.integer(0, this.domain.length - 1)]
    }
  }
  
  async getMessages(email) {
    try {
      const res = await this.got.get('https://tempmailgen.com/api/getMessages', {
        headers: this.config.web_headers,
        searchParams: {
          username: email.username,
          domain: email.domain
        },
        responseType: 'json'
      })
      return res.body.result
    } catch(err) {
      await this.errorHandle('tempmailgen_getMessages', err)
      return this.getMessages(email)
    }
  }
  
  async fetchMessage(email) {
    try {
      const res = await this.got.get('https://tempmailgen.com/api/fetchMessage', {
        headers: this.config.web_headers,
        searchParams: {
          username: email.username,
          domain: email.domain,
          email_id: email.id
        },
        responseType: 'json'
      })
      return res.body.result.html_body
    } catch(err) {
      await this.errorHandle('tempmailgen_fetchMessage', err)
      return this.fetchMessage(email)
    }
  }
  
  async deleteMessage(email_id) {
    try {
      this.config.web_headers.cookie = ''
      const res = await this.got.get('https://tempmailgen.com/inc/list.php', {
        headers: this.config.web_headers,
        searchParams: { del: email_id },
        responseType: 'json'
      })
      return res.body ? true : this.output(this.chalk`{bold.red Failed to delete ${email_id}}`)
    } catch(err) {
      await this.errorHandle('tempmailgen_deleteMessage', err)
      return this.deleteMessage(email_id)
    }
  }
}

module.exports = new TMGModel()