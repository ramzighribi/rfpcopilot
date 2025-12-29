const XLSX = require('xlsx');
const path = require('path');

const file = process.argv[2] || '/Users/macramzi/Downloads/rfp-Questions_Dynamics_365_avec_reponses.xlsx';
console.log('Fichier:', file);

const workbook = XLSX.readFile(file);

workbook.SheetNames.forEach(sheetName => {
  console.log('\n========================================');
  console.log('Onglet:', sheetName);
  console.log('========================================');
  
  const ws = workbook.Sheets[sheetName];
  console.log('Plage originale (!ref):', ws['!ref']);
  
  // Décoder la plage
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    console.log('Première ligne de données:', range.s.r + 1, '(index', range.s.r, ')');
    console.log('Dernière ligne de données:', range.e.r + 1);
  }
  
  // Accès direct aux cellules
  console.log('\n--- Accès direct aux cellules A1-A15 ---');
  for (let r = 1; r <= 15; r++) {
    const cell = ws['A' + r];
    const value = cell ? String(cell.v).substring(0, 50) : '(cellule vide)';
    console.log(`Excel ligne ${r} (A${r}): ${value}`);
  }
  
  // sheet_to_json avec différentes options
  console.log('\n--- sheet_to_json (header:1, blankrows:true) ---');
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true });
  console.log('Nombre total de lignes retournées:', data.length);
  
  data.slice(0, 15).forEach((row, idx) => {
    const firstCell = row[0] ? String(row[0]).substring(0, 50) : '(vide)';
    const marker = (idx + 1 === 7) ? ' <-- LIGNE 7' : '';
    console.log(`Array index ${idx} => Ligne ${idx + 1}: ${firstCell}${marker}`);
  });
});
