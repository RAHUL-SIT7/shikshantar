import React, { useState, useEffect, useRef } from 'react';
import { formatBSDate, formatBSDateYMD } from '../../lib/nepaliDate';
import { NepaliDatePicker } from 'nepali-datepicker-reactjs';
import 'nepali-datepicker-reactjs/dist/index.css';
import { Search, CheckCircle2, CheckSquare, Square, Banknote, CreditCard, Receipt, FileDown, Smartphone, Check, Plus, Trash2 } from 'lucide-react';
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

export default function RecordPaymentTab({ initialStudentId, studentsData, onRefresh }: { initialStudentId?: string, studentsData: any[], onRefresh: () => void }) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [otherFees, setOtherFees] = useState<OtherFee[]>([]);
  const [customAmount, setCustomAmount] = useState('');
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
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (receiptRef.current.offsetHeight * pdfWidth) / receiptRef.current.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receipt.receiptNo}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  const handleBrowserPrint = async () => {
     if (!receiptRef.current) return;
     try {
         const dataUrl = await toPng(receiptRef.current, { cacheBust: true, pixelRatio: 3 });
         let printWindow = window.open('', '_blank');
         if(printWindow) {
             printWindow.document.write(`
                 <html>
                     <head><title>Print Receipt</title></head>
                     <body style="margin: 0; display: flex; justify-content: center; align-items: flex-start; padding: 20px;">
                         <img src="${dataUrl}" style="max-width: 100%; height: auto;" onload="window.print();window.close();" />
                     </body>
                 </html>
             `);
             printWindow.document.close();
         }
     } catch(e) {
         console.error(e);
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
    setOtherFees([]);
    setDiscount('');
  };

  const addOtherFee = () => {
      setOtherFees([...otherFees, { id: Date.now().toString(), name: 'Late Fine', amount: 100 }]);
  };

  const removeOtherFee = (id: string) => {
      setOtherFees(otherFees.filter(f => f.id !== id));
  };

  const updateOtherFee = (id: string, field: 'name' | 'amount', value: string | number) => {
      setOtherFees(otherFees.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const tuitionFee = selectedStudent?.monthlyFee || 0;
  const calculatedMonthsTotal = selectedMonths.reduce((acc, month) => {
      const feeDoc = selectedStudent?.fees?.find((f: any) => f.month === month);
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
      const receiptNo = `RCP-2083-${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;
      const receiptMonthsData = selectedMonths.map(m => {
          const feeDoc = selectedStudent?.fees?.find((f: any) => f.month === m);
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

      // 2. Mark studentFees as paid
      selectedMonths.forEach(m => {
          const feeDoc = selectedStudent?.fees?.find((f: any) => f.month === m);
          const thisMonthFee = feeDoc ? Number(feeDoc.totalFee || feeDoc.dueAmount || 0) : tuitionFee;
          const feeRef = doc(db, 'studentFees', `${selectedStudent.id}_${m}`);
          batch.set(feeRef, {
              studentId: selectedStudent.id,
              month: m,
              totalFee: thisMonthFee,
              paidAmount: thisMonthFee,
              dueAmount: 0,
              status: 'paid'
          }, { merge: true });
      });

      await batch.commit();

      setReceipt({ ...payload, id: txRef.id, balanceAfter });
      setToastMessage(`✓ Payment of NRs. ${amountToCollect.toLocaleString()} recorded for ${selectedStudent.name}`);
      
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
          <div className="text-primary border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-700 tracking-wide">Find Student</h2>
            <p className="text-xs text-gray-500 mt-1">Search by name, ID, or class to record a payment</p>
          </div>
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="E.g. Rahul, 101, Class 10..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
              />
            </div>
            
            {(isSearchFocused || searchTerm) && (
              <div className={`mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden absolute w-[calc(100%-3rem)] max-w-4xl z-50 transition-opacity duration-200 ${(isSearchFocused || searchTerm) ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                {studentsData.filter(s => 
                  (String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   String(s.class || '').toLowerCase().includes(searchTerm.toLowerCase()))
                ).slice(0, 5).map(s => (
                  <div 
                    key={s.id} 
                    onMouseDown={(e) => { e.preventDefault(); handleStudentSelect(s); }}
                    className="p-4 hover:text-primary cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary bg-primary flex items-center justify-center font-bold text-sm">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Class {s.class} • ID: {s.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${getStudentDue(s) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {getStudentDue(s) > 0 ? `Dues: NRs. ${getStudentDue(s).toLocaleString()}` : 'Cleared'}
                      </p>
                    </div>
                  </div>
                ))}
                {studentsData.filter(s => 
                  (String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   String(s.class || '').toLowerCase().includes(searchTerm.toLowerCase()))
                ).length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">No students found</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* STUDENT INFO HEADER */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div className="flex gap-4">
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
                     {MONTHS.map((m, idx) => {
                       const isSelected = selectedMonths.includes(m);
                       const feeDoc = selectedStudent.fees?.find((f: any) => f.month === m);
                       
                       // Show only "due" months or months without any record yet (assumed unpaid)
                       if (feeDoc && feeDoc.status === 'paid') return null;
                       
                       const displayFee = feeDoc ? Number(feeDoc.dueAmount || feeDoc.totalFee || 0) : tuitionFee;

                       return (
                          <div 
                            key={m}
                            onClick={() => {
                                setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
                            }}
                            className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${ isSelected ? 'bg-blue-50/50 border-blue-200 cursor-pointer pointer-events-auto' : 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer shadow-sm pointer-events-auto' }`}
                          >
                             <div className="flex items-center gap-4">
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300" />
                                )}
                                <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{m} 2083</span>
                             </div>
                             <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                               NRs. {displayFee.toLocaleString()}
                             </span>
                          </div>
                       );
                     })}
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
                       <div className="grid grid-cols-3 gap-2">
                         {[
                           { name: 'Cash', icon: Banknote },
                           { name: 'Bank', icon: CreditCard },
                           { name: 'eSewa', icon: Smartphone },
                           { name: 'Khalti', icon: Smartphone },
                           { name: 'Cheque', icon: FileDown },
                           { name: 'Other', icon: FileDown }
                         ].map(pm => (
                           <button 
                             key={pm.name}
                             onClick={() => setMethod(pm.name)}
                             className={`min-h-[64px] p-2 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1.5 ${ method === pm.name ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:opacity-90' }`}
                           >
                             <pm.icon className={`w-4 h-4 ${method === pm.name ? 'text-blue-600' : 'text-gray-400'}`}/>
                             {pm.name}
                           </button>
                         ))}
                       </div>
                     </div>

                     <div className="space-y-4 border-t border-gray-100 pt-5">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
             <div ref={receiptRef} className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar bg-white font-mono text-xs sm:text-sm text-gray-800">
               
               <div className="text-center mb-6">
                 <div className="mx-auto mb-2 w-16 h-16">
                   <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" className="w-full h-full object-contain grayscale" />
                 </div>
                 <h2 className="font-bold text-lg tracking-tight">SHIKSHANTAR ACADEMY</h2>
                 <p className="text-xs">BASTIPUR-5, SIRAHA, NEPAL</p>
                 <p className="text-xs">Tel: 9800000000</p>
               </div>
               
               <div className="border-t-2 border-b-2 border-dashed border-gray-300 py-3 mb-4">
                 <p className="font-bold text-base">OFFICIAL FEE RECEIPT</p>
                 <div className="flex justify-between mt-2">
                   <span>Receipt No:</span>
                   <span className="font-bold">{receipt.receiptNo}</span>
                 </div>
                 <div className="flex justify-between mt-1">
                   <span>Date:</span>
                   <span className="font-bold">{receipt.bsDate} B.S.</span>
                 </div>
               </div>

               <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                 <div className="grid grid-cols-[80px_1fr] gap-1 mb-1">
                   <span className="text-gray-500">Student:</span>
                   <span className="font-bold">{receipt.studentName}</span>
                 </div>
                 <div className="grid grid-cols-[80px_1fr] gap-1 mb-1">
                   <span className="text-gray-500">Class:</span>
                   <span className="font-bold">{receipt.class} | ID: {receipt.studentId}</span>
                 </div>
                 <div className="grid grid-cols-[80px_1fr] gap-1 mb-1">
                   <span className="text-gray-500">Roll No:</span>
                   <span className="font-bold">{selectedStudent?.rollNumber || '-'}</span>
                 </div>
                 <div className="grid grid-cols-[80px_1fr] gap-1">
                   <span className="text-gray-500">Guardian:</span>
                   <span className="font-bold">{selectedStudent?.guardianName || '-'}</span>
                 </div>
               </div>

               <div className="border-b-2 border-solid border-gray-800 pb-4 mb-4 space-y-2">
                  {receipt.receiptMonthsData?.length > 0 ? receipt.receiptMonthsData.map((md: any, idx: number) => (
                      <React.Fragment key={`${md.month}-${idx}`}>
                          <div className="flex justify-between font-bold mt-2 text-base">
                             <span>{md.month} 2083 Monthly Dues</span>
                             <span>NRs. {md.totalFee.toLocaleString()}</span>
                          </div>
                          {md.breakdown && Object.entries(md.breakdown).map(([k, v]) => {
                             if(Number(v) > 0 && k !== 'scholarship') {
                                return <div key={k} className="flex justify-between text-gray-600 text-sm pl-4">
                                   <span className="capitalize">{k === 'other' ? 'Other/Transport Fee' : `${k} Fee`}</span>
                                   <span>NRs. {Number(v).toLocaleString()}</span>
                                </div>
                             }
                             if(Number(v) > 0 && k === 'scholarship') {
                                return <div key={k} className="flex justify-between text-emerald-600 text-sm pl-4 italic">
                                   <span>Scholarship Discount</span>
                                   <span>- NRs. {Number(v).toLocaleString()}</span>
                                </div>
                             }
                             return null;
                          })}
                      </React.Fragment>
                  )) : (
                     receipt.months?.length > 0 && receipt.months.map((m: string, idx: number) => {
                       const feeDoc = selectedStudent?.fees?.find((f: any) => f.month === m);
                       const netPerMonth = feeDoc ? Number(feeDoc.totalFee || feeDoc.dueAmount || 0) : tuitionFee;
                       return (
                         <div key={`${m}-${idx}`} className="flex justify-between">
                           <span>{m} 2083 Tuition</span>
                           <span>NRs. {netPerMonth.toLocaleString()}</span>
                         </div>
                       );
                     })
                  )}
                  {receipt.otherFees?.length > 0 && receipt.otherFees.map((f: any, idx: number) => (
                    <div key={idx} className="flex justify-between font-bold mt-2 py-1 border-t border-dashed border-gray-200">
                      <span>{f.name} (Late Fine/Misc)</span>
                      <span>NRs. {Number(f.amount).toLocaleString()}</span>
                    </div>
                  ))}
                  {receipt.discount > 0 && (
                    <div className="flex justify-between font-bold text-red-600 mt-2 py-1 border-t border-dashed border-gray-200">
                      <span>Adjustment/Discount</span>
                      <span>- NRs. {Number(receipt.discount).toLocaleString()}</span>
                    </div>
                  )}
               </div>

               <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4 space-y-2">
                 <div className="flex justify-between text-base">
                   <span className="font-bold">TOTAL PAID:</span>
                   <span className="font-bold">NRs. {receipt.amount.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Method:</span>
                   <span className="font-bold">{receipt.method}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Balance Due:</span>
                   <span className="font-bold">NRs. {receipt.balanceAfter.toLocaleString()}</span>
                 </div>
                 {receipt.remarks && (
                   <div className="flex justify-between mt-1">
                     <span className="text-gray-500">Remarks:</span>
                     <span className="font-bold text-right">{receipt.remarks}</span>
                   </div>
                 )}
               </div>

               <div className="flex flex-col gap-1 mb-8">
                 <div className="grid grid-cols-[100px_1fr] gap-1">
                   <span className="text-gray-500">Collected by:</span>
                   <span className="font-bold">{receipt.recordedBy}</span>
                 </div>
                 <div className="grid grid-cols-[100px_1fr] gap-1 items-end mt-4">
                   <span className="text-gray-500">Signature:</span>
                   <div className="border-b border-gray-800 w-32 relative h-10">
                     <img src={signatureImg} alt="Signature" className="absolute bottom-0 w-24 object-contain grayscale mix-blend-multiply" />
                   </div>
                 </div>
               </div>

               <div className="text-center font-bold text-gray-500">
                 "Thank you for your payment!"
               </div>

             </div>

             <div className="p-4 text-primary border-t border-gray-200 mt-auto flex flex-col gap-3">
               <div className="flex gap-3">
                 <button onClick={() => setReceipt(null)} className="flex-1 py-3 bg-white border border-gray-300 text-gray-800 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm">
                    ✕ Close
                 </button>
                 <button onClick={downloadReceipt} className="flex-1 py-3 bg-white border border-gray-300 text-gray-800 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors shadow-sm">
                    ⬇️ Save PDF
                 </button>
               </div>
               <button onClick={handleBrowserPrint} className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg flex justify-center items-center gap-2 hover:bg-blue-800 transition-colors text-lg tracking-wide uppercase">
                  🖨️ Print Receipt
               </button>
               <button onClick={() => window.open(`https://wa.me/977${selectedStudent?.guardianPhone || ''}?text=${encodeURIComponent(`Namaste ${selectedStudent?.guardianName || ''} ji, ${receipt.studentName} (Class ${receipt.class}) ko ${receipt.months.join(', ')} 2083 ko fee NRs. ${receipt.amount} prapta bhayo. Receipt: ${receipt.receiptNo}. - Shikshantar Academy, Siraha`)}`, '_blank')} className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold shadow-md flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-colors">
                  📱 WhatsApp to Parent
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
