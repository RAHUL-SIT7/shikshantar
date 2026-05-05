import React, { useState, useEffect } from 'react';
import { History, Wallet, CreditCard, AlertCircle, FileDown, Receipt } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const MONTHS = ['Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra', 'Baisakh', 'Jestha', 'Ashad'];

export default function Account() {
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [feeStructure, setFeeStructure] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [esewaQrData, setEsewaQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (receiptRef.current.offsetHeight * pdfWidth) / receiptRef.current.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receipt.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  useEffect(() => {
    const fetchStudent = async () => {
      const user = auth.currentUser;
      if (!user) {
        setStudentRecord(null);
        setLoading(false);
        return;
      }
      
      try {
        let studentId = user.uid;
        const userDoc = await getDoc(doc(db, 'users', studentId));
        
        if (userDoc.exists() && userDoc.data().role === 'student') {
           const sData: any = { id: userDoc.id, name: userDoc.data().fullName || userDoc.data().name, ...userDoc.data() };
           
           const structSnap = await getDocs(collection(db, 'feeStructure'));
           const structs = structSnap.docs.map(d => ({ class: d.id, ...d.data() } as any));
           const structure = structs.find((s: any) => s.class === sData.class) || { tuitionFee: 1000, examFee: 500, annualFee: 12000 };
           
           if (sData.scholarshipStatus === 'Provided' && sData.scholarshipAmount) {
              const deduction = Number(sData.scholarshipAmount);
              structure.tuitionFee = Math.max(0, structure.tuitionFee - deduction);
           }

           const feesSnap = await getDocs(query(collection(db, 'studentFees'), where('studentId', '==', studentId)));
           const fees = feesSnap.docs.map(d => d.data());
           
           const txSnap = await getDocs(query(collection(db, 'transactions'), where('studentId', '==', studentId), where('status', '==', 'SUCCESS')));
           const txData = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

           setStudentRecord({ ...sData, fees });
           setTransactions(txData);
           setFeeStructure(structure);
        } else {
           setStudentRecord(null);
        }
      } catch (err) {
         console.error('Account dataload error:', err);
         setError('Failed to load account data');
      }
      setLoading(false);
    };

    const unsubAuth = onAuthStateChanged(auth, () => {
      fetchStudent();
    });

    return () => {
      unsubAuth();
    };
  }, []);

  if (loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse uppercase tracking-widest text-xs">Accessing Secure Ledger...</div>;
  if (error || !studentRecord) return (
    <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 max-w-2xl mx-auto mt-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-50 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none opacity-60"></div>

        <div className="relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-white">
             <AlertCircle className="w-12 h-12 text-red-300 opacity-50 absolute" />
             <Wallet className="w-10 h-10 text-red-500 relative z-10" />
          </div>
          
          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Account Not Linked</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            We couldn't load your financial records. This usually happens if your digital account hasn't been paired with your official school ID.
          </p>
          <button onClick={() => window.history.back()} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 shadow-md shadow-gray-900/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
              &larr; Go Back
          </button>
        </div>
    </div>
  );

  const getStudentDue = () => {
      let totalDue = 0;
      studentRecord.fees?.forEach((f: any) => {
          if (f.status === 'due') {
              totalDue += Number(f.dueAmount || 0);
          }
      });
      return totalDue;
  };

  const getStudentPaidAmount = () => {
      let totalPaid = 0;
      transactions.forEach(t => {
          totalPaid += t.amount || 0;
      });
      return totalPaid;
  };

  const handleEsewa = async () => {
    try {
      if (totalDue <= 0) return;
      const transaction_uuid = `${studentRecord.id}-${Date.now()}`;
      const product_code = "EPAYTEST";
      
      const res = await fetch("/api/payment/esewa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalDue, transaction_uuid, product_code })
      });
      
      const { signature, message } = await res.json();
      
      if (!signature) {
          setError("Failed to generate signature for eSewa.");
          return;
      }

      // Create a hidden form and submit to eSewa sandbox
      const form = document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', 'https://rc-epay.esewa.com.np/api/epay/main/v2/form');
      
      const params = {
        amount: totalDue,
        tax_amount: "0",
        total_amount: totalDue,
        transaction_uuid: transaction_uuid,
        product_code: product_code,
        product_delivery_charge: "0",
        product_service_charge: "0",
        success_url: window.location.origin + "/success",
        failure_url: window.location.origin + "/failure",
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: signature
      };

      for (const key in params) {
        const hiddenField = document.createElement('input');
        hiddenField.setAttribute('type', 'hidden');
        hiddenField.setAttribute('name', key);
        hiddenField.setAttribute('value', params[key as keyof typeof params].toString());
        form.appendChild(hiddenField);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      setError("Payment initiation failed.");
    }
  };

  const generateEsewaQR = async () => {
    try {
      if (totalDue <= 0) return;
      const transaction_uuid = `${studentRecord.id}-${Date.now()}`;
      const product_code = "EPAYTEST";
      
      const res = await fetch("/api/payment/esewa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalDue, transaction_uuid, product_code })
      });
      
      const { signature } = await res.json();
      
      if (!signature) {
          setError("Failed to generate signature for eSewa.");
          return;
      }

      // Construct properties for QR code text representation.
      // E.g., we could encode a URI that contains the form POST data, or just the POST action URL with GET parameters.
      setEsewaQrData({
        url: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        amount: totalDue,
        transaction_uuid,
        product_code,
        signature
      });

    } catch (err) {
      console.error(err);
      setError("Payment QR generation failed.");
    }
  };

  const handleKhalti = async () => {
    try {
      if (totalDue <= 0) return;
      
      const reqBody = {
        return_url: window.location.origin + "/success",
        website_url: window.location.origin,
        amount: totalDue * 100, // Amount in paisa
        purchase_order_id: `KHL-${studentRecord.id}-${Date.now()}`,
        purchase_order_name: `${studentRecord.name} Pending Dues`,
        customer_info: {
          name: studentRecord.name,
          email: studentRecord.email || "student@school.com",
          phone: "9800000000" // Requires valid phone
        }
      };

      const res = await fetch("/api/payment/khalti/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      
      const data = await res.json();
      
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        console.error("Khalti Init Error:", data);
        setError("Could not initiate Khalti payment. Please try again.");
      }
    } catch (err) {
      console.error("Khalti catch err:", err);
      setError("Khalti payment error.");
    }
  };

  const totalDue = getStudentDue();
  const totalPaid = getStudentPaidAmount();
  const annualTotal = feeStructure ? (feeStructure.annualFee || (feeStructure.tuitionFee * 12 + feeStructure.examFee)) : 10000;
  
  const paymentHistory = transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const progressPercentage = annualTotal > 0 ? Math.min(Math.round((totalPaid / annualTotal) * 100), 100) : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-5xl mx-auto mb-20">
      
      {/* Top Banner specific handling */}
      {totalDue > 0 ? (
        <div className="w-full bg-red-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between border border-red-200">
           <div className="text-center md:text-left mb-4 md:mb-0">
               <h3 className="text-lg font-black text-red-800 flex items-center justify-center md:justify-start gap-2">
                 ⚠️ Fee Due: NRs. {totalDue.toLocaleString()}
               </h3>
               <p className="text-red-600 text-sm font-medium mt-1">Please visit school fee office to pay</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
             <button onClick={handleEsewa} className="bg-[#60bb46] hover:bg-[#4ea835] text-white px-5 py-3 rounded-xl font-bold shadow-md shadow-[#60bb46]/20 transition-colors whitespace-nowrap">
                Pay with eSewa
             </button>
             <button onClick={generateEsewaQR} className="bg-white text-[#60bb46] border border-[#60bb46] hover:bg-emerald-50 px-5 py-3 rounded-xl font-bold transition-colors whitespace-nowrap">
                eSewa QR
             </button>
             <button onClick={handleKhalti} className="bg-[#5C2D91] hover:bg-[#4a2474] text-white px-5 py-3 rounded-xl font-bold shadow-md shadow-[#5C2D91]/20 transition-colors whitespace-nowrap">
                Pay with Khalti
             </button>
           </div>
        </div>
      ) : (
        <div className="w-full bg-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between border border-emerald-200">
           <div className="text-center md:text-left mb-4 md:mb-0">
               <h3 className="text-lg font-black text-emerald-800 flex items-center justify-center md:justify-start gap-2">
                 ✅ All fees cleared for this month
               </h3>
               <p className="text-emerald-700 text-sm font-medium mt-1">Next due: Shrawan 2084</p>
           </div>
        </div>
      )}

      {/* Account Info Banner */}
      <div className="bg-[#1e293b] text-white rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden group">
        <Wallet className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 group-hover:scale-110 transition-transform duration-700" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[4px] text-blue-400 mb-2">My Fee Status</p>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{studentRecord.name}</h1>
              <p className="text-sm font-bold opacity-70 mt-3 flex flex-wrap items-center gap-2">
                <span className="bg-white/10 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest text-[10px]">Class {studentRecord.class}</span>
                <span className="bg-white/10 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest text-[10px]">ID: {studentRecord.id.substring(0, 8)}</span>
              </p>
            </div>
            
            {/* ANNUAL OVERVIEW CARD */}
            <div className="text-left md:text-right bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10 shrink-0 min-w-[200px]">
               <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Annual Fee</p>
                  <p className="text-xs font-black text-white px-2 py-0.5 rounded bg-white/10">NRs. {annualTotal.toLocaleString()}</p>
               </div>
               <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Remaining Due</p>
                  <p className={`text-sm font-black ${totalDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>NRs. {totalDue.toLocaleString()}</p>
               </div>
               
               <div className="w-full bg-black/40 rounded-full h-2 mb-1 border border-white/5 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
               </div>
               <p className="text-[10px] text-white/60 font-bold tracking-wider text-right">{progressPercentage}% Paid (NRs. {totalPaid.toLocaleString()})</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Col */}
        <div className="lg:col-span-12 space-y-6">
           
          {/* 12-Month Timeline */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
             <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">12-Month Payment Tracker</h3>
             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-2 md:gap-3">
               {MONTHS.map((m, idx) => {
                 const feeDoc = studentRecord.fees?.find((f: any) => f.month === m);
                 const isPaid = feeDoc?.status === 'paid';
                 const isDue = feeDoc?.status === 'due';
                 return (
                    <div key={m} className={`p-2 md:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 md:gap-2 transition-all cursor-pointer hover:shadow-md ${
                       isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                       isDue ? 'bg-red-50 border-red-200 text-red-600' : 
                       'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                       <p className="text-[9px] md:text-[11px] font-black uppercase tracking-tight w-full text-center truncate">{m.slice(0, 3)}.</p>
                       {isPaid ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</div>
                       ) : isDue ? (
                          <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">✗</div>
                       ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs">—</div>
                       )}
                    </div>
                 );
               })}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Fee Breakdown */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Fee Breakdown</h3>
                <div className="space-y-4">
                   <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                      <span className="font-bold text-gray-600">Monthly Tuition x12</span>
                      <span className="font-black text-gray-900">{(feeStructure?.tuitionFee || 0) * 12}</span>
                   </div>
                   <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                      <span className="font-bold text-gray-600">Annual Exam Fee</span>
                      <span className="font-black text-gray-900">{feeStructure?.examFee || 0}</span>
                   </div>
                   {annualTotal - (((feeStructure?.tuitionFee || 0) * 12) + (feeStructure?.examFee || 0)) > 0 && (
                      <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                         <span className="font-bold text-gray-600">Other (Sports, Computer)</span>
                         <span className="font-black text-gray-900">{annualTotal - (((feeStructure?.tuitionFee || 0) * 12) + (feeStructure?.examFee || 0))}</span>
                      </div>
                   )}
                   <div className="flex justify-between items-center py-3 bg-gray-50 rounded-xl px-4 mt-2">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-black text-gray-900">NRs. {annualTotal.toLocaleString()}</span>
                   </div>
                </div>
             </div>

             {/* Receipts Grid */}
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <History className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">My Receipts</h3>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {paymentHistory.map(txn => (
                    <div key={txn.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-wrap gap-2 justify-between items-center hover:border-blue-200 transition-colors">
                       <div>
                          <p className="text-xs font-black text-gray-900">{txn.receipt || txn.id.substring(0, 8)}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{txn.date} • {txn.method}</p>
                       </div>
                       <div className="text-right flex items-center gap-4">
                          <p className="text-sm font-black text-emerald-600">रू {txn.amount.toLocaleString()}</p>
                          <button onClick={() => setReceipt(txn)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg" title="Download">
                             <FileDown className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))}
                  {paymentHistory.length === 0 && (
                    <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                        No transactions recorded
                    </div>
                  )}
                </div>
             </div>
          </div>
          
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-2xl md:hidden z-50">
         <a 
            href={`https://wa.me/9779807790805?text=${encodeURIComponent(`Namaste, Ma ${studentRecord.name} hu, Class ${studentRecord.class}, Mero fee barema kura garna chahanchhu.`)}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full bg-[#1e3a8a] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            📞 Contact Fee Office — +977 9807790805
         </a>
      </div>

      {/* eSewa QR Code Modal */}
      {esewaQrData && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col p-8 text-center animate-in zoom-in-95 duration-200">
             <div className="mb-6 flex justify-center">
                <img src="https://esewa.com.np/common/images/esewa_logo.png" alt="eSewa Logo" className="h-10" />
             </div>
             <h3 className="text-xl font-black text-gray-800 mb-2">Scan to Pay</h3>
             <p className="text-sm font-bold text-gray-500 mb-6">Amount: <span className="text-[#60bb46]">NRs. {esewaQrData.amount}</span></p>
             
             <div className="bg-gray-50 p-2 inline-block rounded-xl mx-auto mb-6 border border-gray-100">
                <img 
                   src="https://i.postimg.cc/jd6J3mtF/image.png" 
                   alt="eSewa QR Code" 
                   className="w-[200px] h-[200px] object-contain rounded-lg"
                />
             </div>
             
             <p className="text-[10px] text-gray-400 font-medium mb-6 px-4">
                Please scan the QR code above using your eSewa app. Make sure to enter your Admission ID in the remarks.
             </p>

             <button onClick={() => setEsewaQrData(null)} className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm transition-colors hover:bg-gray-200">
                Close
             </button>
          </div>
        </div>
      )}

      {receipt && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                      <span className="text-gray-800 font-mono font-black">{receipt.receipt || receipt.id.substring(0, 8)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Date</span>
                      <span className="text-gray-800 font-bold">{receipt.date}</span>
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
                  
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                     {receipt.months?.length > 0 ? receipt.months.map((m: string) => {
                       const netPerMonth = (receipt.amount || 0) / receipt.months.length;
                       return (
                       <div key={m} className="space-y-1 pb-3 mb-3 border-b border-blue-100 last:border-0 last:pb-0 last:mb-0">
                         <div className="flex justify-between text-sm">
                           <span className="text-blue-800 font-bold">{m} Tuition Fee</span>
                           <span className="text-blue-900 font-black">रू {netPerMonth.toLocaleString()}</span>
                         </div>
                       </div>
                     )}) : (
                        <div className="flex justify-between text-sm">
                         <span className="text-blue-800 font-bold">Tuition Payment</span>
                         <span className="text-blue-900 font-black">रू {(receipt.amount || 0).toLocaleString()}</span>
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
                       
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                <div className="flex gap-3">
                   <button onClick={() => setReceipt(null)} className="flex-1 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-600 uppercase tracking-widest text-[10px] sm:text-xs transition-colors hover:bg-gray-100">Close</button>
                   <button onClick={downloadReceipt} className="flex-1 py-3 bg-[#1e3a8a] text-white border border-[#1e3a8a] rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors"><FileDown className="w-4 h-4"/> Download PDF</button>
                </div>
              </div>
           </div>
         </div>
      )}

    </div>
  );
}
