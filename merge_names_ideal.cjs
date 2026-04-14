const fs = require('fs');

const rawPath = 'src/data/exercises_raw.json';
const inglesPath = 'src/data/inglesdata.json';

const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8').replace(/^\uFEFF/, ''));
const inglesData = JSON.parse(fs.readFileSync(inglesPath, 'utf8').replace(/^\uFEFF/, ''));

if (rawData.length !== inglesData.length) {
    console.error("Lengths don't match, aborting!");
    process.exit(1);
}

let modified = 0;
for (let i = 0; i < rawData.length; i++) {
  const rawItem = rawData[i];
  const inglesItem = inglesData[i];
  
  let changed = false;
  
  if (rawItem.nombre_en !== inglesItem.name) {
    rawItem.nombre_en = inglesItem.name;
    changed = true;
  }
  
  // Fix broken ID and image links
  if (rawItem.id !== inglesItem.id) {
    rawItem.id = inglesItem.id;
    changed = true;
  }
  if (JSON.stringify(rawItem.imágenes) !== JSON.stringify(inglesItem.images)) {
    rawItem.imágenes = inglesItem.images;
    changed = true;
  }
  
  if (changed) {
    modified++;
  }
}

console.log('Modified items:', modified);
fs.writeFileSync(rawPath, JSON.stringify(rawData, null, 2), 'utf8');
