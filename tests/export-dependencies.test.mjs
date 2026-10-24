import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const unzipper = require(require.resolve('unzipper', {paths: [require.resolve('exceljs')]}));

test('spreadsheet export preserves values and conditional formats with patched dependencies', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.addRow(['Campaign', 'Clicks']);
  sheet.addRow(['Synthetic campaign', 12]);
  sheet.addConditionalFormatting({ref: 'B2', rules: [{type: 'dataBar', minLength: 0, maxLength: 100, cfvo: [{type: 'min'}, {type: 'max'}], color: {argb: 'FF128C4A'}}]});
  const bytes = await workbook.xlsx.writeBuffer();
  assert.ok(bytes.byteLength > 1000);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(bytes);
  assert.equal(restored.worksheets[0].getCell('A2').value, 'Synthetic campaign');
  assert.equal(restored.worksheets[0].getCell('B2').value, 12);
  assert.equal(restored.worksheets[0].conditionalFormattings.length, 1);
  // Validate the resulting container with the overridden ZIP dependency too.
  // The application exports workbooks; it does not use ExcelJS streaming imports.
  const archive = await unzipper.Open.buffer(Buffer.from(bytes));
  const worksheet = archive.files.find(entry => entry.path === 'xl/worksheets/sheet1.xml');
  assert.ok(worksheet);
  assert.match((await worksheet.buffer()).toString(), /<v>12<\/v>/);
});
