const oracledb = require('oracledb');
require('dotenv').config();
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
let pool;

async function initPool() {
pool = await oracledb.createPool({
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
connectString: process.env.DB_CONNECT_STRING,
poolMin: 1,
poolMax: 5,
poolIncrement: 1
});
console.log('Pool Oracle iniciado');
}

async function closePool() {
if (pool) await pool.close(10);
}

async function execute(sql, binds = {}, options = {}) {
let conn;
try {
conn = await pool.getConnection();
const result = await conn.execute(sql, binds, options);
return result;
} finally {
if (conn) await conn.close();
}
}

module.exports = { initPool, closePool, execute, oracledb };