const XLSX = require('xlsx');

const file = '/Users/macramzi/Downloads/rfp-Questions_Dynamics_365_avec_reponses.xlsx';
console.log('Test de la nouvelle méthode de lecture');
console.log('Fichier:', file);

const workbook = XLSX.readFile(file);

workbook.SheetNames.forEach(sheetName => {
  console.log('\n========================================');
  console.log('Onglet:', sheetName);
  console.log('========================================');
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Nouvelle méthode: accès direct aux cellules
  const ref = worksheet['!ref'];
  if (!ref) {
    console.log('Onglet vide');
    return;
  }
  
  const range = XLSX.utils.decode_range(ref);
  const lastCol = range.e.c;
  const lastRow = range.e.r;
  
  console.log('Plage:', ref);
  console.log('Dernière ligne:', lastRow + 1, '/ Dernière colonne:', lastCol + 1);
  
  // Construire rawData comme dans le nouveau code
  const rawData = [];
  for (let r = 0; r <= lastRow; r++) {
    const row = [];
    for (let c = 0; c <= lastCol; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddress];
      row.push(cell ? cell.v : '');
    }
    rawData.push(row);
  }
  
  console.log('\nNouvelle méthode (accès direct aux cellules):');
  console.log('Nombre de lignes:', rawData.length);
  
  rawData.slice(0, 15).forEach((row, idx) => {
    const excelRow = idx + 1;
    const firstCell = row[0] ? String(row[0]).substring(0, 50) : '(vide)';
    const marker = excelRow === 7 ? ' <-- LIGNE 7' : '';
    console.log(`Excel ligne ${excelRow}: ${firstCell}${marker}`);
  });
});
