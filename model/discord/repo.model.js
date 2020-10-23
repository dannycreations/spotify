class RepoModel {
  constructor() {
    this.admin = require('./admin.model.js')
    this.check = require('./check.model.js')
    this.inject = require('./inject.model.js')
  }
}

module.exports = new RepoModel()