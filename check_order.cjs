const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('src/data/exercises_raw.json', 'utf8').replace(/^\uFEFF/, ''));
const inglesData = JSON.parse(fs.readFileSync('src/data/inglesdata.json', 'utf8').replace(/^\uFEFF/, ''));

console.log('raw length:', rawData.length);
console.log('ingles length:', inglesData.length);

let matches = 0;
for (let i = 0; i < rawData.length; i++) {
  // Check if they correspond by order
  // e.g. comparing equipment, force, or level
  if (rawData[i].nivel === 'principiante' && inglesData[i].level === 'beginner' ||
      rawData[i].nivel === 'intermedio' && inglesData[i].level === 'intermediate' ||
      rawData[i].nivel === 'experto' && inglesData[i].level === 'expert' ||
      rawData[i].nivel === inglesData[i].level) {
        matches++;
      }
}

console.log('Matches by order:', matches);
