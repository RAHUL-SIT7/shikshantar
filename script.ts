import fs from 'fs';
let content = fs.readFileSync('src/components/fee_management/CashLedgerTab.tsx', 'utf-8');
content = content.replace(
  /{!e.isSystem && \(\n *<button onClick={\(\) => handleDeleteEntry\(e.id\)}/g,
  '<div className="flex justify-end gap-1"><button onClick={() => handlePrintReceipt(e)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Printer className="w-4 h-4"/></button>{!e.isSystem && (<button onClick={() => handleDeleteEntry(e.id)}'
);
content = content.replace(/<\/button>\n *\)}\n *<\/td>/g, '</button>)}</div></td>');
fs.writeFileSync('src/components/fee_management/CashLedgerTab.tsx', content);
