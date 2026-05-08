import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcel = async (
  filename: string, 
  title: string, 
  columns: { header: string, key: string, width?: number }[], 
  data: any[]
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');

  // Add School Title and details
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'Shikshantar Academy';
  sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = 'Siraha, Nepal | +977-XXXXXXXXXX';
  sheet.getCell('A2').font = { size: 12, bold: true, color: { argb: 'FF666666' } };
  sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('A3:G3');
  sheet.getCell('A3').value = title;
  sheet.getCell('A3').font = { size: 14, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.addRow([]); // empty row for spacing

  // Setup columns
  sheet.columns = columns;
  const headerRow = sheet.getRow(5);
  headerRow.values = columns.map(c => c.header);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data
  data.forEach((row, index) => {
    const rowObj: Record<string, any> = {};
    columns.forEach(c => {
       rowObj[c.key] = row[c.key];
    });
    const addedRow = sheet.addRow(rowObj);
    // Alternate row colors for readibility
    if (index % 2 === 0) {
       addedRow.fill = {
         type: 'pattern',
         pattern: 'solid',
         fgColor: { argb: 'FFF9FAFB' }
       };
    }
    addedRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });

  // Basic column width adjustment
  sheet.columns.forEach((column) => {
    if (!column.width) {
       let maxLength = 10;
       column.eachCell?.({ includeEmpty: true }, (cell) => {
         const colLen = cell.value ? cell.value.toString().length : 10;
         if (colLen > maxLength) maxLength = colLen;
       });
       column.width = Math.min(maxLength + 2, 50); // Cap width at 50
    }
  });

  // Write and Save
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};
