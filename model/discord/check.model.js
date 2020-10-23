const client = require('./../index.model.js')

class CheckModel extends client.IndexModel {
  constructor() {
    super()
    this.config
  }
  
  async run(message, args) {
    let field
    if (args.length !== 1) {
      field = '```' + `${this.dconfig.prefix}check or ${this.dconfig.prefix}c <share link>` + '```'
      return message.channel.send(field)
    }
    const category = args[0].split('/')[3]
    if (!['user', 'artist', 'playlist'].includes(category)) {
      field = 'Only support checking for user/artist and playlist.'
      return message.channel.send(field)
    }
    const id = args[0].split('/')[4].split('?')[0]
    this.config = this.randAppConfig()
    let dataBot = await this.dbBot.find({
      'info.dbType': 'v1', 'info.blacklist.sts': false
    }).limit(1).select({ uid: 1, login: 1 }).lean()
    dataBot = await this.checkToken(this.config, dataBot[0])
    if (!dataBot) throw new Error('Error, please contact the owner!')
    this.check(message, id, category, dataBot.login.token)
  }
  
  async check(message, id, category, token) {
    try {
      this.config.app_headers['authorization'] = `Bearer ${token}`
      const res = await this.got.get(`https://api.spotify.com/v1/${category}s/${id}`, {
        headers: this.config.app_headers,
        responseType: 'json'
      })
      if (res.statusCode === 200) {
        let thumb_photo, field1 = '', field2 = ''
        const embed = new this.discord.MessageEmbed()
        embed.setColor('#0099ff')
        embed.setTitle('Open in Spotify ↗')
        embed.setURL(res.body.external_urls.spotify)
        if (res.body.images.length > 0) thumb_photo = res.body.images[0].url
        else thumb_photo = this.dconfig.webserver.replace('{0}', 'momo-1.jpg')
        embed.setAuthor(res.body.id, thumb_photo)
        embed.setThumbnail(thumb_photo)
        if (category === 'user') field1 += `**Name:** ${res.body.display_name}\n`
        else field1 += `**Name:** ${res.body.name}\n`
        field1 += `**Followers:** ${(res.body.followers.total).toLocaleString()}\n`
        if (category === 'artist') {
          field1 += `**Popularity:** ${(res.body.popularity).toLocaleString()}\n`
          if (res.body.genres.length > 0) field1 += `**Genres:** ${res.body.genres[0]}\n`
        } else if (category === 'playlist') {
          field1 += `**Tracks:** ${(res.body.tracks.total).toLocaleString()}\n`
          if (res.body.description) field1 += `**Description:** ${res.body.description}\n`
          field1 += `**Public:** ${res.body.public}\n`
          field1 += `**Collaborative:** ${res.body.collaborative}\n`
          field2 += `**Name:** ${res.body.owner.display_name}\n`
          field2 += `**ID:** ${res.body.owner.id}\n`
        }
        embed.addField(`${this._.capitalize(category)} Info`, field1)
        if (field2) embed.addField('Owner Info', field2)
        embed.setFooter(message.author.username, message.author.displayAvatarURL())
        embed.setTimestamp()
        await message.channel.send(embed)
        message.channel.send(`<${message.content.split(' ')[1]}>`)
      }
    } catch(err) {
      if (err.response.statusCode === 404) {
        const f_link = `> <${message.content.split(' ')[1]}>\n`
        const field = `${f_link}<@${message.author.id}> ${err.response.body.error.message}`
        return message.channel.send(field)
      }
      this.errorHandle('discord_check', err, message)
    }
  }
}

module.exports = new CheckModel()