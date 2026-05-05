import React, { useState, useRef } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';
import { Search, Printer, Edit2, CornerUpLeft, Download, Calendar, Filter, ChevronRight, ChevronDown, Receipt, FileDown, X } from 'lucide-react';
import { db } from '../../firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';
import NepaliDate from 'nepali-date-converter';

export default function TransactionHistoryTab({ transactionsData, onRefresh }: { transactionsData: any[], onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current || !receipt) return;
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (receiptRef.current.offsetHeight * pdfWidth) / receiptRef.current.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receipt.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  const filteredHistory = transactionsData.filter(tx => {
     const matchSearch = (tx.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.receipt?.toLowerCase().includes(searchTerm.toLowerCase()));
     const matchClass = filterClass === 'All' || tx.class === filterClass;
     const matchMethod = filterMethod === 'All' || tx.method === filterMethod;
     
     let txDateStr = '';
     if (tx.timestamp) {
         try {
             const d = new Date(tx.timestamp.seconds ? tx.timestamp.seconds * 1000 : tx.timestamp);
             const nd = new NepaliDate(d);
             txDateStr = nd.format("YYYY-MM-DD");
         } catch(e) {}
     }
     
     // Allow comparison by "YYYY-MM-DD"
     const matchFromDate = !fromDate || (txDateStr && txDateStr >= fromDate);
     const matchToDate = !toDate || (txDateStr && txDateStr <= toDate);

     return matchSearch && matchClass && matchMethod && matchFromDate && matchToDate;
  });

  const totalFilteredAmount = filteredHistory.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const exportCSV = () => {
     const headers = ['Date (B.S.)', 'Date (A.D.)', 'Receipt No', 'Student', 'Class', 'Amount', 'Method', 'Collected By', 'Status'];
     const csvRows = [headers.join(',')];
     
     filteredHistory.forEach(tx => {
        let adDate = '';
        if (tx.timestamp) {
            adDate = new Date(tx.timestamp.seconds ? tx.timestamp.seconds * 1000 : tx.timestamp).toLocaleString();
        }
        csvRows.push([
           tx.date,
           `"${adDate}"`,
           tx.receipt || tx.id,
           `"${tx.studentName || ''}"`,
           tx.class,
           tx.amount || 0,
           tx.method,
           tx.collectedBy,
           tx.status
        ].join(','));
     });
     
     const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.setAttribute('hidden', '');
     a.setAttribute('href', url);
     a.setAttribute('download', `Transactions_${formatBSDate(new Date())}.csv`);
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  };

  const handleEdit = async (tx: any) => {
    // Basic frontend safety
    const newAmount = prompt("Enter new amount (leave empty to skip):", String(tx.amount));
    const newMethod = prompt("Enter new method (Cash, Khalti, etc) or skip:", tx.method);
    const reason = prompt("Enter reason for editing this transaction:");
    if (reason && newAmount) {
       try {
           const batch = writeBatch(db);
           const txRef = doc(db, 'transactions', tx.id);
           batch.update(txRef, {
               amount: Number(newAmount),
               method: newMethod || tx.method,
               remarks: (tx.remarks ? tx.remarks + ' | ' : '') + `Edited: ${reason}`
           });
           await batch.commit();
           onRefresh();
       } catch (err) {
           console.error(err);
           alert("Failed to edit transaction");
       }
    }
  };

  const handleRefund = async (tx: any) => {
      if (confirm(`Are you sure you want to refund NRs. ${tx.amount} to ${tx.studentName}?`)) {
          try {
             const batch = writeBatch(db);
             
             // 1. Mark transaction as refunded
             const txRef = doc(db, 'transactions', tx.id);
             batch.update(txRef, { status: 'REFUNDED' });

             // 2. Revert studentFees to 'due'
             if (tx.months && Array.isArray(tx.months)) {
                 tx.months.forEach((m: string) => {
                     const feeRef = doc(db, 'studentFees', `${tx.studentId}_${m}`);
                     // This is a naive reversal; it assumes the full tuition was due.
                     // In a real app, fee structure calculation would be more robust.
                     batch.update(feeRef, {
                         status: 'due',
                         paidAmount: 0
                     });
                 });
             }

             await batch.commit();
             onRefresh();
          } catch(err) {
             console.error("Refund failed", err);
             alert("Failed to refund payment");
          }
      }
  };

  return (
    <div className="space-y-6 pb-24">
       {/* Filters */}
       <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
           <input 
             type="text" 
             placeholder="Search receipt no or student..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all outline-none"
           />
         </div>

         <div className="flex gap-2 w-full md:w-auto overflow-visible pb-2 md:pb-0 flex-wrap">
            <div className="relative shrink-0 flex items-center gap-2">
               <div className="relative z-50 nepali-datepicker-container">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                 <NepaliDatePicker
                   value={fromDate}
                   onChange={value => setFromDate(value)}
                   inputClassName="w-40 pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                   className=""
                   options={{ calenderLocale: 'ne', valueLocale: 'en' }}
                 />
                 {fromDate && (
                    <button onClick={() => setFromDate('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                        <X className="w-4 h-4" />
                    </button>
                 )}
               </div>
               <span className="text-gray-400 font-bold text-xs">-</span>
               <div className="relative z-50 nepali-datepicker-container">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                 <NepaliDatePicker
                   value={toDate}
                   onChange={value => setToDate(value)}
                   inputClassName="w-40 pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                   className=""
                   options={{ calenderLocale: 'ne', valueLocale: 'en' }}
                 />
                 {toDate && (
                    <button onClick={() => setToDate('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                        <X className="w-4 h-4" />
                    </button>
                 )}
               </div>
            </div>

            <select 
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0"
            >
              <option value="All">All Classes</option>
              {['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
            
            <select 
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0"
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="eSewa">eSewa</option>
              <option value="Khalti">Khalti</option>
            </select>

            <button onClick={exportCSV} className="bg-orange-50 border border-orange-100 text-orange-600 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-widest hover:bg-orange-100 transition-colors shrink-0 flex gap-2 items-center">
               <Download className="w-4 h-4"/> Export
            </button>
         </div>
       </div>

       {/* Summary Bar */}
       <div className="bg-[#1e3a8a] text-white p-4 rounded-xl shadow-md flex justify-between items-center animate-in fade-in">
          <p className="text-xs font-bold uppercase tracking-widest text-[#93c5fd]">Showing {filteredHistory.length} transactions</p>
          <div className="text-right">
             <p className="text-[10px] font-bold uppercase tracking-widest text-[#93c5fd] mb-0.5">Total Amount</p>
             <p className="text-xl font-black">NRs. {totalFilteredAmount.toLocaleString()}</p>
          </div>
       </div>

       {/* Desktop Table View */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
         <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
               <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 px-6">Date (B.S. & A.D.)</th>
                  <th className="p-4">Receipt No</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Class</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Method</th>
                  <th className="p-4">Collected By</th>
                  <th className="p-4 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {filteredHistory.map(tx => (
                  <tr key={tx.id} className={`hover:bg-blue-50/20 transition-colors group ${tx.status === 'REFUNDED' ? 'opacity-50 line-through' : ''}`}>
                     <td className="p-4 px-6">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-gray-700">{tx.date}</span>
                           {tx.timestamp && (
                              <span className="text-[10px] text-gray-400 font-medium mt-0.5" title="A.D. Date and Time">
                                {new Date(tx.timestamp.seconds ? tx.timestamp.seconds * 1000 : tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp.seconds ? tx.timestamp.seconds * 1000 : tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           )}
                        </div>
                     </td>
                     <td className="p-4 text-xs font-mono font-black text-[#1e3a8a] bg-blue-50/50 rounded-md px-2 py-1 inline-block mt-3">{(tx.receipt || tx.id).slice(-6).toUpperCase()}</td>
                     <td className="p-4 font-bold text-gray-800 text-sm">{tx.studentName} {tx.status === 'REFUNDED' && <span className="text-[10px] text-red-500 font-bold ml-2">REFUNDED</span>}</td>
                     <td className="p-4 text-xs font-black text-gray-500">{tx.class || '-'}</td>
                     <td className="p-4 text-right font-black text-[#059669] text-sm">रू {(tx.amount||0).toLocaleString()}</td>
                     <td className="p-4 text-center">
                        <span className="text-[10px] font-black tracking-widest uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{tx.method}</span>
                     </td>
                     <td className="p-4 text-[10px] font-bold text-gray-500 uppercase">{tx.collectedBy}</td>
                     <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                           <button onClick={() => setReceipt(tx)} className="p-2 bg-transparent text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Reprint Receipt"><Printer className="w-4 h-4"/></button>
                           {tx.status !== 'REFUNDED' && (
                               <>
                                   <button onClick={() => handleEdit(tx)} className="p-2 bg-transparent text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200" title="Edit"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={() => handleRefund(tx)} className="p-2 bg-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Refund/Cancel"><CornerUpLeft className="w-4 h-4"/></button>
                               </>
                           )}
                        </div>
                     </td>
                  </tr>
               ))}
               {filteredHistory.length === 0 && (
                  <tr>
                     <td colSpan={8} className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions found</td>
                  </tr>
               )}
            </tbody>
         </table>
       </div>

       {/* Receipt Modal */}
       {receipt && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div ref={receiptRef} className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar bg-white">
                
                <div className="text-center mb-6 border-b border-gray-200 pb-6">
                  <div className="mx-auto mb-3 flex items-center justify-center">
                    <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Shikshantar Academy Logo" className="w-16 h-16 object-contain" />
                  </div>
                  <h2 className="font-black text-xl text-[#1e3a8a] uppercase tracking-widest">Shikshantar Academy</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-center gap-1 mt-1">Siraha, Nepal</p>
                  <div className="mt-4 inline-block bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-200">
                     Payment Receipt
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
                    <div>
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Receipt No</span>
                      <span className="text-gray-800 font-mono font-black">{receipt.receipt || receipt.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Date</span>
                      <span className="text-gray-800 font-bold block">{receipt.date} <span className="text-[10px] text-gray-400 font-normal ml-1 border pl-1 border-y-0 border-r-0 border-gray-300">B.S.</span></span>
                      {receipt.timestamp && (
                        <span className="block text-[10px] text-gray-500 mt-1 font-mono">
                           {new Date(receipt.timestamp.seconds ? receipt.timestamp.seconds * 1000 : receipt.timestamp).toLocaleDateString()} {new Date(receipt.timestamp.seconds ? receipt.timestamp.seconds * 1000 : receipt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border border-gray-100 rounded-xl">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500 font-bold">Student Name</span>
                      <span className="text-gray-800 font-black">{receipt.studentName}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500 font-bold">Class | ID</span>
                      <span className="text-gray-800 font-bold text-right">{receipt.class}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                     {receipt.months?.length > 0 && receipt.months.map((m: string) => (
                       <div key={m} className="flex justify-between text-sm mb-2 pb-2 border-b border-blue-100 last:border-0 last:mb-0 last:pb-0">
                         <span className="text-blue-800 font-bold">{m} Tuition</span>
                         <span className="text-blue-900 font-black">रू {receipt.amount / receipt.months.length}</span>
                       </div>
                     ))}
                     {!receipt.months?.length && (
                        <div className="flex justify-between text-sm">
                         <span className="text-blue-800 font-bold">Tuition Payment</span>
                         <span className="text-blue-900 font-black">रू {receipt.amount}</span>
                       </div>
                     )}
                  </div>

                  <div className="mt-6 border-t border-b border-gray-200 py-4 divide-y divide-gray-100">
                    <div className="flex justify-between items-center pb-3">
                      <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Total Paid</span>
                      <span className="text-2xl font-black text-gray-800">रू {(receipt.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-1 text-sm">
                      <span className="font-bold text-gray-500">Method: <span className="text-gray-800">{receipt.method}</span></span>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-between items-end text-xs pt-8 border-t border-gray-100">
                    <div>
                      <span className="text-gray-400 font-bold block mb-1">Collected by: </span>
                      <span className="text-gray-800 font-black">{receipt.collectedBy}</span>
                    </div>
                    <div className="border-t-2 border-gray-800 w-32 text-center pt-2 font-bold text-gray-800">
                      Signature
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Namaste, we have received a payment of NRs. ${receipt.amount} for ${receipt.studentName}. Receipt No: ${receipt.receipt || receipt.id}. Thank you.`)}`, '_blank')} className="w-full py-3 bg-[#25D366] text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-colors">
                   📱 Send WhatsApp Confirmation
                </button>
                <div className="flex gap-3">
                   <button onClick={() => setReceipt(null)} className="flex-1 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-600 uppercase tracking-widest text-[10px] sm:text-xs transition-colors hover:bg-gray-100">Close</button>
                   <button onClick={downloadReceipt} className="flex-1 py-3 bg-blue-600 text-white border border-blue-600 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors"><FileDown className="w-4 h-4"/> Download A5 PDF</button>
                </div>
              </div>
           </div>
         </div>
       )}
    </div>
  );
}
