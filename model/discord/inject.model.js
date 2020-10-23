const client = require('./../index.model.js')
const tools = require('./../tools/repo.model.js')

class InjectModel extends client.IndexModel {
  constructor() {
    super()
    this.config = {}
    this.protect = []
    this.protect2 = false
    this.seller = false
    
    this.database = {
      'v1': ['Package A', 'Random User'],
      'v2': ['Package B', 'Real User']
    }
  }
  
  async run(message, command, args) {
    this.seller = await this.checkSeller(message)
    if (!this.seller) return
    let field, fLink = `> <${message.content.split(' ')[1]}>\n`
    const mode = ['trial', 't'].includes(command) ? 'trial' : ['order', 'o'].includes(command) ? 'order' : 'pull'
    if (typeof this.config[message.author.id] === 'undefined') {
      this.config[message.author.id] = {}
    } if (typeof this.config[message.author.id][mode] === 'undefined') {
      this.config[message.author.id][mode] = { custom: false }
    } if (args[0] === 'status' && args.length === 1) this.getConfig(message, field, mode)
    else if (args[0] === 'set' && args.length <= 5) this.setConfig(message, args, field, mode)
    else if (args[0].includes('http') && args.length === 1) {
      if (this.protect.includes(message.author.id)) {
        field = 'You must complete previous operation before make new one.'
        return message.channel.send(field)
      } else if (this.protect2) {
        field = 'There is another operation running, please wait until the operation complete.'
        return message.channel.send(field)
      }
      const category = args[0].split('/')[3]
      if (!['user', 'artist', 'playlist'].includes(category)) {
        field = 'Only support inject for user/artist and playlist.'
        return message.channel.send(field)
      }
      const id = args[0].split('/')[4].split('?')[0]
      const dataByr = await this.dbByr.find({
        uid: id, 'info.blacklist.sts': true
      }).select({ _id: 1 }).lean()
      if (dataByr.length > 0) {
        field = `${fLink}Sorry this share link got blacklisted.`
        return message.channel.send(field)
      }
      this.protect2 = true, this.protect.push(message.author.id)
      this.questDatabase(message, fLink, field, mode, id, category)
    }
  }
  
  async getConfig(message, field, mode) {
    if (this.seller.info.idType !== 1) return
    if (!this.config[message.author.id][mode].custom) {
      field = `${this._.capitalize(mode)} Config not found :(`
      return message.channel.send(field)
    }
    field = '```' + `# Status ${this._.capitalize(mode)} Config!\n`
    this.config[message.author.id][mode].custom ? field += `• Custom Mode set ON\n` : field
    if (this.config[message.author.id][mode].type) field += `• Database set ${this.config[message.author.id][mode].type} (${this.database[this.config[message.author.id][mode].type][0]})\n`
    if (this.config[message.author.id][mode].total) field += `• Total set ${this.config[message.author.id][mode].total}\n`
    if (this.config[message.author.id][mode].delay) field += `• Delay set ${this.config[message.author.id][mode].delay}ms`
    message.channel.send(field + '```')
  }
  
  async setConfig(message, args, field, mode) {
    if (mode === 'pull' || this.seller.info.idType !== 1) return
    field = '```' + `# Update ${this._.capitalize(mode)} Config!\n`
    if (['0', '1'].includes(args[1])) {
      this.config[message.author.id][mode].custom = args[1] === '1' ? true : false
      field += `• Custom Mode set ${this.config[message.author.id][mode].custom ? 'ON' : 'OFF' }\n`
      if (this.config[message.author.id][mode].custom) {
        if (args.length >= 3) {
          if (!['v1', 'v2'].includes(args[2])) {
            field = '```Args 3 must be v1 or v2!```'
            return message.channel.send(field)
          }
          this.config[message.author.id][mode].type = args[2]
          field += `• Database set ${this.config[message.author.id][mode].type} (${this.database[this.config[message.author.id][mode].type][0]})\n`
        } if (args.length >= 4) {
          if (!parseInt(args[3]) > 0) {
            field = '```Args 4 must be number more than 1!```'
            return message.channel.send(field)
          }
          this.config[message.author.id][mode].total = parseInt(args[3])
          field += `• Total set ${this.config[message.author.id][mode].total}\n`
        } if (args.length >= 5) {
          if (!parseInt(args[4]).length >= 4) {
            field = '```Args 5 must be number more than 1000!```'
            return message.channel.send(field)
          }
          this.config[message.author.id][mode].delay = parseInt(args[4])
          field += `• Delay set ${this.config[message.author.id][mode].delay}ms`
        }
      } else {
        delete this.config[message.author.id][mode]
      }
    } else {
      field = '```Args 2 must be 0 or 1!```'
      return message.channel.send(field)
    }
    message.channel.send(field + '```')
  }
  
  async questDatabase(message, fLink, field, mode, id, category) {
    if (mode === 'pull') {
      await this.questTotal(message, null, fLink, field, mode, id, category)
    } else if (this.config[message.author.id][mode].custom) {
      await this.questConfirm(message, null, fLink, field, mode, id, category)
    } else {
      const fQuest = `🅰️ **${this.database['v1'][0]} (${this.database['v1'][1]})**\n🅱️ **${this.database['v2'][0]} (${this.database['v2'][1]})**\n❎ **Cancel**\n`
      field = `${fLink}${fQuest}<@${message.author.id}> Please select database type?`
      const msg = await message.channel.send(field)
      await msg.react('🅰️')
      await msg.react('🅱️')
      await msg.react('❎')
      try {
        const filter = (reaction, user) => {
          return ['🅰️', '🅱️', '❎'].includes(reaction.emoji.name) && user.id === message.author.id
        }
        let reaction = await msg.awaitReactions(filter, {
          max: 1, time: 60000, errors: ['time']
        })
        reaction = reaction.first()
        await msg.reactions.removeAll()
        if (reaction.emoji.name === '❎') {
          field = `${fLink}Operation canceled.`
          await msg.edit(field)
        } else {
          this.config[message.author.id][mode].total = 20
          this.config[message.author.id][mode].delay = 0
          this.config[message.author.id][mode].type = reaction.emoji.name === '🅰️' ? 'v1' : 'v2'
          if (mode === 'trial') await this.questConfirm(message, msg, fLink, field, mode, id, category)
          else await this.questTotal(message, msg, fLink, field, mode, id, category)
        }
      } catch(err) {
        await msg.reactions.removeAll()
        field = `${fLink}Operation canceled cause no answer after 60 seconds.`
        await msg.edit(field)
      }
    }
    this.protect2 = false
    this._.pull(this.protect, message.author.id)
  }
  
  async questTotal(message, msg, fLink, field, mode, id, category) {
    let dataTotal
    if (mode = 'pull') {
      dataTotal = await this.dbByr.find({ uid: id })
      .select({ 'record.count': 1 }).lean()
      if (dataTotal.length === 0 || dataTotal[0].record.count.length === 0) {
        field = `${fLink}Sorry this share link have no record yet.`
        return message.channel.send(field)
      }
      dataTotal = dataTotal[0].record.count.length
    } else {
      dataTotal = await this.dbBot.countDocuments({
        'info.dbType': this.config[message.author.id][mode].type,
        'info.blacklist.sts': false
      })
      dataTotal = Math.round(dataTotal / 2 / 1000) * 1000
    }
    const fQuest = `❓ Total amount max ${dataTotal}\n❓ Type **cancel** to exit this operation\n`
    field = `${fLink}${fQuest}<@${message.author.id}> Please type total amount?`
    msg = msg ? await msg.edit(field) : await message.channel.send(field)
    try {
      while (true) {
        const filter = res => {
          return res.author.id === message.author.id
        }
        let response = await message.channel.awaitMessages(filter, {
          max: 1, time: 60000, errors: ['time']
        })
        response = response.first()
        if (!response.content.includes(this.dconfig.prefix)) await response.delete()
        if (response.content.toLowerCase() === 'cancel') {
          field = `${fLink}Operation canceled.`
          return msg.edit(field)
        } else if (!parseInt(response.content)) {
          field = `${fLink}<@${message.author.id}> Total amount must be number only!`
          await msg.edit(field)
          continue
        } else if (parseInt(response.content) > dataTotal) {
          field = `${fLink}<@${message.author.id}> Total amount more than ${dataTotal}!`
          await msg.edit(field)
          continue
        }
        this.config[message.author.id][mode].total = parseInt(response.content)
        return this.questConfirm(message, msg, fLink, field, mode, id, category)
      }
    } catch(err) {
      field = `${fLink}Operation canceled cause no answer after 60 seconds.`
      msg.edit(field)
    }
  }

  async questConfirm(message, msg, fLink, field, mode, id, category) {
    if (mode === 'trial') {
      const dataByr = await this.dbByr.find({
        uid: id, 'record.trial.dbt': this.config[message.author.id][mode].type
      }).select({ _id: 1 }).lean()
      if (dataByr.length > 0) {
        field = `${fLink}Sorry this share link already claim our ${this.database[this.config[message.author.id][mode].type][0]} trial.`
        return msg ? msg.edit(field) : message.channel.send(field)
      }
    }
    const fCustom = !this.config[message.author.id][mode].custom ? '' : `💀 ***Custom Mode***\n`
    const fOperation = `🖥️ **${this._.capitalize(mode)} ${this.config[message.author.id][mode].total} Followers**\n`
    const fDatabase = mode === 'pull' ? '' : `${this.config[message.author.id][mode].type === 'v1' ? '🅰️' : '🅱️'} **${this.database[this.config[message.author.id][mode].type][0]} (${this.database[this.config[message.author.id][mode].type][1]})**\n`
    field = `${fLink}${fCustom}${fOperation}${fDatabase}<@${message.author.id}> Are you sure you want to process this operation?`
    msg = msg ? await msg.edit(field) : await message.channel.send(field)
    await msg.react('✅')
    await msg.react('❎')
    try {
      const filter = (reaction, user) => {
        return ['✅', '❎'].includes(reaction.emoji.name) && user.id === message.author.id
      }
      let reaction = await msg.awaitReactions(filter, {
        max: 1, time: 60000, errors: ['time']
      }), randTag
      reaction = reaction.first()
      await msg.reactions.removeAll()
      if (reaction.emoji.name === '❎') {
        field = `${fLink}Operation canceled.`
        return msg.edit(field)
      } else {
        if (mode !== 'pull') {
          while (true) {
            randTag = this.randString(8).toUpperCase()
            const dataByr = await this.dbByr.find({
              $or: [{ 'record.trial.tag': randTag }, { 'record.order.tag': randTag }],
            }).select({ _id: 1 }).lean()
            if (dataByr.length === 0) break
          }
        }
        const fTag = mode === 'pull' ? '' : `#️⃣ **${randTag}**\n`
        field = `${fLink}${fTag}${fOperation}${fDatabase}` + '⏳ ``OPERATION IN PROCESS!``'
        await msg.edit(field)
        let time = Date.now()
        if (mode === 'pull') await tools.mpf.run(id, category, this.config[message.author.id][mode].total, field, msg)
        else await tools.mif.run(this.config[message.author.id][mode].type, randTag, mode, id, category, this.config[message.author.id][mode].total, this.config[message.author.id][mode].delay, field, msg)
        time = Date.now() - time
        await this.recordSeller(message, mode, randTag, id, this.config[message.author.id][mode].total)
        field = `${fLink}${fTag}${fOperation}${fDatabase}🆗 Success in ${this.humanize(time)}\n`
        await msg.edit(field)
        if (mode === 'order') {
          delete this.config[message.author.id][mode]
        }
        const msg2 = await message.channel.send(`<@${message.author.id}>`)
        await this.delay(2000)
        msg2.delete()
      }
    } catch(err) {
      await msg.reactions.removeAll()
      field = `${fLink}Operation canceled cause no answer after 60 seconds.`
      msg.edit(field)
    }
  }
  
  async recordSeller(message, mode, tag, id, total) {
    if (mode === 'trial') {
      await this.dbSlr.findOneAndUpdate({
        uid: message.author.id
      }, {
        $push: {
          'record.trial': tag
        }
      })
    } else if (mode === 'order') {
      await this.dbSlr.findOneAndUpdate({
        uid: message.author.id
      }, {
        $push: {
          'record.order': {
            tag: tag,
            pay: {
              sts: this.seller.info.idType === 1 ? true : false
            }
          }
        }
      })
    } else {
      await this.dbSlr.findOneAndUpdate({
        uid: message.author.id
      }, {
        $push: {
          'record.pull': {
            uid: id,
            ttl: total,
            dte: this.moment().unix()
          }
        }
      })
    }
  }
}

module.exports = new InjectModel()