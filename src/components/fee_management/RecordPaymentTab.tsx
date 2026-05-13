import React, { useState, useEffect, useRef } from 'react';
import { formatBSDate, formatBSDateYMD, getBSYearMonthDate } from '../../lib/nepaliDate';
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';
import { Search, CheckCircle2, CheckSquare, Square, Banknote, CreditCard, Receipt, FileDown, Smartphone, Check, Plus, Trash2, Printer, CornerUpLeft } from 'lucide-react';
import QRCode from 'react-qr-code';
import { db } from '../../firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import signatureImg from '../../assets/signature.svg';

const MONTHS = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

interface OtherFee {
  id: string;
  name: string;
  amount: number;
}

export default function RecordPaymentTab({ initialStudentId, studentsData, onRefresh, onBack }: { initialStudentId?: string, studentsData: any[], onRefresh: () => void, onBack?: () => void }) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [otherFees, setOtherFees] = useState<OtherFee[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [customReceiptNo, setCustomReceiptNo] = useState('');
  const [method, setMethod] = useState('Cash');
  const [remark, setRemark] = useState('');
  const [bsDate, setBsDate] = useState(formatBSDateYMD(new Date()));
  
  const [discount, setDiscount] = useState<string>('');
  
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);

  const getStudentDue = (s: any) => {
      let totalDue = 0;
      s.fees?.forEach((f: any) => {
          if (f.status === 'due') {
              totalDue += Number(f.dueAmount || 0);
          }
      });
      return totalDue;
  };

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
      pdf.save(`Receipt_${receipt.receiptNo}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  const handleBrowserPrint = () => {
     if (!receiptRef.current || !receipt) return;
     const printWindow = window.open('', '_blank');
     if (printWindow) {
         const studentName = receipt.studentName || '';
         const rollNo = selectedStudent?.rollNumber || '-';
         const className = receipt.class || '';
         const section = selectedStudent?.section || 'A';
         const receiptNo = receipt.receiptNo || '-';
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
         const addRow = (name: string, amount: number) => {
             if (amount > 0 || name === 'Monthly Fee' || name === 'Admission Fee') {
                 breakdownRows += `
                   <tr>
                      <td style="border: 1px solid #000; padding: 8px; text-align: center; border-left: none;">${srNo++}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${name}</td>
                      <td style="border: 1px solid #000; padding: 8px; text-align: right; border-right: none;">${amount > 0 ? amount.toLocaleString() : ''}</td>
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
                    <td style="border: 1px solid #000; padding: 8px;">Discount / Scholarship</td>
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
                         body { background-color: #fff; font-family: 'Times New Roman', serif; padding: 20px; margin: 0; }
                         .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; background-color: #fef08a; padding: 0; color: #000; }
                         .text-center { text-align: center; }
                         .header-text { margin: 5px 0; }
                         .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 0 20px; }
                         .line-input { border-bottom: 2px dotted #000; display: inline-block; min-width: 150px; font-style: normal; font-weight: normal; font-family: 'Times New Roman', serif; text-align: center; }
                         table { width: 100%; border-collapse: collapse; margin-top: 10px; border-left: none; border-right: none; }
                         th, td { border: 1px solid #000; padding: 8px 12px; }
                         tr td:first-child, tr th:first-child { border-left: none; }
                         tr td:last-child, tr th:last-child { border-right: none; }
                     </style>
                 </head>
                 <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
                     <div class="receipt-container">
                         <div style="display: flex; align-items: center; justify-content: center; position: relative; padding: 15px 0 10px 0;">
                             <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" style="position: absolute; left: 20px; top: 15px; width: 80px; height: 80px; object-fit: contain; filter: grayscale(100%); display: none;" />
                             <div class="text-center">
                                 <div style="font-size: 18px; margin-bottom: 5px;">Receipt</div>
                                 <h1 style="margin: 0 0 5px 0; font-size: 32px; font-weight: bold; font-family: Arial, sans-serif; letter-spacing: 1px;">SHIKSHANTAR ACADEMY</h1>
                                 <p style="margin: 2px 0; font-size: 16px;">Siraha, Nepal</p>
                                 <p style="margin: 2px 0; font-size: 14px;">Website: https://shikshantar.academy.nepalghum.xyz</p>
                                 <p style="margin: 2px 0; font-size: 14px;">Contact: 01-1234567 &nbsp; Email: info@shikshantar.academy.nepalghum.xyz</p>
                             </div>
                         </div>
                         
                         <div style="padding: 0 20px 10px 20px; border-bottom: 2px solid #000;">
                             <div style="font-size: 18px;">Receipt No. <span class="line-input">${receiptNo}</span></div>
                         </div>
                         
                         <div style="padding: 20px 20px 0 20px;">
                             <div class="info-row">
                                 <div style="flex: 1; font-size: 18px;">Name of Student <span class="line-input" style="min-width: 300px; text-align: left;">&nbsp;${studentName}</span></div>
                                 <div style="font-size: 18px;">Class <span class="line-input" style="min-width: 100px;">${className}</span> 
                                      Section <span class="line-input" style="min-width: 80px;">${section}</span></div>
                             </div>
                             
                             <div class="info-row">
                                 <div style="flex: 1; font-size: 18px;">Roll No <span class="line-input" style="min-width: 150px;">${rollNo}</span></div>
                                 <div style="font-size: 18px;">Month <span class="line-input" style="min-width: 200px;">${monthsText}</span></div>
                             </div>
                         </div>
                         
                         <table>
                             <thead>
                                 <tr>
                                     <th style="font-size: 18px; font-weight: normal; width: 100px;">Sr. No.</th>
                                     <th style="font-size: 18px; font-weight: normal;">Particulars</th>
                                     <th style="font-size: 18px; font-weight: normal; width: 200px;">Amount</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 ${breakdownRows}
                                 <tr>
                                     <td colspan="2" style="text-align: right; border-left: none; padding-right: 30px;">
                                         <span style="font-size: 18px; font-weight: normal; border: 1px solid #000; padding: 2px 20px; margin-right: -13px;">Total</span>
                                     </td>
                                     <td style="font-size: 18px; font-weight: normal;">${amount.toLocaleString()}</td>
                                 </tr>
                             </tbody>
                         </table>
                         
                         <div style="margin-top: 20px; padding: 0 20px 10px 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                             <div>
                               <p style="margin-bottom: 30px; font-size: 18px;">Paid By: <span style="text-decoration: underline; font-weight: normal;">Cash</span></p>
                               <p style="font-size: 18px;">Signature of Centre Head</p>
                             </div>
                             <div style="text-align: right;">
                               <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Receipt%3A%20${receiptNo}%0AStudent%3A%20${encodeURIComponent(studentName)}%0AAmount%3A%20NRs.${amount}%0ADate%3A%20${receipt.date?.split('T')[0]}" style="width: 100px; height: 100px;" alt="QR Code" />
                             </div>
                         </div>
                         
                         <div style="border-top: 2px solid #000; padding: 8px; text-align: center; font-size: 14px;">
                             Digital Receipt No: ${receiptNo} | All above mentioned Amount once paid are non refundable in any case whatsoever.
                         </div>
                     </div>
                 </body>
             </html>
         `);
         printWindow.document.close();
     }
  };

  useEffect(() => {
    if (initialStudentId && studentsData.length > 0) {
       const initialStud = studentsData.find(s => s.id === initialStudentId);
       if (initialStud) {
         setSelectedStudent(initialStud);
         const dues = initialStud.fees?.filter((f: any) => f.status === 'due').map((f: any) => f.month) || [];
         setSelectedMonths(dues);
       }
    } else if (initialStudentId === '') {
       setSelectedStudent(null);
    }
  }, [initialStudentId, studentsData]);

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setSearchTerm('');
    
    // Auto-select due months
    const dues = student.fees?.filter((f: any) => f.status === 'due').map((f: any) => f.month) || [];
    setSelectedMonths(dues);
    
    setCustomAmount('');
    setRemark('');
    setCustomReceiptNo('');
    setOtherFees([]);
    setDiscount('');
  };

  const addOtherFee = () => {
      setOtherFees([...otherFees, { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const removeOtherFee = (id: string) => {
      setOtherFees(otherFees.filter(f => f.id !== id));
  };

  const updateOtherFee = (id: string, field: 'name' | 'amount', value: string | number) => {
      setOtherFees(otherFees.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const tuitionFee = selectedStudent?.monthlyFee || 0;
  const calculatedMonthsTotal = selectedMonths.reduce((acc, month) => {
      const matchingFees = selectedStudent?.fees?.filter((f: any) => {
          let fm = f.month;
          if (fm === 'Baishak') fm = 'Baisakh';
          else if (fm === 'Ashad') fm = 'Asar';
          else if (fm === 'Ashoj') fm = 'Ashwin';
          return fm === month;
      });
      const feeDoc = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
      return acc + (feeDoc ? Number(feeDoc.dueAmount || feeDoc.totalFee || 0) : tuitionFee);
  }, 0);
  const otherFeesTotal = otherFees.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const discountAmount = discount ? Number(discount) : 0;
  const calculatedTotal = Math.max(0, calculatedMonthsTotal + otherFeesTotal - discountAmount);
  useEffect(() => {
     setCustomAmount('');
  }, [calculatedMonthsTotal, otherFeesTotal, discountAmount, selectedStudent?.id]);

  const amountToCollect = customAmount !== '' ? Number(customAmount) : calculatedTotal;
  const balanceAfter = amountToCollect < calculatedTotal ? calculatedTotal - amountToCollect : 0;

  const submitPayment = async () => {
    if (!selectedStudent || amountToCollect <= 0) return;
    setProcessing(true);
    try {
      const receiptNo = customReceiptNo.trim() || `RCP-${getBSYearMonthDate().year}-${Date.now().toString().slice(-4)}`;
      const receiptMonthsData = selectedMonths.map(m => {
          const matchingFees = selectedStudent?.fees?.filter((f: any) => {
              let fm = f.month;
              if (fm === 'Baishak') fm = 'Baisakh';
              else if (fm === 'Ashad') fm = 'Asar';
              else if (fm === 'Ashoj') fm = 'Ashwin';
              return fm === m;
          });
          const feeDoc = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
          return {
             month: m,
             totalFee: feeDoc ? Number(feeDoc.totalFee || feeDoc.dueAmount || 0) : tuitionFee,
             breakdown: feeDoc?.breakdown || { tuition: tuitionFee }
          };
      });

      const payload = {
        receiptNo,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        class: selectedStudent.class,
        amount: amountToCollect,
        method,
        date: new Date().toISOString(),
        bsDate,
        category: 'Tuition Fee',
        recordedBy: 'Admin',
        remark,
        months: selectedMonths,
        receiptMonthsData,
        otherFees: otherFees,
        discount: discountAmount
      };
      
      const batch = writeBatch(db);

      // 1. Create Transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
          date: bsDate,
          receipt: receiptNo,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          class: selectedStudent.class,
          amount: amountToCollect,
          method,
          collectedBy: 'Admin',
          status: 'SUCCESS',
          months: selectedMonths,
          receiptMonthsData,
          otherFees: otherFees,
          discount: discountAmount,
          remarks: remark,
          timestamp: serverTimestamp()
      });

      // 2. Mark studentFees as paid incrementally
      let remainingCover = amountToCollect + discountAmount - otherFeesTotal;

      selectedMonths.forEach(m => {
          const matchingFees = selectedStudent?.fees?.filter((f: any) => {
              let fm = f.month;
              if (fm === 'Baishak') fm = 'Baisakh';
              else if (fm === 'Ashad') fm = 'Asar';
              else if (fm === 'Ashoj') fm = 'Ashwin';
              return fm === m;
          });
          const feeDoc = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
          
          const thisMonthFeeTotal = feeDoc ? Number(feeDoc.totalFee || tuitionFee) : tuitionFee;
          const previouslyPaid = feeDoc ? Number(feeDoc.paidAmount || 0) : 0;
          const currentlyDueForMonth = thisMonthFeeTotal - previouslyPaid;
          
          let payForThisMonth = 0;
          if (remainingCover >= currentlyDueForMonth) {
              payForThisMonth = currentlyDueForMonth;
              remainingCover -= currentlyDueForMonth;
          } else if (remainingCover > 0) {
              payForThisMonth = remainingCover;
              remainingCover = 0;
          }

          const newPaidAmount = previouslyPaid + payForThisMonth;
          const newDueAmount = thisMonthFeeTotal - newPaidAmount;
          
          // Ensure we don't accidentally set a dueAmount less than 0
          const finalDue = newDueAmount > 0 ? newDueAmount : 0;
          const newStatus = finalDue <= 0 ? 'paid' : 'due';

          const feeRef = doc(db, 'studentFees', feeDoc?.id || `${selectedStudent.id}_${m}`);
          batch.set(feeRef, {
              studentId: selectedStudent.id,
              month: m,
              totalFee: thisMonthFeeTotal,
              paidAmount: newPaidAmount,
              dueAmount: finalDue,
              status: newStatus,
              transactionId: txRef.id,
              receiptNo: receiptNo,
              paidAt: new Date().toISOString()
          }, { merge: true });
      });

      await batch.commit();

      setReceipt({ ...payload, id: txRef.id, balanceAfter });
      setToastMessage('Payment collected successfully.');
      
      // Auto hide toast
      setTimeout(() => setToastMessage(''), 3000);
      
      // trigger refresh of data
      onRefresh();

      // reset form
      setSelectedStudent(null);
      setSelectedMonths([]);
      setOtherFees([]);
      setDiscount('');
      setCustomAmount('');
      setRemark('');
      setCustomReceiptNo('');
      setMethod('Cash');
    } catch (err) {
      console.error(err);
      alert('Payment failed');
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-24 font-sans">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#059669] text-white px-6 py-3 rounded-xl font-medium shadow-xl flex items-center gap-3 animate-in slide-in-from-top fade-in">
          <CheckCircle2 className="w-5 h-5" />
          {toastMessage}
        </div>
      )}

      {/* Search Header */}
      {!selectedStudent && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden relative">
          <div className="text-primary border-b border-gray-100 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 tracking-wide">Find Student</h2>
              <p className="text-xs text-gray-500 mt-1">Search by name, ID, or select class to record a payment</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="w-full md:w-1/3">
                <select 
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm cursor-pointer"
                >
                  <option value="All">All Classes</option>
                  {['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(c => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Or search by name, ID, Roll No..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {studentsData.filter((s, idx) => {
                 const cleanId = String(s.studentId || ('S' + (101 + idx))).toLowerCase();
                 const cleanRoll = String(s.rollNumber || '').toLowerCase();
                 const searchMatch = (String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                  cleanId.includes(searchTerm.toLowerCase()) ||
                  cleanRoll.includes(searchTerm.toLowerCase()));
                 const classMatch = filterClass === 'All' || s.class === filterClass;
                 return searchMatch && classMatch;
               }).slice(0, 15).map((s, idx) => {
                 const displayId = s.studentId || ('S' + (101 + idx));
                 return (
                 <div 
                   key={s.id} 
                   onClick={() => handleStudentSelect(s)}
                   className="p-4 border border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-md cursor-pointer flex flex-col justify-between bg-white transition-all group"
                 >
                   <div className="flex items-start gap-4 mb-3">
                     <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                       {s.name?.charAt(0)}
                     </div>
                     <div className="flex-1">
                       <p className="font-bold text-gray-900 line-clamp-1">{s.name}</p>
                       <p className="text-xs text-gray-500 mt-0.5">Class {s.class} • Roll {s.rollNumber || '-'}</p>
                       <p className="text-xs text-gray-400 mt-0.5">ID: {displayId}</p>
                     </div>
                   </div>
                   <div className="pt-3 border-t border-gray-50 flex justify-between items-center mt-auto">
                     <span className="text-xs text-gray-500 font-medium tracking-wide">Current Due:</span>
                     <p className={`text-sm font-black ${getStudentDue(s) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                       {getStudentDue(s) > 0 ? `NRs. ${getStudentDue(s).toLocaleString()}` : 'Cleared'}
                     </p>
                   </div>
                 </div>
                 );
               })}
               {studentsData.filter((s, idx) => {
                 const cleanId = String(s.studentId || ('S' + (101 + idx))).toLowerCase();
                 const cleanRoll = String(s.rollNumber || '').toLowerCase();
                 const searchMatch = (String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                  cleanId.includes(searchTerm.toLowerCase()) ||
                  cleanRoll.includes(searchTerm.toLowerCase()));
                 const classMatch = filterClass === 'All' || s.class === filterClass;
                 return searchMatch && classMatch;
               }).length === 0 && (
                 <div className="col-span-full p-12 text-center text-gray-500 font-medium">No students found matching your criteria.</div>
               )}
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* STUDENT INFO HEADER */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div className="flex gap-4">
                {onBack && (
                  <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors">
                    <CornerUpLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl uppercase shadow-custom">
                   {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">{selectedStudent.name}</h2>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
                     Class {selectedStudent.class} • ID: {selectedStudent.id}
                  </p>
                  <p className="text-xs font-bold text-gray-400 mt-1">Guardian Phone: {selectedStudent.guardianPhone}</p>
                  <button onClick={() => setSelectedStudent(null)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 mt-2 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-widest">Change</button>
                </div>
             </div>
             <div className="text-left md:text-right w-full md:w-auto text-primary md:bg-transparent p-4 md:p-0 rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Due</p>
                <p className="text-3xl font-black text-red-600">NRs. {getStudentDue(selectedStudent).toLocaleString()}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             {/* Left side info */}
             <div className="md:col-span-8 space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                 <div className="text-primary border-b border-gray-100 px-6 py-4">
                   <h2 className="text-sm font-semibold text-gray-700 tracking-wide">Fee Selection</h2>
                 </div>
                 <div className="p-6">
                   <div className="space-y-2">
                     {(() => {
                       const unpaidMonths = MONTHS.filter(m => {
                         const matchingFees = selectedStudent.fees?.filter((f: any) => {
                             let fm = f.month;
                             if (fm === 'Baishak') fm = 'Baisakh';
                             else if (fm === 'Ashad') fm = 'Asar';
                             else if (fm === 'Ashoj') fm = 'Ashwin';
                             return fm === m;
                         });
                         const feeDoc = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
                         return !(feeDoc && feeDoc.status === 'paid');
                       });

                       return unpaidMonths.map((m, idx) => {
                        const isSelected = selectedMonths.includes(m);
                        
                        let isDisabled = false;
                        for(let i = 0; i < idx; i++) {
                            if (!selectedMonths.includes(unpaidMonths[i])) {
                                isDisabled = true;
                                break;
                            }
                        }
                        
                        let isUnselectable = false;
                        if (isSelected) {
                            for(let i = idx + 1; i < unpaidMonths.length; i++) {
                                if (selectedMonths.includes(unpaidMonths[i])) {
                                    isUnselectable = true;
                                    break;
                                }
                            }
                        }

                        const matchingFees = selectedStudent.fees?.filter((f: any) => {
                            let fm = f.month;
                            if (fm === 'Baishak') fm = 'Baisakh';
                            else if (fm === 'Ashad') fm = 'Asar';
                            else if (fm === 'Ashoj') fm = 'Ashwin';
                            return fm === m;
                        });
                        const feeDoc = matchingFees && matchingFees.length > 0 ? matchingFees[0] : undefined;
                        
                        const displayFee = feeDoc ? Number(feeDoc.dueAmount || feeDoc.totalFee || 0) : tuitionFee;
                        
                        const opacityClass = (isDisabled || isUnselectable) ? 'opacity-60 grayscale' : 'opacity-100';

                        return (
                           <div 
                             key={m}
                             onClick={() => {
                                 if (isDisabled || isUnselectable) return;
                                 setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
                             }}
                             className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${ opacityClass } ${ isSelected ? 'bg-blue-50/50 border-blue-200 cursor-pointer' : (isDisabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer shadow-sm') }`}
                             title={isDisabled ? "You must select previous pending months first" : (isUnselectable ? "Deselect later months first" : "")}
                           >
                              <div className="flex items-center gap-4">
                                 {isSelected ? (
                                   <CheckSquare className="w-5 h-5 text-blue-600" />
                                 ) : (
                                   <Square className={`w-5 h-5 ${isDisabled ? 'text-gray-200' : 'text-gray-300'}`} />
                                 )}
                                 <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{m} {getBSYearMonthDate().year}</span>
                              </div>
                              <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                NRs. {displayFee.toLocaleString()}
                              </span>
                           </div>
                        );
                      });
                     })()}
                   </div>
                   
                   <div className="mt-4 p-4 border-primary text-primary rounded-xl border border-gray-100 flex justify-between items-center">
                      <span className="font-semibold text-gray-500 tracking-wide text-sm">Tuition Subtotal:</span>
                      <span className="font-bold text-gray-800 text-lg">NRs. {calculatedMonthsTotal.toLocaleString()}</span>
                   </div>
                   
                   <div className="mt-8 border-t border-gray-100 pt-8">
                      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                        <h3 className="text-sm font-semibold text-gray-700 tracking-wide">Additional Items / Fines</h3>
                        <button onClick={addOtherFee} className="text-[11px] bg-white border border-gray-200 text-gray-700 shadow-sm px-3 py-1.5 rounded-lg font-bold hover:text-primary transition-colors flex gap-1.5 items-center">
                           <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                        <div className="space-y-3">
                         {otherFees.map(fee => (
                           <div key={fee.id} className="flex gap-3 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                              <input 
                                 type="text" 
                                 list="feeTypeSuggestions"
                                 value={fee.name} 
                                 onChange={(e) => updateOtherFee(fee.id, 'name', e.target.value)} 
                                 placeholder="Description (e.g. Late Fine)"
                                 className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                              />
                              <datalist id="feeTypeSuggestions">
                                  <option value="Annual Charges" />
                                  <option value="Computer Fee" />
                                  <option value="Transportation Fee" />
                                  <option value="Late Fine" />
                                  <option value="Exam Fee" />
                                  <option value="Event Fee" />
                              </datalist>
                              <div className="relative w-32">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">रू</span>
                                 <input 
                                    type="number" 
                                    value={fee.amount} 
                                    onChange={(e) => updateOtherFee(fee.id, 'amount', e.target.value)} 
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                                 />
                              </div>
                              <button onClick={() => removeOtherFee(fee.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                         ))}
                         {otherFees.length === 0 && (
                            <div className="text-center py-6 border-primary text-primary border border-gray-100 border-dashed rounded-xl">
                              <p className="text-xs font-medium text-gray-400">No additional items</p>
                            </div>
                         )}
                      </div>

                      {/* Discount / Scholarship Section */}
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                           <h3 className="text-sm font-semibold text-gray-700 tracking-wide">Discount / Scholarship</h3>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium text-sm">रू</span>
                              <input 
                                 type="number" 
                                 value={discount} 
                                 onChange={(e) => setDiscount(e.target.value)} 
                                 placeholder="Amount to deduct..."
                                 className="w-full bg-emerald-50/30 border border-emerald-200 rounded-lg pl-8 pr-4 py-3 text-sm font-semibold text-emerald-800 placeholder-emerald-300 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 outline-none transition-colors"
                              />
                           </div>
                           {discount && Number(discount) > 0 && (
                             <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center border border-emerald-200">
                               - NRs. {Number(discount).toLocaleString()}
                             </div>
                           )}
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
             </div>

             {/* Right side payment form */}
             <div className="md:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden sticky top-6">
                   <div className="text-primary border-b border-gray-100 px-6 py-4">
                     <h2 className="text-sm font-semibold text-gray-700 tracking-wide">Payment Summary</h2>
                   </div>
                   
                   <div className="p-6 space-y-6">
                     <div className="p-4 text-primary rounded-xl flex justify-between items-center shadow-inner mt-2">
                        <span className="font-semibold text-primary text-sm">Grand Total</span>
                        <span className="font-black text-primary text-2xl tracking-tight">NRs. {calculatedTotal.toLocaleString()}</span>
                     </div>

                     <div>
                       <label className="text-xs font-bold text-gray-500 tracking-wide mb-2 block">Amount Paying (NRs.)</label>
                       <input 
                         type="number"
                         value={customAmount !== '' ? customAmount : (calculatedTotal > 0 ? calculatedTotal : '')}
                         onChange={e => setCustomAmount(e.target.value)}
                         className="w-full bg-white border-2 border-emerald-400 rounded-xl px-4 py-4 min-h-[48px] text-2xl font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 transition-colors placeholder-emerald-200 outline-none"
                         placeholder="0"
                       />
                       {balanceAfter > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 text-red-500 bg-red-50 p-2 rounded-lg text-xs font-semibold">
                             Balance remaining: NRs. {balanceAfter.toLocaleString()}
                          </div>
                       )}
                     </div>

                     <div>
                       <label className="text-xs font-bold text-gray-500 tracking-wide mb-2 block">Method</label>
                       <div className="grid grid-cols-1 gap-2">
                         <div className="min-h-[64px] p-2 rounded-xl text-[10px] font-bold border border-blue-500 bg-blue-50 text-blue-700 shadow-sm transition-all flex flex-col items-center justify-center gap-1.5 cursor-default">
                           <Banknote className="w-6 h-6 text-blue-600"/>
                           <span className="text-sm">Cash Only</span>
                         </div>
                       </div>
                     </div>

                     <div className="space-y-4 border-t border-gray-100 pt-5">
                       <div>
                         <label className="text-xs font-bold text-gray-500 tracking-wide mb-1 block">Manual Receipt No (Optional)</label>
                         <input 
                           type="text"
                           value={customReceiptNo}
                           onChange={e => setCustomReceiptNo(e.target.value)}
                           placeholder="Leave empty for auto-generation"
                           className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none uppercase"
                         />
                       </div>

                       <div>
                         <label className="text-xs font-bold text-gray-500 tracking-wide mb-1 block">Remarks</label>
                         <input 
                           type="text"
                           value={remark}
                           onChange={e => setRemark(e.target.value)}
                           placeholder="Optional note..."
                           className="w-full min-h-[48px] bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                         />
                       </div>
                       
                       <div className="flex flex-col gap-4">
                          <div className="relative z-50 nepali-datepicker-container w-full">
                            <label className="text-xs font-bold text-gray-500 tracking-wide mb-1 block">Date (B.S.)</label>
                            <NepaliDatePicker
                              value={bsDate}
                              onChange={value => setBsDate(value)}
                              inputClassName="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                              className="w-full"
                              options={{ calenderLocale: 'ne', valueLocale: 'en' }}
                            />
                          </div>
                       </div>
                     </div>
                     
                     {/* Submit Button */}
                     <div className="pt-2">
                        <button 
                          onClick={submitPayment}
                          disabled={processing || amountToCollect <= 0}
                          className="w-full h-14 bg-emerald-600 text-white rounded-xl text-[15px] font-black uppercase tracking-wide shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing ? 'PROCESSING...' : (
                            <>
                              <Check className="w-5 h-5" />
                              CONFIRM & GENERATE RECEIPT
                            </>
                          )}
                        </button>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
              <div className="flex-1 overflow-auto bg-gray-100 p-4 sm:p-8 custom-scrollbar">
                 <div className="h-full overflow-hidden flex justify-center bg-gray-200">
                    <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', height: 'max-content' }}>
                        <div ref={receiptRef} className="bg-[#fef08a] mx-auto text-black border-2 border-black" style={{ width: '800px', padding: '0', fontFamily: '"Times New Roman", serif', minHeight: 'auto' }}>
                            <div className="relative flex items-center justify-center py-4" style={{ padding: '15px 0 10px 0' }}>
                                <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" className="absolute left-5 top-4 w-20 h-20 object-contain grayscale" style={{ display: 'none' }} />
                                <div className="text-center">
                                    <div className="text-lg mb-1">Receipt</div>
                                    <h1 className="text-[32px] font-bold m-0 tracking-wide mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>SHIKSHANTAR ACADEMY</h1>
                                    <p className="text-base m-0 mb-0.5">Siraha, Nepal</p>
                                    <p className="text-sm m-0 mb-0.5">Website: https://shikshantar.academy.nepalghum.xyz</p>
                                    <p className="text-sm m-0 mb-0.5">Contact: 01-1234567 &nbsp; Email: info@shikshantar.academy.nepalghum.xyz</p>
                                </div>
                            </div>
                            
                            <div className="px-5 pb-2.5 border-b-2 border-black">
                                <div className="text-lg">Receipt No. <span className="inline-block min-w-[150px] border-b-2 border-dotted border-black text-center font-normal">{receipt.receiptNo}</span></div>
                            </div>
                            
                            <div className="pt-5 px-5">
                                <div className="flex justify-between mb-5 items-end">
                                    <div className="flex-1 text-lg flex">
                                        <span className="shrink-0">Name of Student</span>
                                        <span className="flex-1 ml-2 border-b-2 border-dotted border-black text-left font-normal px-2 relative top-1">&nbsp;{receipt.studentName}</span>
                                    </div>
                                    <div className="text-lg ml-4 shrink-0">
                                        Class <span className="inline-block min-w-[100px] border-b-2 border-dotted border-black text-center font-normal">{receipt.class || '-'}</span> 
                                        &nbsp;&nbsp;Section <span className="inline-block min-w-[60px] border-b-2 border-dotted border-black text-center font-normal">{'-'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between mb-5 items-end">
                                    <div className="text-lg flex w-[300px]">
                                        <span className="shrink-0">Roll No</span>
                                        <span className="flex-1 ml-2 border-b-2 border-dotted border-black text-center font-normal relative top-1">{'-'}</span>
                                    </div>
                                    <div className="text-lg flex flex-1 ml-4 text-right justify-end">
                                        <span className="shrink-0">Month</span>
                                        <span className="inline-block min-w-[200px] border-b-2 border-dotted border-black text-center font-normal ml-2 relative top-1">{receipt.months.join(', ')}</span>
                                    </div>
                                </div>
                             </div>
                             
                             <table className="w-full border-collapse mt-2.5" style={{ borderLeft: 'none', borderRight: 'none' }}>
                                 <thead>
                                     <tr>
                                         <th className="border border-black p-2 text-lg font-normal w-[100px]" style={{ borderLeft: 'none' }}>Sr. No.</th>
                                         <th className="border border-black p-2 text-lg font-normal text-left">Particulars</th>
                                         <th className="border border-black p-2 text-lg font-normal w-[200px] text-right" style={{ borderRight: 'none' }}>Amount</th>
                                     </tr>
                                 </thead>
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
                                         const rows = [];
                                         const addRow = (name: string, amount: number) => {
                                             if (amount > 0 || name === 'Monthly Fee' || name === 'Admission Fee') {
                                                 rows.push(
                                                     <tr key={name}>
                                                         <td className="border border-black p-2 text-center font-normal" style={{ borderLeft: 'none' }}>{srNo++}</td>
                                                         <td className="border border-black p-2 font-normal">{name}</td>
                                                         <td className="border border-black p-2 font-normal text-right" style={{ borderRight: 'none' }}>{amount > 0 ? amount.toLocaleString() : ''}</td>
                                                     </tr>
                                                 );
                                             }
                                         };

                                         addRow('Admission Fee', totalAdmission);
                                         addRow('Monthly Fee', totalTuition);
                                         addRow('Exam Fee', totalExam);
                                         addRow('Computer Fee', totalComputer);
                                         addRow('Extra Fee', totalExtra);
                                         
                                         if (receipt.discount > 0) {
                                             rows.push(
                                                 <tr key="discount">
                                                     <td className="border border-black p-2 text-center font-normal" style={{ borderLeft: 'none' }}>{srNo++}</td>
                                                     <td className="border border-black p-2 font-normal">Discount / Scholarship</td>
                                                     <td className="border border-black p-2 font-normal text-right" style={{ borderRight: 'none' }}>- {Number(receipt.discount).toLocaleString()}</td>
                                                 </tr>
                                             );
                                         }

                                         return rows;
                                     })()}
                                     <tr>
                                         <td colSpan={2} className="border border-black text-right border-l-0 relative">
                                             <div className="absolute right-[0] top-[0] h-full flex items-center pr-5 border-r border-black" style={{ borderRight: '1px solid black', backgroundColor: '#fef08a' }}>
                                                <span className="text-lg font-normal">Total</span>
                                             </div>
                                         </td>
                                         <td className="border border-black p-2 text-lg font-normal text-right" style={{ borderRight: 'none' }}>{(receipt.amount || 0).toLocaleString()}</td>
                                     </tr>
                                 </tbody>
                             </table>
                             
                             <div className="mt-5 px-5 pb-2.5 text-left flex justify-between items-end">
                                 <div>
                                     <p className="text-lg mb-[30px] font-normal">Paid By: <span className="underline font-normal">{receipt.method || 'Cash'}</span></p>
                                     <p className="text-lg m-0 font-normal">Signature of Centre Head</p>
                                 </div>
                                 <div className="bg-white p-2 border border-black inline-block">
                                     <QRCode value={`Receipt: ${receipt.receiptNo}\nStudent: ${receipt.studentName}\nAmount: NRs.${receipt.amount}\nDate: ${receipt.date?.split('T')[0]}`} size={80} />
                                 </div>
                             </div>
                             
                             <div className="border-t-2 border-black p-2 text-center text-sm font-normal mt-2 pb-[12px]">
                                 Digital Receipt No: {receipt.receiptNo} | All above mentioned Amount once paid are non refundable in any case whatsoever.
                             </div>
                        </div>
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
                    <button onClick={() => window.open(`https://wa.me/977${selectedStudent?.guardianPhone || ''}?text=${encodeURIComponent(`Namaste ${selectedStudent?.guardianName || ''} ji, ${receipt.studentName} (Class ${receipt.class}) ko ${receipt.months.join(', ')} ${getBSYearMonthDate().year} ko fee NRs. ${receipt.amount} prapta bhayo. Receipt: ${receipt.receiptNo}. - Shikshantar Academy, Siraha`)}`, '_blank')} className="w-auto px-4 sm:px-6 py-4 bg-[#25D366] text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-colors" title="Send WhatsApp">
                       📱 
                    </button>
                </div>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
