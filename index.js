const client = require('./model/index.model.js')
const tools = require('./model/tools/repo.model.js')

class Index extends client.IndexModel {
  constructor() {
    super()
  }
  
  async run() {
    this.watermark()
    const question = [{
      type: 'list',
      name: 'tools',
      message: 'Select tools:',
      choices: [
        'Mass Inject Followers',
        'Mass Pull Followers',
        'Mass Verify dbBot',
        '*MCA (Register)',
        '*MCA (Verify)',
        '*MCA (Recovery)',
        '*MCA (Clean Inbox)',
        '*Mass Hcp dbBot',
        '*Mass Hfr dbBot',
        '*Bridge'
      ] 
    }]
    const choise = await this.inquirer.prompt(question)
    switch (choise.tools) {
      case 'Mass Inject Followers':
        return tools.mif.prompt()
      break
      case 'Mass Pull Followers':
        return tools.mpf.prompt()
      break
      case 'Mass Verify dbBot':
        return tools.mvd.run()
      break
      case '*MCA (Register)':
        return tools.mca.run()
      break
      case '*MCA (Verify)':
        return tools.mca.run2()
      break
      case '*MCA (Recovery)':
        return tools.mca.run3()
      break
      case '*MCA (Clean Inbox)':
        return tools.mca.run4()
      break
      case '*Mass Hcp dbBot':
        return tools.mcp.run()
      break
      case '*Mass Hfr dbBot':
        return tools.mif.run2()
      break
      case '*Bridge':
        return tools.bdg.run()
      break
    }
  }
  
  watermark() {
    const data = 'ICAgICAgXyAgICAgICAgICAgICAgICAgIF8KICAgICB8IHwgICAgICAgICAgICAgICAgfCB8CiAgIF9ffCB8XyBfXyAgXyAgIF8gIF9fX3wgfF8gX19fCiAgLyBfJyB8ICdfIFxcfCB8IHwgfC8gX198IF9fLyBfX3wKIHwgfF98IHwgfCB8IHwgfF98IHwgfF9ffCB8X1xcX18gXAogIFxcX18sX3xffCB8X3xcXF9fLCB8XFxfX198XFxfX3xfX18vCiAgICAgICAgICAgICAgIF9fLyB8CiAgICAgICAgICAgICAgfF9fXy8'
    console.log(this.chalk`{bold.green ${Buffer.from(data, 'base64').toString().split('\\\\').join('\\')}\n}`)
  }
}

(() => {
  const index = new Index()
  index.run()
})()