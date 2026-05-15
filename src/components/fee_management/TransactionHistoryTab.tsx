import React, { useState, useRef, useEffect } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';
import { Search, Printer, Edit2, CornerUpLeft, Download, Calendar, Filter, ChevronRight, ChevronDown, Receipt, FileDown, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { db } from '../../firebase';
import { collection, doc, writeBatch, query, where, getDocs, deleteField } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';
import NepaliDate from 'nepali-date-converter';
import { exportToPDF } from '../../lib/pdfExport';
import { exportToExcel, exportMultiSheetExcel } from '../../lib/excelExport';

export default function TransactionHistoryTab({ transactionsData, studentsData = [], onRefresh, initialSearchTerm = '', onSearchTermChange }: { transactionsData: any[], studentsData?: any[], onRefresh: () => void, initialSearchTerm?: string, onSearchTermChange?: (val: string) => void }) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
     setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const handleSearchChange = (val: string) => {
     setSearchTerm(val);
     if (onSearchTermChange) onSearchTermChange(val);
  };
  const [filterClass, setFilterClass] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterCollectedBy, setFilterCollectedBy] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [editModalTx, setEditModalTx] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [refundModalTx, setRefundModalTx] = useState<any>(null);
  const [refundPassword, setRefundPassword] = useState('');
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current || !receipt) return;
    try {
      const el = receiptRef.current;
      const w = el.offsetWidth;
      const h = el.scrollHeight;
      const dataUrl = await toPng(el, { 
        cacheBust: true, 
        pixelRatio: 2,
        width: w,
        height: h,
        style: { width: `${w}px`, height: `${h}px`, transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const pdfWidth = 210;
      const pdfHeight = (h * pdfWidth) / w;
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receipt.receipt || receipt.receiptNo || receipt.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  const handleBrowserPrint = () => {
     if (!receiptRef.current || !receipt) return;
     const printWindow = window.open('', '_blank');
     if (printWindow) {
         const studentName = receipt.studentName || '';
         const rollNo = receipt.rollNo || '-';
         const className = receipt.class || '';
         const section = receipt.section || 'A';
         const receiptNo = receipt.receipt || receipt.receiptNo || receipt.id || '-';
         const method = receipt.method || 'Cash';
         const amount = receipt.amount || 0;
         
         const monthsText = receipt.months?.join(', ') || '';
         
         let breakdownRows = '';
         
         let totalTuition = 0;
         let totalExam = 0;
         let totalComputer = 0;
         let totalExtra = 0;
         let totalAdmission = 0;

         if (receipt.receiptMonthsData?.length > 0) {
             receipt.receiptMonthsData.forEach((md: any) => {
                 if (md.breakdown) {
                     totalTuition += Number(md.breakdown.tuition || 0);
                     totalExam += Number(md.breakdown.exam || 0);
                     totalComputer += Number(md.breakdown.computer || 0);
                     totalExtra += Number(md.breakdown.other || 0) + Number(md.breakdown.transport || 0);
                 } else {
                     totalTuition += Number(md.totalFee || 0);
                 }
             });
         } else if (receipt.months?.length > 0) {
             totalTuition += receipt.amount;
         } else {
             // Fallback for single generic payment
             totalExtra += receipt.amount;
         }
         
         if (receipt.otherFees?.length > 0) {
             receipt.otherFees.forEach((f: any) => {
                 if (f.name.toLowerCase().includes('admission')) {
                     totalAdmission += Number(f.amount);
                 } else {
                     totalExtra += Number(f.amount);
                 }
             });
         }

         let srNo = 1;
         const addRow = (name: string, amt: number) => {
             if (amt > 0 || name === 'Monthly Fee' || name === 'Admission Fee') {
                 breakdownRows += `
                   <tr>
                      <td style="border: 1px solid #000; padding: 8px; text-align: center; border-left: none;">${srNo++}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${name}</td>
                      <td style="border: 1px solid #000; padding: 8px; text-align: right; border-right: none;">${amt > 0 ? amt.toLocaleString() : ''}</td>
                   </tr>
                 `;
             }
         };

         addRow('Admission Fee', totalAdmission);
         addRow('Monthly Fee', totalTuition);
         addRow('Exam Fee', totalExam);
         addRow('Computer Fee', totalComputer);
         addRow('Extra Fee', totalExtra);
         
         if (receipt.discount > 0) {
             breakdownRows += `
                 <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; border-left: none;">${srNo++}</td>
                    <td style="border: 1px solid #000; padding: 8px;">Adjustment/Discount</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right; border-right: none;">- ${Number(receipt.discount).toLocaleString()}</td>
                 </tr>
             `;
         }

         printWindow.document.write(`
             <html>
                 <head>
                     <title>Print Receipt</title>
                     <style>
                         @page { size: auto; margin: 0; }
                         body { background-color: #fff; font-family: 'Times New Roman', serif; padding: 20px; }
                         .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; background-color: #ffffe0; padding: 0; }
                         .text-center { text-align: center; }
                         .header-text { margin: 5px 0; }
                         .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 0 20px; }
                         .line-input { border-bottom: 1px dashed #000; display: inline-block; min-width: 150px; font-style: normal; }
                         table { width: 100%; border-collapse: collapse; margin-top: 10px; border-left: none; border-right: none; }
                         th, td { border: 1px solid #000; padding: 10px; }
                         th { background-color: #f0f0c9; }
                         tr td:first-child, tr th:first-child { border-left: none; }
                         tr td:last-child, tr th:last-child { border-right: none; }
                     </style>
                 </head>
                 <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
                     <div class="receipt-container">
                         <div style="display: flex; align-items: center; justify-content: center; border-bottom: 2px solid #000; padding-bottom: 15px; padding-top: 15px;">
                             <img src="https://ui-avatars.com/api/?name=E+S&background=10b981&color=fff&size=100&bold=true" alt="Logo" style="width: 80px; height: 80px; border-radius: 8px; object-fit: contain; margin-right: 20px;" />
                             <div class="text-center">
                                 <div style="font-size: 16px;">Receipt</div>
                                 <h1 style="margin: 5px 0; font-size: 28px; font-weight: bold; font-family: Arial, sans-serif;">SHIKSHANTAR ACADEMY</h1>
                                 <p style="margin: 2px 0; font-size: 15px;">Siraha, Nepal</p>
                                 <p style="margin: 2px 0; font-size: 15px;">Website: https://shikshantar.academy.nepalghum.xyz</p>
                                 <p style="margin: 2px 0; font-size: 15px;">Contact: 01-1234567 Email: info@shikshantar.academy.nepalghum.xyz</p>
                             </div>
                         </div>
                         
                         <div style="padding: 20px 20px 10px 20px;">
                             <span style="font-size: 18px;">Receipt No. <strong class="line-input">${receiptNo}</strong></span>
                         </div>
                         
                         <div class="info-row">
                             <div style="flex: 1; font-size: 16px;">Name of Student: <strong class="line-input" style="min-width: 300px;">${studentName}</strong></div>
                             <div style="font-size: 16px;">Class: <strong class="line-input" style="min-width: 100px; text-align: center;">${className}</strong> 
                                  Section: <strong class="line-input" style="min-width: 80px; text-align: center;">${section}</strong></div>
                         </div>
                         
                         <div class="info-row">
                             <div style="flex: 1; font-size: 16px;">Roll No: <strong class="line-input" style="min-width: 150px;">${rollNo}</strong></div>
                             <div style="font-size: 16px;">Month: <strong class="line-input" style="min-width: 150px; text-align: center;">${monthsText}</strong></div>
                         </div>
                         
                         <table>
                             <thead>
                                 <tr>
                                     <th style="width: 80px; border-left: none;">Sr. No.</th>
                                     <th>Particulars</th>
                                     <th style="width: 150px; border-right: none;">Amount</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 ${breakdownRows}
                                 <tr>
                                     <td colspan="2" style="text-align: right; font-weight: bold; font-family: Arial, sans-serif; font-size: 18px; border-left: none;">Total</td>
                                     <td style="text-align: right; font-weight: bold; font-family: Arial, sans-serif; font-size: 18px; border-right: none;">${amount.toLocaleString()}</td>
                                 </tr>
                             </tbody>
                         </table>
                         
                         <div style="margin-top: 40px; padding: 0 20px 20px 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                             <div>
                                 <p style="margin-bottom: 20px; font-size: 16px;">Paid By: <strong style="border-bottom: 2px dashed #000; font-family: Arial, sans-serif;">${method}</strong></p>
                                 <p style="font-size: 18px;">Signature of Centre Head</p>
                             </div>
                             <div style="text-align: right;">
                               <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Receipt%3A%20${receiptNo}%0AStudent%3A%20${encodeURIComponent(studentName)}%0AAmount%3A%20NRs.${amount}%0ADate%3A%20${receipt.date?.split('T')[0] || formatBSDate(new Date())}" style="width: 100px; height: 100px;" alt="QR Code" />
                             </div>
                         </div>
                         
                         <div style="border-top: 2px solid #000; padding: 10px; text-align: center; font-size: 14px; font-weight: bold;">
                             Digital Receipt No: ${receiptNo} | All above mentioned Amount once paid are non refundable in any case whatsoever.
                         </div>
                     </div>
                 </body>
             </html>
         `);
         printWindow.document.close();
     }
  };

  const generatePDFReport = async () => {
      const columns = ['Date (B.S.)', 'Receipt No', 'Student Name', 'Class', 'Amount', 'Method', 'Status'];
      const body = filteredHistory.map(tx => [
          tx.date,
          tx.receipt || tx.id,
          tx.studentName,
          tx.class,
          `NRs. ${tx.amount}`,
          tx.method,
          tx.status
      ]);

      await exportToPDF('Fee Payment Report', columns, body, `Transaction_Report_${formatBSDate(new Date())}`, false);
  };

  const enrichedTransactions = transactionsData.map(tx => {
     const student = studentsData?.find(s => s.id === tx.studentId);
     return {
         ...tx,
         studentName: tx.studentName || student?.name || '',
         class: tx.class || student?.class || ''
     };
  });

  const filteredHistory = enrichedTransactions.filter(tx => {
     const st = (searchTerm || '').toLowerCase();
     const studentNameMatch = tx.studentName ? String(tx.studentName).toLowerCase().includes(st) : false;
     const idMatch = tx.id ? String(tx.id).toLowerCase().includes(st) : false;
     const studentIdMatch = tx.studentId ? String(tx.studentId).toLowerCase().includes(st) : false;
     const actualDisplayIdMatch = tx.studentId ? String(tx.studentId).toLowerCase().includes(st) : false;
     const receiptMatch = tx.receipt ? String(tx.receipt).toLowerCase().includes(st) : false;
     const classMatchStr = tx.class ? String(tx.class).toLowerCase().includes(st) : false;

     const matchSearch = studentNameMatch || idMatch || studentIdMatch || actualDisplayIdMatch || receiptMatch || classMatchStr;

     const matchClass = filterClass === 'All' || tx.class === filterClass;
     const matchMethod = filterMethod === 'All' || tx.method === filterMethod;
     const matchCollectedBy = filterCollectedBy === 'All' || tx.collectedBy === filterCollectedBy;
     
     let txDateStr = '';
     if (tx.timestamp) {
         try {
             const d = new Date(tx.timestamp.seconds ? tx.timestamp.seconds * 1000 : tx.timestamp);
             const nd = new NepaliDate(d);
             txDateStr = nd.format("YYYY-MM-DD");
         } catch(e) {}
     }
     
     const matchFromDate = !fromDate || (txDateStr && txDateStr >= fromDate);
     const matchToDate = !toDate || (txDateStr && txDateStr <= toDate);

     return matchSearch && matchClass && matchMethod && matchFromDate && matchToDate && matchCollectedBy;
  });

  const totalFilteredAmount = filteredHistory.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalRefunded = filteredHistory.filter(tx => tx.status === 'REFUNDED').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  
  const methodsBreakdown = filteredHistory.filter(tx => tx.status === 'SUCCESS').reduce((acc: any, tx) => {
      acc[tx.method] = (acc[tx.method] || 0) + (Number(tx.amount) || 0);
      return acc;
  }, {});

  const exportExcel = async () => {
    const columns = [
       { header: 'Date (B.S.)', key: 'dateBs', width: 15 },
       { header: 'Date (A.D.)', key: 'dateAd', width: 25 },
       { header: 'Receipt No', key: 'receiptNo', width: 15 },
       { header: 'Student', key: 'studentName', width: 25 },
       { header: 'Class', key: 'studentClass', width: 15 },
       { header: 'Amount', key: 'amount', width: 15 },
       { header: 'Method', key: 'method', width: 15 },
       { header: 'Collected By', key: 'collectedBy', width: 20 },
       { header: 'Status', key: 'status', width: 15 }
    ];

    const formatTx = (tx: any) => {
       let adDate = '';
       if (tx.timestamp) {
           adDate = new Date(tx.timestamp.seconds ? tx.timestamp.seconds * 1000 : tx.timestamp).toLocaleString();
       }
       return {
           dateBs: tx.date || '',
           dateAd: adDate,
           receiptNo: tx.receipt || tx.id,
           studentName: tx.studentName || '',
           studentClass: tx.class || '',
           amount: tx.amount || 0,
           method: tx.method || '',
           collectedBy: tx.collectedBy || '',
           status: tx.status || ''
       };
    };

    const sheetsConfigs: any[] = [];

    // Sheet 1: Whole transactions
    sheetsConfigs.push({
      sheetName: 'All Transactions',
      title: 'Transaction History Report',
      columns: columns,
      data: filteredHistory.map(formatTx)
    });

    // Sub-sheets: Grouped by classes
    // Get unique classes
    const uniqueClasses = Array.from(new Set(filteredHistory.map(tx => tx.class || 'Unknown_Class'))).sort();
    
    uniqueClasses.forEach(cls => {
      const classTx = filteredHistory.filter(tx => (tx.class || 'Unknown_Class') === cls);
      sheetsConfigs.push({
        sheetName: `Class ${cls}`,
        title: `Transaction History Report - Class ${cls}`,
        columns: columns,
        data: classTx.map(formatTx)
      });
    });

    await exportMultiSheetExcel('Transaction_History', sheetsConfigs);
  };

  const handleEditSubmit = async () => {
     if (!editAmount || !editModalTx) return;
     try {
         const batch = writeBatch(db);
         const txRef = doc(db, 'transactions', editModalTx.id);
         batch.update(txRef, {
             amount: Number(editAmount),
             remarks: (editModalTx.remarks ? editModalTx.remarks + '\n' : '') + `Edited: ${editRemarks}`
         });
         await batch.commit();
         setEditModalTx(null);
         onRefresh();
     } catch (err) {
         console.error(err);
         alert("Failed to edit transaction");
     }
  };

  const handleRefundSubmit = async () => {
      if (refundPassword !== 'admin123') {
         alert("Incorrect authentication password.");
         return;
      }
      if (!refundModalTx) return;
      try {
         const batch = writeBatch(db);
         const txRef = doc(db, 'transactions', refundModalTx.id);
         batch.update(txRef, { status: 'REFUNDED' });

         // Better query fallback for refunds
         const feeQuery = query(collection(db, 'studentFees'), where('transactionId', '==', refundModalTx.id));
         const feeSnap = await getDocs(feeQuery);
         
         if (!feeSnap.empty) {
             feeSnap.forEach(d => {
                 batch.update(d.ref, {
                     status: 'due',
                     paidAmount: 0,
                     paidAt: deleteField(),
                     receiptNo: deleteField(),
                     transactionId: deleteField(),
                     paymentMethod: deleteField(),
                     collectorId: deleteField(),
                     collectorName: deleteField()
                 });
             });
         } else if (refundModalTx.months && Array.isArray(refundModalTx.months)) {
             // Fallback to explicit list if transaction missing field ID binding in older docs
             refundModalTx.months.forEach((m: string) => {
                 const feeRef = doc(db, 'studentFees', `${refundModalTx.studentId}_${m}`);
                 batch.update(feeRef, {
                     status: 'due',
                     paidAmount: 0,
                     paidAt: deleteField(),
                     receiptNo: deleteField(),
                     transactionId: deleteField(),
                     paymentMethod: deleteField(),
                     collectorId: deleteField(),
                     collectorName: deleteField()
                 });
             });
         }

         await batch.commit();
         setRefundModalTx(null);
         setRefundPassword('');
         onRefresh();
      } catch(err) {
         console.error("Refund failed", err);
         alert("Failed to refund payment");
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
             onChange={e => handleSearchChange(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 border-primary text-primary border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
           />
         </div>

         <div className="flex gap-2 w-full md:w-auto overflow-visible pb-2 md:pb-0 flex-wrap">
            <div className="relative shrink-0 flex items-center gap-2">
               <div className="relative z-50 nepali-datepicker-container">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                 <NepaliDatePicker
                   value={fromDate}
                   onChange={value => setFromDate(value)}
                   inputClassName="w-40 pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:-"
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
                   inputClassName="w-40 pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:-"
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
            </select>

             <select 
              value={filterCollectedBy}
              onChange={e => setFilterCollectedBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0"
            >
              <option value="All">Collected By: All</option>
              <option value="Admin">Admin</option>
              <option value="Principal">Principal</option>
              <option value="Custom">Custom</option>
            </select>

            <div className="flex bg-blue-50/50 rounded-xl p-1 shrink-0 border border-blue-100 min-h-[48px]">
               <button onClick={exportExcel} className="border-r border-blue-200 text-blue-700 font-bold px-3 text-sm hover:text-blue-900 flex gap-2 items-center uppercase tracking-widest"><Download className="w-4 h-4"/> Excel</button>
               <button onClick={generatePDFReport} className="text-blue-700 font-bold px-3 text-sm hover:text-blue-900 flex gap-2 items-center uppercase tracking-widest"><Printer className="w-4 h-4"/> PDF</button>
            </div>
         </div>
       </div>

       {/* Summary Bar */}
       <div className="bg-primary text-white p-4 rounded-xl shadow-md grid grid-cols-2 md:grid-cols-4 gap-4 items-center animate-in fade-in">
           <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#93c5fd]">Results</p>
              <p className="text-lg font-black">{filteredHistory.length} txns</p>
           </div>
           <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#93c5fd]">Collected</p>
              <p className="text-xl font-black text-emerald-400">NRs. {totalFilteredAmount.toLocaleString()}</p>
           </div>
           <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#93c5fd]">Refunded</p>
              <p className="text-xl font-black text-red-400">NRs. {totalRefunded.toLocaleString()}</p>
           </div>
           <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#93c5fd]">Methods Breakdown</p>
              <div className="text-xs font-medium space-y-1">
                 {Object.entries(methodsBreakdown).map(([method, amount]: any) => (
                    <div key={method} className="flex justify-between">
                       <span>{method}</span>
                       <span className="font-bold">NRs. {amount.toLocaleString()}</span>
                    </div>
                 ))}
                 {Object.keys(methodsBreakdown).length === 0 && <span className="opacity-50">No data</span>}
              </div>
           </div>
       </div>

       {/* Desktop Table View */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
         <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="text-primary border-b border-gray-100">
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
                     <td className="p-4 text-xs font-mono font-black text-primary bg-blue-50/50 rounded-md px-2 py-1 inline-block mt-3">{(tx.receipt || tx.id).slice(-6).toUpperCase()}</td>
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
                                   <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Namaste, we have received a payment of NRs. ${tx.amount} for ${tx.studentName}. Receipt No: ${tx.receipt || tx.id}. Thank you.`)}`, '_blank')} className="p-2 bg-transparent text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200" title="Send WhatsApp">📱</button>
                                   <button onClick={() => { setEditModalTx(tx); setEditAmount(String(tx.amount)); setEditRemarks(''); }} className="p-2 bg-transparent text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200" title="Edit"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={() => setRefundModalTx(tx)} className="p-2 bg-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Refund/Cancel"><CornerUpLeft className="w-4 h-4"/></button>
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
           <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
              <div className="flex-1 overflow-auto bg-gray-100 p-4 sm:p-8 custom-scrollbar">
                 <div ref={receiptRef} className="bg-white mx-auto shadow-md relative overflow-hidden" style={{ width: '600px', minHeight: '848px' }}>
                    <div className="p-8 sm:p-10 text-gray-800">

                       
                       {/* Header */}
                       <div className="flex justify-between items-start text-[10px] text-gray-500 font-mono mb-8">
                           <span>{receipt.timestamp ? new Date(receipt.timestamp.seconds ? receipt.timestamp.seconds * 1000 : receipt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                           <span>Print Receipt</span>
                       </div>

                       <div className="text-center mb-10">
                         <div className="mx-auto flex justify-center mb-4">
                           <img src="https://ui-avatars.com/api/?name=E+S&background=10b981&color=fff&size=100&bold=true" alt="Logo" className="h-20 w-auto" />
                         </div>
                         <h1 className="text-2xl sm:text-3xl font-black uppercase text-primary tracking-widest mb-1.5" style={{ letterSpacing: '0.15em' }}>SHIKSHANTAR ACADEMY</h1>
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Siraha, Nepal</p>
                         
                         <div className="mt-6 inline-block border text-emerald-700 border-emerald-300 bg-emerald-50 px-6 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest">
                            Payment Receipt
                         </div>
                       </div>
                       
                       <hr className="mb-8 border-gray-200" />

                       {/* Receipt Details Grid */}
                       <div className="grid grid-cols-2 gap-4 mb-8">
                           <div>
                               <span className="block text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Receipt No</span>
                               <span className="text-lg sm:text-xl font-mono border-b-2 border-gray-100 pb-1 inline-block font-black text-gray-900">{(receipt.receipt || receipt.receiptNo || receipt.id).toUpperCase()}</span>
                           </div>
                           <div className="text-right">
                               <span className="block text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Date</span>
                               <span className="text-lg sm:text-xl font-black text-gray-900">{receipt.date} <span className="text-xs font-normal text-gray-400 border-l pl-2 ml-1">B.S.</span></span>
                               {receipt.timestamp && (
                                   <div className="text-xs font-mono text-gray-500 mt-1">
                                      {new Date(receipt.timestamp.seconds ? receipt.timestamp.seconds * 1000 : receipt.timestamp).toLocaleDateString()} {new Date(receipt.timestamp.seconds ? receipt.timestamp.seconds * 1000 : receipt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                               )}
                           </div>
                       </div>

                       {/* Student Bubble */}
                       <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 mb-8 flex justify-between items-center bg-gray-50/50">
                           <span className="text-sm font-bold text-gray-500 p-0">Student Name</span>
                           <span className="text-xl sm:text-2xl font-black text-gray-900 text-right">{receipt.studentName}</span>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50/50 border border-gray-200 rounded-xl">
                          <div>
                            <span className="block text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Class</span>
                            <span className="font-bold text-gray-900 text-lg">{receipt.class || '-'}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Method</span>
                            <span className="font-bold text-gray-900 text-lg">{receipt.method}</span>
                          </div>
                       </div>

                       {/* Items */}
                       <div className="mb-10">
                           <table className="w-full text-base">
                               <tbody>
                                  {(() => {
                                      let totalTuition = 0;
                                      let totalExam = 0;
                                      let totalComputer = 0;
                                      let totalExtra = 0;
                                      let totalAdmission = 0;

                                      if (receipt.receiptMonthsData?.length > 0) {
                                          receipt.receiptMonthsData.forEach((md: any) => {
                                              if (md.breakdown) {
                                                  totalTuition += Number(md.breakdown.tuition || 0);
                                                  totalExam += Number(md.breakdown.exam || 0);
                                                  totalComputer += Number(md.breakdown.computer || 0);
                                                  totalExtra += Number(md.breakdown.other || 0) + Number(md.breakdown.transport || 0);
                                              } else {
                                                  totalTuition += Number(md.totalFee || 0);
                                              }
                                          });
                                      } else if (receipt.months?.length > 0) {
                                          totalTuition += receipt.amount; 
                                      } else {
                                          totalExtra += receipt.amount;
                                      }
                                      
                                      if (receipt.otherFees?.length > 0) {
                                          receipt.otherFees.forEach((f: any) => {
                                              if (f.name.toLowerCase().includes('admission')) {
                                                  totalAdmission += Number(f.amount);
                                              } else {
                                                  totalExtra += Number(f.amount);
                                              }
                                          });
                                      }

                                      return (
                                        <>
                                            {totalAdmission > 0 && <tr className="border-b border-gray-100 last:border-0"><td className="py-2 text-gray-600 font-medium">Admission Fee</td><td className="py-2 font-black text-gray-900 text-right text-lg">NRs. {totalAdmission.toLocaleString()}</td></tr>}
                                            {totalTuition > 0 && <tr className="border-b border-gray-100 last:border-0"><td className="py-2 text-gray-600 font-medium">Monthly Fee</td><td className="py-2 font-black text-gray-900 text-right text-lg">NRs. {totalTuition.toLocaleString()}</td></tr>}
                                            {totalExam > 0 && <tr className="border-b border-gray-100 last:border-0"><td className="py-2 text-gray-600 font-medium">Exam Fee</td><td className="py-2 font-black text-gray-900 text-right text-lg">NRs. {totalExam.toLocaleString()}</td></tr>}
                                            {totalComputer > 0 && <tr className="border-b border-gray-100 last:border-0"><td className="py-2 text-gray-600 font-medium">Computer Fee</td><td className="py-2 font-black text-gray-900 text-right text-lg">NRs. {totalComputer.toLocaleString()}</td></tr>}
                                            {totalExtra > 0 && <tr className="border-b border-gray-100 last:border-0"><td className="py-2 text-gray-600 font-medium">Extra Fee</td><td className="py-2 font-black text-gray-900 text-right text-lg">NRs. {totalExtra.toLocaleString()}</td></tr>}
                                            {receipt.discount > 0 && <tr className="border-b border-gray-100 last:border-0"><td className="py-2 text-red-600 font-medium">Adjustment/Discount</td><td className="py-2 font-black text-red-600 text-right text-lg">- NRs. {Number(receipt.discount).toLocaleString()}</td></tr>}
                                        </>
                                      );
                                  })()}
                               </tbody>
                           </table>
                           
                           <div className="mt-8 flex justify-between items-center border-t-2 border-gray-900 pt-6">
                              <span className="font-black text-sm uppercase tracking-widest text-gray-500">Total Paid Amount</span>
                              <span className="text-3xl font-black text-emerald-600">NRs. {(receipt.amount || 0).toLocaleString()}</span>
                           </div>
                       </div>

                       {/* Signatures */}
                       <div className="mt-16 flex justify-between items-end border-t border-gray-200 pt-8 pb-10">
                           <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-xl">
                                <QRCode value={`Receipt: ${receipt.receipt || receipt.receiptNo || receipt.id}\nStudent: ${receipt.studentName}\nAmount: NRs.${receipt.amount}\nDate: ${receipt.date?.split('T')[0]}`} size={80} />
                           </div>
                           <div className="text-center">
                              <p className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">Collected By</p>
                              <p className="font-black text-gray-900">{receipt.collectedBy}</p>
                           </div>
                           <div className="text-center opacity-20 relative px-4 text-gray-300 font-bold border-t border-gray-300 pt-2 min-w-[120px]">
                              Signature
                           </div>
                       </div>
                       
                       <div className="absolute top-1/4 right-0 h-1/2 w-2.5 bg-gray-400/80 rounded-l-full shadow-inner"></div>
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-200 space-y-3 shrink-0">
                <div className="flex gap-3">
                   <button onClick={() => setReceipt(null)} className="flex-1 py-3 border-transparent text-gray-500 hover:text-gray-900 bg-gray-100 rounded-xl font-black text-[12px] sm:text-xs transition-colors hover:bg-gray-200">Close</button>
                   <button onClick={downloadReceipt} className="flex-1 py-3 border-blue-600 text-blue-600 border rounded-xl font-black text-[12px] sm:text-xs hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"><FileDown className="w-4 h-4"/> PDF</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleBrowserPrint} className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg flex justify-center items-center gap-2 hover:bg-blue-800 transition-colors text-[14px]">
                       <Printer className="w-5 h-5"/> Print Receipt
                    </button>
                    <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Namaste, we have received a payment of NRs. ${receipt.amount} for ${receipt.studentName}. Receipt No: ${receipt.receipt || receipt.id}. Thank you.`)}`, '_blank')} className="w-auto px-4 sm:px-6 py-4 bg-[#25D366] text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-colors" title="Send WhatsApp">
                       📱 
                    </button>
                </div>
              </div>
           </div>
         </div>
       )}

       {/* Edit Modal */}
       {editModalTx && (
         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl">
               <h3 className="text-lg font-black text-gray-800 mb-4 uppercase tracking-widest border-b pb-2">Edit Transaction</h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Receipt No</label>
                     <p className="text-sm font-mono font-bold">{editModalTx.receipt || editModalTx.id}</p>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">New Amount (NRs.)</label>
                     <input type="number" min="0" step="any" onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Reason for edit</label>
                     <textarea value={editRemarks} onChange={e => setEditRemarks(e.target.value)} placeholder="E.g., Amount was entered incorrectly" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" rows={3}></textarea>
                  </div>
               </div>
               <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditModalTx(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">Cancel</button>
                  <button onClick={handleEditSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700">Save Changes</button>
               </div>
            </div>
         </div>
       )}

       {/* Refund Modal */}
       {refundModalTx && (
         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl">
               <h3 className="text-lg font-black text-red-600 mb-2 uppercase tracking-widest flex items-center gap-2"><CornerUpLeft className="w-5 h-5"/> Process Refund</h3>
               <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">This will revert the payment and mark associated months as due. This action requires administrative authentication.</p>
               
               <div className="bg-red-50 border border-red-100 p-3 rounded-xl mb-4 text-sm">
                  <p className="font-bold text-red-800">Student: {refundModalTx.studentName}</p>
                  <p className="font-black text-red-900 text-lg">Amount: NRs. {refundModalTx.amount}</p>
               </div>

               <div className="mb-6">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Admin Password</label>
                  <input type="password" value={refundPassword} onChange={e => setRefundPassword(e.target.value)} placeholder="Enter password to confirm" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm" />
               </div>

               <div className="flex gap-3">
                  <button onClick={() => { setRefundModalTx(null); setRefundPassword(''); }} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">Cancel</button>
                  <button onClick={handleRefundSubmit} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors">Confirm Refund</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
