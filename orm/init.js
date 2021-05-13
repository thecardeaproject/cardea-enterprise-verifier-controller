const {Sequelize} = require('sequelize')

exports.connect = function () {
  const sequelize = new Sequelize('development', 'development', 'development', {
    host: 'verifier-db',
    dialect: 'postgres',
    logging: false, // console.log, // log to console or false (no logging of database queries)
    omitNull: true,
  })

  return sequelize
}
