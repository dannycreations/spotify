const client = require('./../index.model.js')

class AdminModel extends client.IndexModel {
  constructor() {
    super()
    this.seller = false
  }
  
  async run(message, args) {
    this.seller = await this.checkSeller(message)
    if (!this.seller) return
    let role = args[1].toLowerCase()
    if ([1, 2].includes(this.seller.info.idType)) {
      if (!['owner', 'admin', 'seller'].includes(role)) return
      else if (this.seller.info.idType === 1 && role === 'owner') role = 1
      else if (this.seller.info.idType === 1 && role === 'admin') role = 2
      else if ([1, 2].includes(this.seller.info.idType) && role === 'seller') role = 3
    } else {
      return message.channel.send(`<@${message.author.id}> Sorry your role doesn't have this permission.`)
    }
    const mention = args[1].match(/^<@!?(\d+)>$/)
    if (mention) {
      this.addSeller(message, role, mention[1])
    } else {
      if (this.seller.info.idType !== 1) return
      this.addSeller(message, role, args[1])
    }
  }
  
  async addSeller(message, role, userid) {
    const member = message.guild.member.cache.get(userid)
    await new this.dbSlr({
      uid: member.user.id,
      info: {
        idType: role,
        register: {
          uid: message.author.id,
          dte: this.moment().unix()
        },
        blacklist: {
          sts: false
        }
      }
    }).save()
    //role = message.guild.roles.cache.find(role => role.name === `${this._.capitalize(role)}s`)
    //await member.roles.add(role)
    let field = `> **${member.user.tag}** (${member.user.id})\n`
    field += `<@${message.author.id}> Success added to ${this._.capitalize(role)} role!`
    message.channel.send(field)
  }
}

module.exports = new AdminModel()