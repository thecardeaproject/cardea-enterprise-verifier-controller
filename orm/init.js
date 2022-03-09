const {Sequelize} = require('sequelize')

exports.connect = function () {
  const sequelize = new Sequelize(
    process.env.DB,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: 'postgres',
      logging: false, // console.log, // log to console or false (no logging of database queries)
      omitNull: true,
    },
  )

  return sequelize
}
