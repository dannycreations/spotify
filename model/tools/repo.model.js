class RepoModel {
  constructor() {
    this.bdg = require('./bdg.model.js')
    
    this.mca = require('./mca.model.js')
    this.mcp = require('./mcp.model.js')
    this.mif = require('./mif.model.js')
    this.mpf = require('./mpf.model.js')
    this.mvd = require('./mvd.model.js')
  }
}

module.exports = new RepoModel()