const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'smart_helper.db');
const schemaFile = path.join(__dirname, 'schema.sql');
const seedFile = path.join(__dirname, 'seed.sql');

const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function initializeDatabase() {
  const schemaSql = fs.readFileSync(schemaFile, 'utf8');
  await executeScript(schemaSql);

  const hasHelpers = await get('SELECT COUNT(*) AS count FROM helpers');
  if (!hasHelpers || hasHelpers.count === 0) {
    const seedSql = fs.readFileSync(seedFile, 'utf8');
    await executeScript(seedSql);
  }
}

async function executeScript(script) {
  const statements = script
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await run(`${statement};`);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase,
};
