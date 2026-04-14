const fs = require('fs');

const rawPath = 'src/data/exercises_raw.json';
const inglesPath = 'src/data/inglesdata.json';

const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8').replace(/^\uFEFF/, ''));
const inglesData = JSON.parse(fs.readFileSync(inglesPath, 'utf8').replace(/^\uFEFF/, ''));

// Create a map from inglesData
const inglesMap = {};
for (const item of inglesData) {
  inglesMap[item.id] = item.name;
}

let modified = 0;
for (const item of rawData) {
  let enName = inglesMap[item.id];
  // Fallback if missing: try to derive from id
  if (!enName) {
     enName = item.id.replace(/_/g, ' ');
  }
  
  if (enName && item.nombre_en !== enName) {
    item.nombre_en = enName;
    modified++;
  }
}

console.log('Modified items:', modified);
fs.writeFileSync(rawPath, JSON.stringify(rawData, null, 2), 'utf8');
