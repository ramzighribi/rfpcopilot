const XLSX = require('xlsx');
const wb = XLSX.readFile('/Users/macramzi/Downloads/rfp-Questions_Dynamics_365_avec_reponses.xlsx');
const ws = wb.Sheets['Sales & Marketing'];

console.log('Plage:', ws['!ref']);
console.log('');
console.log('Toutes les cellules ligne 1:');
['A','B','C','D','E'].forEach(c => {
  const cell = ws[c + '1'];
  console.log(c + '1:', cell ? cell.v : '(vide)');
});

console.log('');
console.log('Toutes les cellules ligne 7:');
['A','B','C','D','E'].forEach(c => {
  const cell = ws[c + '7'];
  console.log(c + '7:', cell ? cell.v : '(vide)');
});
