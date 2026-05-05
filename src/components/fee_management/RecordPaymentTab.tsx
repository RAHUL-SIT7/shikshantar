import React, { useState, useEffect, useRef } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';
import { Search, CheckCircle2, CheckSquare, Square, Banknote, CreditCard, Receipt, FileDown, Smartphone, Check, Plus, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const MONTHS = ['Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra', 'Baisakh', 'Jestha', 'Ashad'];

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
  const [bsDate, setBsDate] = useState(formatBSDate(new Date()));
  
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
      return acc + (feeDoc ? Number(feeDoc.dueAmount || 0) : tuitionFee);
  }, 0);
  const otherFeesTotal = otherFees.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const calculatedTotal = calculatedMonthsTotal + otherFeesTotal;
  const amountToCollect = customAmount !== '' ? Number(customAmount) : calculatedTotal;
  const balanceAfter = amountToCollect < calculatedTotal ? calculatedTotal - amountToCollect : 0;

  const submitPayment = async () => {
    if (!selectedStudent || amountToCollect <= 0) return;
    setProcessing(true);
    try {
      const receiptNo = `RCP-2083-${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;
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
        otherFees: otherFees
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
          otherFees: otherFees,
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
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-100 text-emerald-800 px-6 py-3 rounded-full font-black shadow-lg flex items-center gap-2 animate-in slide-in-from-top fade-in">
          <CheckCircle2 className="w-5 h-5" />
          {toastMessage}
        </div>
      )}

      {/* STEP 1: Search */}
      {!selectedStudent && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
          <h2 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Step 1: Find Student</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search student by name, ID, or class..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full pl-14 pr-4 py-4 md:py-5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all outline-none"
            />
          </div>
          
          {(isSearchFocused || searchTerm) && (
            <div className={`mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden absolute w-[calc(100%-3rem)] max-w-4xl z-50 transition-opacity duration-200 ${(isSearchFocused || searchTerm) ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
              {studentsData.filter(s => 
                (String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                 String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                 String(s.class || '').toLowerCase().includes(searchTerm.toLowerCase()))
              ).slice(0, 5).map(s => (
                <div 
                  key={s.id} 
                  onMouseDown={(e) => { e.preventDefault(); handleStudentSelect(s); }}
                  className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                      {s.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-500 uppercase font-mono">Class {s.class} • ID: {s.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${getStudentDue(s) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {getStudentDue(s) > 0 ? `Dues: रू ${getStudentDue(s).toLocaleString()}` : 'Cleared'}
                    </p>
                  </div>
                </div>
              ))}
              {studentsData.filter(s => 
                (String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                 String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                 String(s.class || '').toLowerCase().includes(searchTerm.toLowerCase()))
              ).length === 0 && (
                <div className="p-6 text-center text-gray-500 font-bold uppercase text-sm tracking-widest">No students found</div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedStudent && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* STUDENT INFO CARD */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
             <div className="text-left md:text-right w-full md:w-auto bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Due</p>
                <p className="text-3xl font-black text-red-600">रू {getStudentDue(selectedStudent).toLocaleString()}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             {/* Left side info */}
             <div className="md:col-span-7 space-y-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h2 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Step 2: Select Months</h2>
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
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isSelected ? 'bg-emerald-50 border-emerald-200 cursor-pointer' : 'bg-white border-gray-200 hover:border-emerald-300 cursor-pointer shadow-sm'
                          }`}
                        >
                           <div className="flex items-center gap-4">
                              {isSelected ? (
                                <CheckSquare className="w-6 h-6 text-emerald-600" />
                              ) : (
                                <Square className="w-6 h-6 text-gray-300" />
                              )}
                              <span className={`font-black uppercase tracking-widest ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>{m} 2083</span>
                           </div>
                           <span className={`font-black ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>
                             रू {displayFee.toLocaleString()}
                           </span>
                        </div>
                     );
                   })}
                 </div>
                 
                 <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                    <span className="font-black text-gray-500 uppercase tracking-widest text-sm">Tuition Total:</span>
                    <span className="font-black text-gray-800 text-xl">रू {calculatedMonthsTotal.toLocaleString()}</span>
                 </div>
                 
                 <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Other Fees / Fines</h3>
                      <button onClick={addOtherFee} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100 transition-colors flex gap-1 items-center">
                         <Plus className="w-3 h-3" /> Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                       {otherFees.map(fee => (
                         <div key={fee.id} className="flex gap-2 items-center">
                            <input 
                               type="text" 
                               value={fee.name} 
                               onChange={(e) => updateOtherFee(fee.id, 'name', e.target.value)} 
                               placeholder="Description (e.g. Late Fine)"
                               className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                            />
                            <div className="relative w-28">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">रू</span>
                               <input 
                                  type="number" 
                                  value={fee.amount} 
                                  onChange={(e) => updateOtherFee(fee.id, 'amount', e.target.value)} 
                                  className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none"
                               />
                            </div>
                            <button onClick={() => removeOtherFee(fee.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                       {otherFees.length === 0 && (
                          <div className="text-center py-4 bg-gray-50 border border-gray-100 border-dashed rounded-xl">
                            <p className="text-xs font-bold text-gray-400">No additional fees</p>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="font-black text-blue-800 uppercase tracking-widest text-sm">Grand Total:</span>
                    <span className="font-black text-blue-900 text-2xl">रू {calculatedTotal.toLocaleString()}</span>
                 </div>
               </div>
             </div>

             {/* Right side payment form */}
             <div className="md:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                   <h2 className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Step 3: Payment Details</h2>
                   
                   <div className="space-y-5">
                     <div>
                       <label className="text-xs font-black text-gray-600 uppercase tracking-widest ml-1 mb-2 block">Amount Paying (NRs.)</label>
                       <input 
                         type="number"
                         value={customAmount !== '' ? customAmount : (calculatedTotal > 0 ? calculatedTotal : '')}
                         onChange={e => setCustomAmount(e.target.value)}
                         className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-4 md:py-5 min-h-[48px] text-2xl font-black text-emerald-700 focus:ring-0 focus:border-emerald-500 transition-colors placeholder-emerald-200 outline-none"
                         placeholder="0"
                       />
                       {balanceAfter > 0 && (
                          <p className="text-xs font-bold text-red-500 mt-2 ml-1">Balance after payment: रू {balanceAfter.toLocaleString()}</p>
                       )}
                     </div>

                     <div>
                       <label className="text-xs font-black text-gray-600 uppercase tracking-widest ml-1 mb-2 block">Payment Method</label>
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                         {[
                           { name: 'Cash', icon: Banknote },
                           { name: 'Bank Transfer', icon: CreditCard },
                           { name: 'eSewa', icon: Smartphone },
                           { name: 'Khalti', icon: Smartphone },
                           { name: 'Cheque', icon: FileDown },
                           { name: 'Other', icon: FileDown }
                         ].map(pm => (
                           <button 
                             key={pm.name}
                             onClick={() => setMethod(pm.name)}
                             className={`min-h-[48px] p-2 rounded-xl text-xs sm:text-[10px] font-black border transition-all flex flex-col items-center justify-center gap-1 ${
                               method === pm.name ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                             }`}
                           >
                             <pm.icon className={`w-4 h-4 ${method === pm.name ? 'text-blue-600' : 'text-gray-400'}`}/>
                             {pm.name}
                           </button>
                         ))}
                       </div>
                     </div>

                     <div>
                       <label className="text-xs font-black text-gray-600 uppercase tracking-widest ml-1 mb-2 block">Remarks (Optional)</label>
                       <input 
                         type="text"
                         value={remark}
                         onChange={e => setRemark(e.target.value)}
                         placeholder="Note details..."
                         className="w-full min-h-[48px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Receipt No</label>
                          <input type="text" value="Auto-generated" disabled className="w-full bg-gray-100 border-transparent rounded-lg px-3 py-2 text-xs font-bold text-gray-500" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Date (B.S.)</label>
                          <input type="text" value={bsDate} onChange={e => setBsDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:border-blue-500" />
                        </div>
                     </div>
                   </div>
                </div>
             </div>
          </div>
          
          {/* STEP 4: Submit Button Mobile Fixed Bottom / Desktop normal */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:static md:bg-transparent md:border-t-0 md:p-0 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] md:shadow-none">
             <button 
               onClick={submitPayment}
               disabled={processing || amountToCollect <= 0}
               className="w-full py-4 bg-[#059669] text-white rounded-xl text-lg font-black uppercase tracking-widest shadow-lg hover:bg-[#047857] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
               {processing ? 'Processing...' : (
                 <>
                   <Check className="w-6 h-6" />
                   Record Payment & Generate Receipt
                 </>
               )}
             </button>
          </div>
        </div>
      )}

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
                     <span className="text-gray-800 font-mono font-black">{receipt.receiptNo}</span>
                   </div>
                   <div className="text-right">
                     <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Date</span>
                     <span className="text-gray-800 font-bold">{receipt.bsDate}</span>
                   </div>
                 </div>

                 <div className="p-4 border border-gray-100 rounded-xl">
                   <div className="flex justify-between text-sm mb-2">
                     <span className="text-gray-500 font-bold">Student Name</span>
                     <span className="text-gray-800 font-black">{receipt.studentName}</span>
                   </div>
                   <div className="flex justify-between text-sm mb-2">
                     <span className="text-gray-500 font-bold">Class | ID</span>
                     <span className="text-gray-800 font-bold text-right">{receipt.class} | {receipt.studentId}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500 font-bold">Guardian</span>
                     <span className="text-gray-800 font-bold text-right">{selectedStudent?.guardianName || ''}</span>
                   </div>
                 </div>
                 
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                    {receipt.months?.length > 0 && receipt.months.map((m: string) => {
                      const feeDoc = selectedStudent?.fees?.find((f: any) => f.month === m);
                      const netPerMonth = feeDoc ? Number(feeDoc.totalFee || feeDoc.dueAmount || 0) : tuitionFee;
                      const scholarship = Number(selectedStudent?.scholarshipAmount) || 0;
                      const baseFee = netPerMonth + scholarship;
                      return (
                      <div key={m} className="space-y-1 pb-3 mb-3 border-b border-blue-100 last:border-0 last:pb-0 last:mb-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-800 font-bold">{m} Base Fee</span>
                          <span className="text-blue-900">रू {baseFee.toLocaleString()}</span>
                        </div>
                        {scholarship > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-600 font-bold">Scholarship/Discount</span>
                            <span className="text-emerald-700">- रू {scholarship.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-1 mt-1 border-t border-blue-100/50">
                          <span className="text-blue-900 font-black">Net Amount</span>
                          <span className="text-blue-900 font-black">रू {netPerMonth.toLocaleString()}</span>
                        </div>
                      </div>
                    )})}
                    {receipt.otherFees?.length > 0 && receipt.otherFees.map((f: any, idx: number) => (
                      <div key={idx} className="space-y-1 pb-3 mb-3 border-b border-blue-100 last:border-0 last:pb-0 last:mb-0">
                         <div className="flex justify-between text-sm">
                           <span className="text-blue-800 font-bold">{f.name}</span>
                           <span className="text-blue-900 font-black">रू {Number(f.amount).toLocaleString()}</span>
                         </div>
                      </div>
                    ))}
                    {(receipt.months?.length === 0 && receipt.otherFees?.length === 0) && (
                       <div className="flex justify-between text-sm">
                        <span className="text-blue-800 font-bold">Tuition Payment</span>
                        <span className="text-blue-900 font-black">रू {receipt.amount}</span>
                      </div>
                    )}
                 </div>

                 <div className="mt-6 border-t border-b border-gray-200 py-4 divide-y divide-gray-100">
                   <div className="flex justify-between items-center pb-3">
                     <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Total Paid</span>
                     <span className="text-2xl font-black text-gray-800">रू {receipt.amount.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center pt-3 mt-1 text-sm">
                     <span className="font-bold text-gray-500">Method: <span className="text-gray-800">{receipt.method}</span></span>
                     <span className="font-bold text-gray-500">Balance Due: <span className="text-red-500 font-black">रू {receipt.balanceAfter.toLocaleString()}</span></span>
                   </div>
                 </div>
                 
                 <div className="mt-8 flex justify-between items-end text-xs pt-8 border-t border-gray-100">
                   <div>
                     <span className="text-gray-400 font-bold block mb-1">Collected by: </span>
                     <span className="text-gray-800 font-black">{receipt.recordedBy}</span>
                   </div>
                   <div className="border-t-2 border-gray-800 w-32 text-center pt-2 font-bold text-gray-800">
                     Signature
                   </div>
                 </div>
               </div>
             </div>

             <div className="p-4 bg-white border-t border-gray-200 space-y-3">
               <button onClick={() => window.open(`https://wa.me/977${selectedStudent?.guardianPhone}?text=${encodeURIComponent(`Namaste, we have received a payment of NRs. ${receipt.amount} for ${receipt.studentName}. Receipt No: ${receipt.receiptNo}. Thank you.`)}`, '_blank')} className="w-full py-3 bg-[#25D366] text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md flex justify-center items-center gap-2 hover:bg-[#128C7E] transition-colors">
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
