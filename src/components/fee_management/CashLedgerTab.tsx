import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { Plus, Search, Calendar, Filter, Download, Trash2, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';
import { formatBSDate } from '../../lib/nepaliDate';
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import { exportToExcel } from '../../lib/excelExport';

interface CashLedgerTabProps {
  feeTransactions: any[];
}

export default function CashLedgerTab({ feeTransactions }: CashLedgerTabProps) {
  const [cashEntries, setCashEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Form State
  const [entryType, setEntryType] = useState('Expense');
  const [entryDate, setEntryDate] = useState(formatBSDate(new Date()) || '');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cash_ledger'), (snap) => {
      const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCashEntries(entries);
      setLoading(false);
    }, (err) => {
      console.warn("Failed to load cash ledger", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !entryDate) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'cash_ledger'), {
        type: entryType,
        date: entryDate,
        amount: Number(amount),
        category,
        remarks,
        timestamp: serverTimestamp()
      });
      setShowModal(false);
      setAmount('');
      setCategory('');
      setRemarks('');
      setEntryType('Expense');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'cash_ledger');
    }
    setSaving(false);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this cash entry?")) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'cash_ledger', id));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'cash_ledger');
    }
  };

  // Merge fee collections into the cash book
  const mergedLedger = [
    ...feeTransactions.filter(tx => tx.status === 'SUCCESS').map(tx => ({
      id: tx.id,
      type: 'Income',
      date: tx.date,
      amount: tx.amount,
      category: 'Fee Collection',
      remarks: `Receipt: ${tx.receipt || tx.id} - ${tx.studentName}`,
      isSystem: true,
      originalTx: tx
    })),
    ...cashEntries
  ];

  const filteredLedger = mergedLedger.filter(entry => {
    const matchType = filterType === 'All' || entry.type === filterType;
    const matchSearch = (entry.remarks?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                        (entry.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchFromDate = !fromDate || (entry.date && entry.date >= fromDate);
    const matchToDate = !toDate || (entry.date && entry.date <= toDate);
    return matchType && matchSearch && matchFromDate && matchToDate;
  }).sort((a, b) => {
    // Sort by date descending
    if (a.date !== b.date) return b.date > a.date ? 1 : -1;
    return 0;
  });

  const totalIncome = filteredLedger.filter(e => e.type === 'Income').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = filteredLedger.filter(e => e.type === 'Expense').reduce((sum, e) => sum + Number(e.amount), 0);
  const closingBalance = totalIncome - totalExpense;

  const handlePrintReceipt = (entry: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let detailsHtml = '';
    
    if (entry.isSystem && entry.originalTx) {
       const tx = entry.originalTx;
       let count = 1;
       
       if (tx.breakdown) {
          if (tx.breakdown.tuition) {
              detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td>Tuition Fee (${tx.breakdown.months?.join(', ') || ''})</td><td style="text-align: right;">${Number(tx.breakdown.tuition * (tx.breakdown.months?.length || 1)).toLocaleString()}</td></tr>`;
          }
          if (tx.breakdown.additional && tx.breakdown.additional.length > 0) {
              tx.breakdown.additional.forEach((add: any) => {
                  detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td>${add.name || add.type}</td><td style="text-align: right;">${Number(add.amount).toLocaleString()}</td></tr>`;
              });
          }
       } else if (tx.receiptMonthsData) {
          tx.receiptMonthsData.forEach((m: any) => {
              detailsHtml += `<tr><td colspan="3" style="font-weight: bold; background-color: #fef08a; padding: 8px 12px; font-size: 13px;">Month: ${m.month}</td></tr>`;
              if (m.tuition) detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td style="padding-left: 20px;">Tuition Fee</td><td style="text-align: right;">${Number(m.tuition).toLocaleString()}</td></tr>`;
              if (m.computer) detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td style="padding-left: 20px;">Computer Fee</td><td style="text-align: right;">${Number(m.computer).toLocaleString()}</td></tr>`;
              if (m.exam) detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td style="padding-left: 20px;">Exam Fee</td><td style="text-align: right;">${Number(m.exam).toLocaleString()}</td></tr>`;
              if (m.other) detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td style="padding-left: 20px;">Other Fee</td><td style="text-align: right;">${Number(m.other).toLocaleString()}</td></tr>`;
          });
          if (tx.otherFees && tx.otherFees.length > 0) {
              tx.otherFees.forEach((add: any) => {
                  detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td>${add.name}</td><td style="text-align: right;">${Number(add.amount).toLocaleString()}</td></tr>`;
              });
          }
          if (tx.discount) {
              detailsHtml += `<tr><td style="text-align: center;">${count++}</td><td>Discount</td><td style="text-align: right;">- ${Number(tx.discount).toLocaleString()}</td></tr>`;
          }
       } else {
          detailsHtml += `<tr><td style="text-align: center;">1</td><td>Fee Collection (${tx.months?.join(', ') || ''})</td><td style="text-align: right;">${Number(tx.amount).toLocaleString()}</td></tr>`;
       }
       
       detailsHtml += `
          <tr>
              <td colspan="2" style="text-align: right; border-left: none;">Total</td>
              <td style="border-right: none; text-align: right; font-weight: bold;">${Number(tx.amount).toLocaleString()}</td>
          </tr>
       `;
    } else {
       detailsHtml = `
          <tr>
              <td style="text-align: center;">1</td>
              <td>${entry.category || '-'} - ${entry.remarks || '-'}</td>
              <td style="text-align: right;">${Number(entry.amount).toLocaleString()}</td>
          </tr>
          <tr>
              <td colspan="2" style="text-align: right; border-left: none;">Total</td>
              <td style="border-right: none; text-align: right; font-weight: bold;">${Number(entry.amount).toLocaleString()}</td>
          </tr>
       `;
    }

    const receiptNo = entry.isSystem ? (entry.originalTx?.receipt || entry.id?.substring(0,8).toUpperCase()) : (entry.id ? entry.id.substring(0,8).toUpperCase() : `CASH-${Date.now().toString().slice(-4)}`);
    const studentName = entry.isSystem && entry.originalTx ? entry.originalTx.studentName : '';
    const className = entry.isSystem && entry.originalTx ? entry.originalTx.class : '';
    const section = entry.isSystem && entry.originalTx ? (entry.originalTx.section || '') : '';
    const rollNo = entry.isSystem && entry.originalTx ? (entry.originalTx.rollNo || '') : '';
    const monthsText = entry.isSystem && entry.originalTx ? (entry.originalTx.months?.join(', ') || '') : '';

    printWindow.document.write(`
      <html>
      <head>
          <title>Receipt - ${receiptNo}</title>
          <style>
              @page { size: auto; margin: 0; }
              body { background-color: #fff; font-family: 'Times New Roman', serif; padding: 20px; }
              .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; background-color: #fef9c3; padding: 0; }
              .text-center { text-align: center; }
              .header-text { margin: 5px 0; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 0 20px; }
              .line-input { border-bottom: 1px dashed #000; display: inline-block; min-width: 150px; font-style: normal; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; border-left: none; border-right: none; }
              th, td { border: 1px solid #000; padding: 10px; }
              th { background-color: #fef08a; }
              tr td:first-child, tr th:first-child { border-left: none; }
              tr td:last-child, tr th:last-child { border-right: none; }
          </style>
      </head>
      <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
          <div class="receipt-container">
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; padding-top: 15px;">
                  <div style="font-size: 16px;">Receipt</div>
                  <h1 style="margin: 5px 0; font-size: 28px; font-weight: bold; font-family: Arial, sans-serif;">SHIKSHANTAR ACADEMY</h1>
                  <p style="margin: 2px 0; font-size: 15px;">Siraha, Nepal</p>
                  <p style="margin: 2px 0; font-size: 15px;">Website: https://shikshantar.academy.nepalghum.xyz</p>
                  <p style="margin: 2px 0; font-size: 15px;">Contact: 01-1234567 Email: info@shikshantar.academy.nepalghum.xyz</p>
              </div>
              
              <div style="padding: 20px 20px 10px 20px;">
                  <span style="font-size: 18px;">Receipt No. <strong class="line-input">${receiptNo}</strong></span>
              </div>
              
              ${entry.isSystem ? `
              <div class="info-row">
                  <div style="flex: 1; font-size: 16px;">Name of Student: <strong class="line-input" style="min-width: 300px;">${studentName}</strong></div>
                  <div style="font-size: 16px;">Class: <strong class="line-input" style="min-width: 100px; text-align: center;">${className}</strong> 
                       Section: <strong class="line-input" style="min-width: 80px; text-align: center;">${section}</strong></div>
              </div>
              
              <div class="info-row">
                  <div style="flex: 1; font-size: 16px;">Roll No: <strong class="line-input" style="min-width: 150px;">${rollNo}</strong></div>
                  <div style="font-size: 16px;">Month: <strong class="line-input" style="min-width: 150px; text-align: center;">${monthsText}</strong></div>
              </div>` : `
              <div class="info-row">
                  <div style="flex: 1; font-size: 16px;">Date (B.S.): <strong class="line-input" style="min-width: 300px;">${entry.date}</strong></div>
                  <div style="font-size: 16px;">Type: <strong class="line-input" style="min-width: 100px; text-align: center;">${entry.type}</strong></div>
              </div>
              `}
              
              <table>
                  <thead>
                      <tr>
                          <th style="width: 80px; border-left: none;">Sr. No.</th>
                          <th>Particulars</th>
                          <th style="width: 150px; border-right: none;">Amount</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${detailsHtml}
                  </tbody>
              </table>

              <div style="padding: 30px 20px 10px 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                  <div style="font-size: 16px;">Paid By: <span style="text-decoration: underline; font-weight: bold;">${entry.isSystem && entry.originalTx ? (entry.originalTx.paymentMethod || 'Cash') : 'Cash'}</span></div>
                  <div style="text-align: center;">
                      <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; font-size: 16px;">Signature of Centre Head</div>
                  </div>
              </div>
              
              <div style="text-align: center; font-size: 12px; margin-top: 10px; border-top: 2px solid #000; padding: 10px;">
                  All above mentioned Amount once paid are non refundable in any case whatsoever.
              </div>
          </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExport = async () => {
    const columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Remarks', key: 'remarks', width: 40 },
      { header: 'Income (Dr.)', key: 'income', width: 15 },
      { header: 'Expense (Cr.)', key: 'expense', width: 15 },
    ];
    
    const data = filteredLedger.map(e => ({
      date: e.date,
      type: e.type,
      category: e.category,
      remarks: e.remarks,
      income: e.type === 'Income' ? e.amount : '',
      expense: e.type === 'Expense' ? e.amount : ''
    }));

    await exportToExcel('Cash_Book', 'Standard Cash Book', columns, data);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-800">Cash Book / Day Book</h2>
          <p className="text-sm text-gray-500 font-medium tracking-wide">Manage daily incomes and expenses</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5"/> Add Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden">
           <ArrowUpRight className="absolute -right-4 -top-4 w-24 h-24 text-emerald-500/10" />
           <p className="text-xs font-black uppercase tracking-widest text-emerald-600/70 mb-2">Total Incomes</p>
           <p className="text-3xl font-black text-emerald-600">रू {totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 relative overflow-hidden">
           <ArrowDownRight className="absolute -right-4 -top-4 w-24 h-24 text-red-500/10" />
           <p className="text-xs font-black uppercase tracking-widest text-red-600/70 mb-2">Total Expenses</p>
           <p className="text-3xl font-black text-red-600">रू {totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden">
           <p className="text-xs font-black uppercase tracking-widest text-blue-600/70 mb-2">Closing Balance</p>
           <p className="text-3xl font-black text-blue-600">रू {closingBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search remarks, category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        
        <div className="flex gap-2 min-w-max">
           <NepaliDatePicker
             value={fromDate}
             onChange={value => setFromDate(value)}
             inputClassName="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
             options={{ calenderLocale: 'ne', valueLocale: 'en' }}
           />
           <span className="self-center font-bold text-gray-400">-</span>
           <NepaliDatePicker
             value={toDate}
             onChange={value => setToDate(value)}
             inputClassName="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
             options={{ calenderLocale: 'ne', valueLocale: 'en' }}
           />
        </div>

        <select 
           value={filterType}
           onChange={e => setFilterType(e.target.value)}
           className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none min-w-max"
        >
           <option value="All">All Types</option>
           <option value="Income">Incomes Only</option>
           <option value="Expense">Expenses Only</option>
        </select>

        <button onClick={handleExport} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg flex items-center gap-2 transition-colors">
           <Download className="w-4 h-4"/> Export
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
           <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr className="text-[10px] uppercase font-black tracking-widest">
                 <th className="p-4 px-6">Date</th>
                 <th className="p-4">Category</th>
                 <th className="p-4">Remarks</th>
                 <th className="p-4 text-right">Income (Dr.)</th>
                 <th className="p-4 text-right">Expense (Cr.)</th>
                 <th className="p-4 w-10"></th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {filteredLedger.map((e, idx) => (
                 <tr key={e.id || idx} className="hover:bg-gray-50/50">
                    <td className="p-4 px-6 font-bold text-sm text-gray-800">{e.date}</td>
                    <td className="p-4 text-sm font-semibold text-gray-600">
                       <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-widest ${e.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {e.category}
                       </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 whitespace-normal min-w-[200px]">{e.remarks}</td>
                    <td className="p-4 text-right">
                       {e.type === 'Income' ? <span className="font-black text-emerald-600 text-sm">रू {Number(e.amount).toLocaleString()}</span> : '-'}
                    </td>
                    <td className="p-4 text-right">
                       {e.type === 'Expense' ? <span className="font-black text-red-600 text-sm">रू {Number(e.amount).toLocaleString()}</span> : '-'}
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-1"><button onClick={() => handlePrintReceipt(e)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Printer className="w-4 h-4"/></button>{!e.isSystem && (<button onClick={() => handleDeleteEntry(e.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                             <Trash2 className="w-4 h-4"/>
                          </button>)}</div></td>
                 </tr>
              ))}
              {filteredLedger.length === 0 && (
                 <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">No entries found</td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>

      {showModal && (
         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-primary">New Entry</h3>
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setEntryType('Income')} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${entryType === 'Income' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Income</button>
                    <button onClick={() => setEntryType('Expense')} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${entryType === 'Expense' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Expense</button>
                 </div>
               </div>

               <form onSubmit={handleSaveEntry} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date (B.S.)</label>
                     <NepaliDatePicker
                       value={entryDate}
                       onChange={value => setEntryDate(value)}
                       inputClassName="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                       options={{ calenderLocale: 'ne', valueLocale: 'en' }}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Amount (रू)</label>
                     <input required type="number" min="0" step="any" onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} value={amount} onChange={e => { const val = Number(e.target.value); setAmount(val >= 0 ? e.target.value : '0'); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-xl text-primary" placeholder="0" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                     <input required type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm text-gray-700" placeholder={entryType === 'Expense' ? "e.g. Stationary, Salary, Bill" : "e.g. Sale of old items"} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Remarks / Details</label>
                     <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm resize-none" placeholder="Provide any additional details..." rows={3}></textarea>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                     <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm transition-colors hover:bg-gray-200">Cancel</button>
                     <button type="submit" disabled={saving} className={`flex-1 px-4 py-2.5 text-white font-black rounded-xl text-sm transition-colors uppercase tracking-widest shadow-md ${entryType === 'Income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                        {saving ? 'Saving...' : 'Save Entry'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
