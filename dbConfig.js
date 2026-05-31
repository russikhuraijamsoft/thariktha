const sql = require('mssql');

const config = {
  user: process.env.DB_USER,       // leave blank if using Entra ID
  password: process.env.DB_PASS,   // leave blank if using Entra ID
  server: process.env.DB_SERVER,   // e.g. cricketclosetdb.database.windows.net
  database: process.env.DB_NAME,   // CricketClosetERP
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

module.exports = config;
