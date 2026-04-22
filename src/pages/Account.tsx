import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, FileText, Printer, ShieldCheck, Download, History } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function Account() {
  const [showNotification, setNotification] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  
  // Try to use shared memory with Admin side via localStorage
  const [studentRecord, setStudentRecord] = useState<any>({
    id: 'S101', name: 'Aarav Sharma', class: '10', due: 20000, paid: 30000 // default fallback
  });

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll for the latest student record
    const fetchRecord = () => {
      const storedStudents = localStorage.getItem('school_fees_students');
      if (storedStudents) {
        const parsed = JSON.parse(storedStudents);
        const aarav = parsed.find((s: any) => s.id === 'S101');
        if (aarav) setStudentRecord(aarav);
      } else {
        // Init if missing
        localStorage.setItem('school_fees_students', JSON.stringify([studentRecord]));
      }

      // Fetch history
      const storedHistory = localStorage.getItem('school_fees_history');
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        const myHistory = parsed.filter((t: any) => t.studentId === 'S101');
        setPaymentHistory(myHistory);
      }
    };
    
    fetchRecord();
    const intervalId = setInterval(fetchRecord, 2000); // Poll every 2 seconds for testing purposes to see admin updates reflect here
    return () => clearInterval(intervalId);
  }, []);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      alert("Please select a payment method");
      return;
    }
    if (paymentAmount <= 0 || paymentAmount > studentRecord.due) {
      alert(`Invalid amount. Must be greater than 0 and up to ${studentRecord.due}`);
      return;
    }

    const updatedStudent = {
      ...studentRecord,
      paid: studentRecord.paid + paymentAmount,
      due: studentRecord.due - paymentAmount
    };

    // Update students list in localStorage
    const storedStudents = localStorage.getItem('school_fees_students');
    let allStudents = storedStudents ? JSON.parse(storedStudents) : [studentRecord];
    allStudents = allStudents.map((s: any) => s.id === 'S101' ? updatedStudent : s);
    localStorage.setItem('school_fees_students', JSON.stringify(allStudents));

    // Append to transactions list in localStorage for Admin to see
    const storedHistory = localStorage.getItem('school_fees_history');
    let allHistory = storedHistory ? JSON.parse(storedHistory) : [];
    
    const newTxn = {
      id: `TXN${Date.now().toString().slice(-6)}`,
      studentId: studentRecord.id,
      studentName: studentRecord.name,
      date: new Date().toISOString().split('T')[0],
      amount: paymentAmount,
      method: paymentMethod + " (Portal)"
    };
    allHistory = [newTxn, ...allHistory];
    localStorage.setItem('school_fees_history', JSON.stringify(allHistory));

    setStudentRecord(updatedStudent);
    setNotification(true);
    setPaymentAmount(Math.min(10000, updatedStudent.due));
    setTimeout(() => setNotification(false), 5000);
  };

  const [downloadingTxn, setDownloadingTxn] = useState<any>(null);
  const oldReceiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const processOldReceipt = async () => {
      if (downloadingTxn && oldReceiptRef.current) {
        setIsGeneratingPdf(true);
        try {
          // Temporarily unhide to ensure layout is computed correctly
          const el = oldReceiptRef.current;
          el.style.opacity = '1';
          
          window.scrollTo(0, 0); // avoid partial rendering bugs related to scroll

          const canvas = await html2canvas(el, { 
            scale: 2, 
            useCORS: true,
            windowWidth: 800,
            width: 800
          });
          
          el.style.opacity = '0'; // re-hide

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const padding = 10;
          const pdfWidth = pdf.internal.pageSize.getWidth() - (padding * 2);
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', padding, padding, pdfWidth, pdfHeight);
          pdf.save(`Historical_Receipt_${downloadingTxn.id}.pdf`);
        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Failed to generate PDF. Check browser permissions.');
        } finally {
          setIsGeneratingPdf(false);
          setDownloadingTxn(null);
        }
      }
    };
    if (downloadingTxn) {
      setTimeout(processOldReceipt, 100);
    }
  }, [downloadingTxn]);

  const handlePrintReceipt = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);
    try {
      window.scrollTo(0, 0);
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const padding = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - (padding * 2);
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', padding, padding, pdfWidth, pdfHeight);
      pdf.save(`Official_Bill_${studentRecord.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Check browser permissions.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadOldReceipt = (txn: any) => {
    setDownloadingTxn(txn);
  };

  // Prepare Dynamic Fees Breakdown for realistic formatting
  const totalAssessed = studentRecord.due + studentRecord.paid;
  const feeBreakdown = [
    { label: "Annual Tuition Fee", amount: totalAssessed * 0.55 },
    { label: "Admission & Annual Session Fee", amount: totalAssessed * 0.15 },
    { label: "Computer & Science Lab Fee", amount: totalAssessed * 0.10 },
    { label: "Continuous Evaluation & Exam Fee", amount: totalAssessed * 0.10 },
    { label: "Library, Sports & Extra-curricular", amount: totalAssessed * 0.10 }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative print:block">
        {showNotification && (
        <div className="col-span-1 md:col-span-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-3 rounded-lg text-sm flex items-center gap-2 print:hidden z-10">
          <CheckCircle2 className="h-4 w-4" />
          Payment processed. Receipt recorded and Sent to Admin!
        </div>
      )}

      {/* Left Column (Summary + History) */}
      <div className="col-span-1 flex flex-col gap-5 print:hidden">

        {/* Account Summary */}
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
          <span>Fees & Payments</span>
          {studentRecord.due > 0 ? (
            <span className="bg-[#fee2e2] text-[#b91c1c] px-2 py-1 rounded text-[0.65rem]">Due: NRs. {studentRecord.due.toLocaleString()}</span>
          ) : (
             <span className="bg-[#dcfce7] text-[#15803d] px-2 py-1 rounded text-[0.65rem]">Fully Paid</span>
          )}
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="text-[0.8rem] opacity-70">Annual Total</span>
          <span className="text-[0.8rem] font-semibold">NRs. {(studentRecord.due + studentRecord.paid).toLocaleString()}</span>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-[0.8rem] opacity-70">Paid Amount</span>
          <span className="text-[0.8rem] font-semibold text-[#059669]">NRs. {studentRecord.paid.toLocaleString()}</span>
        </div>
        
        <div className="my-3 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#f97316] rounded-full transition-all duration-500" 
            style={{ width: `${(studentRecord.paid / (studentRecord.due + studentRecord.paid)) * 100}%` }}>
          </div>
        </div>
        
        {studentRecord.due > 0 ? (
          <>
            <div className="text-[0.7rem] text-[#6b7280] mb-2 mt-4 font-bold border-t border-[#e5e7eb] pt-3">Pay Online:</div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <a href="https://esewa.com.np/#/home" target="_blank" rel="noopener noreferrer" className={`text-[0.6rem] px-3 py-1.5 font-bold rounded border transition-colors bg-[#f9fafb] border-[#e5e7eb] hover:bg-[#e0f2fe] hover:text-[#0369a1] hover:border-[#0369a1]`}>eSewa App</a>
              <a href="https://khalti.com/" target="_blank" rel="noopener noreferrer" className={`text-[0.6rem] px-3 py-1.5 font-bold rounded border transition-colors bg-[#f9fafb] border-[#e5e7eb] hover:bg-[#e0f2fe] hover:text-[#0369a1] hover:border-[#0369a1]`}>Khalti App</a>
              <button type="button" onClick={() => setPaymentMethod('Bank Transfer')} className={`text-[0.6rem] px-3 py-1.5 font-bold rounded border transition-colors ${paymentMethod === 'Bank Transfer' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] hover:bg-[#f1f5f9]'}`}>Bank Transfer Setup</button>
            </div>

            <form onSubmit={handlePayment}>
              <div className="mb-3">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                  placeholder="Amount"
                  max={studentRecord.due}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#1e3a8a] text-white font-medium py-2 px-4 rounded text-sm hover:bg-[#1e40af] transition-colors"
              >
                Proceed Setup
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6 text-center text-sm font-bold text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] py-3 rounded-lg">
            No pending dues at the moment!
          </div>
        )}
        </section>

        {/* Payment History */}
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex-1">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-[#1e3a8a]" /> Payment History
          </div>
          
          {paymentHistory.length === 0 ? (
            <div className="text-center text-xs text-[#6b7280] bg-[#f8fafc] py-6 rounded border border-dashed border-[#cbd5e1]">
              No past payments recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((txn, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] hover:bg-[#f1f5f9] transition-colors">
                  <div>
                    <p className="text-xs font-bold text-[#111827]">NRs. {txn.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-[#6b7280]">{txn.date} &bull; {txn.method}</p>
                  </div>
                  <button 
                    onClick={() => handleDownloadOldReceipt(txn)}
                    className="p-1.5 bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd] rounded transition-colors"
                    title="Download Receipt"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Official Bill Slip Container (Visible mostly for printing) */}
      <section className="col-span-1 md:col-span-2 bg-transparent relative print:block print:w-full print:m-0 print:p-0">
        <div ref={receiptRef} className="bg-[#ffffff] rounded-xl p-6 md:p-10 shadow-lg border border-[#e5e7eb] relative print:border-none print:shadow-none bg-white print:m-0 print:p-0">
          
          <div className="flex justify-between items-start mb-6 border-b-2 border-[#1e3a8a] pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white p-1 rounded-full shadow-sm">
                <img crossOrigin="anonymous" src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a8a] tracking-wider uppercase">Shikshantar Academy</h1>
                <p className="text-xs md:text-sm font-bold text-[#4b5563]">Bastipur-5, Siraha</p>
                <p className="text-xs text-[#6b7280]">Estd. 2072 B.S.</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-[#f97316] uppercase mt-2">Official Bill Slip</h2>
              <div className="text-xs text-[#4b5563] mt-1 space-y-0.5">
                <p>Date: <strong>{new Date().toLocaleDateString()}</strong></p>
                <p>Student ID: <strong className="font-mono">{studentRecord.id}</strong></p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-sm bg-[#f8fafc] p-4 rounded-lg border border-[#e5e7eb]">
            <div className="space-y-1">
              <p className="text-[#6b7280]">Student Name:</p>
              <p className="font-bold text-base text-[#111827]">{studentRecord.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[#6b7280]">Class/Grade:</p>
              <p className="font-bold text-base text-[#111827]">Class {studentRecord.class}</p>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e3a8a] text-white">
                  <th className="text-left p-3 font-semibold rounded-tl-lg">Description</th>
                  <th className="text-right p-3 font-semibold rounded-tr-lg">Amount (NRs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] border-b border-[#e5e7eb]">
                {feeBreakdown.map((fee, i) => (
                  <tr key={i}>
                    <td className="p-3 text-[#374151]">{fee.label}</td>
                    <td className="p-3 text-right font-mono">{fee.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                ))}
                <tr className="bg-[#f8fafc]">
                  <td className="p-3 font-bold text-[#111827] text-right">TOTAL ASSESSMENT:</td>
                  <td className="p-3 text-right font-mono font-bold text-[#1f2937]">{totalAssessed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[#15803d] font-bold text-right pt-6">Payments Cleared</td>
                  <td className="p-3 text-right font-mono text-[#15803d] pt-6">- {studentRecord.paid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#fee2e2]">
                  <td className="p-3 font-extrabold text-[#991b1b] text-right rounded-bl-lg uppercase">Total Pending Balance:</td>
                  <td className="p-3 text-right font-mono font-extrabold text-xl text-[#b91c1c] rounded-br-lg">{studentRecord.due.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-end mt-12 pt-6">
            <div className="text-center">
              <div className="w-32 h-10 border-b-2 border-[#d1d5db] mb-2 flex items-center justify-center">
                {/* Simulated Signature */}
                <span className="font-[cursive] text-lg text-[#1e3a8a] opacity-80 -rotate-3">Shyam L.</span>
              </div>
              <p className="text-xs font-bold text-[#4b5563]">Authorized Signature</p>
              <p className="text-[10px] text-[#6b7280] uppercase mt-0.5">Accountant</p>
            </div>
            
            <div className="flex flex-col items-center gap-1 opacity-60">
               <ShieldCheck className="w-8 h-8 text-[#15803d]" />
               <span className="text-[10px] font-bold tracking-widest text-center">SYSTEM GENERATED<br/>VALID DOCUMENT</span>
            </div>
          </div>

          {/* Action Buttons for screen only */}
          <div className="absolute top-4 right-4 print:hidden flex gap-2" data-html2canvas-ignore="true">
             <button disabled={isGeneratingPdf} onClick={handlePrintReceipt} className="bg-[#1e3a8a] disabled:opacity-50 hover:bg-[#1e40af] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors">
               <Printer className="w-4 h-4"/> {isGeneratingPdf ? 'Generating PDF...' : 'Print / Download PDF'}
             </button>
          </div>
        </div>
      </section>
    </div>
      {/* Hidden Old Receipt Template for html2canvas generation */}
      {downloadingTxn && (
        <div className="absolute top-0 left-[-9999px] w-[800px] z-0 overflow-hidden bg-white">
          <div ref={oldReceiptRef} className="bg-white p-12 w-full">
            <div className="flex justify-between items-start mb-8 border-b-2 border-[#1e3a8a] pb-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-white p-1 rounded-full shadow-sm">
                  <img crossOrigin="anonymous" src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" alt="Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-[#1e3a8a] tracking-wider uppercase">Shikshantar Academy</h1>
                  <p className="text-md font-bold text-[#4b5563]">Bastipur-5, Siraha</p>
                  <p className="text-sm text-[#6b7280]">Estd. 2072 B.S.</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-[#f97316] uppercase mt-2">Historical Receipt</h2>
                <div className="text-sm text-[#4b5563] mt-2 space-y-1">
                  <p>Date: <strong className="font-mono">{downloadingTxn.date}</strong></p>
                  <p>Transaction ID: <strong className="font-mono">{downloadingTxn.id}</strong></p>
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-6 text-base bg-[#f8fafc] p-6 rounded-lg border border-[#e5e7eb]">
              <div className="space-y-2">
                <p className="text-[#6b7280]">Student Name:</p>
                <p className="font-bold text-xl text-[#111827]">{downloadingTxn.studentName}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[#6b7280]">Student ID:</p>
                <p className="font-bold text-xl text-[#111827]">{downloadingTxn.studentId}</p>
              </div>
            </div>

            <table className="w-full text-base mb-16">
              <thead>
                <tr className="bg-[#1e3a8a] text-white">
                  <th className="text-left p-4 font-semibold rounded-tl-lg">Payment Description</th>
                  <th className="text-right p-4 font-semibold rounded-tr-lg">Amount (NRs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] border-b border-[#e5e7eb]">
                <tr>
                  <td className="p-4 text-[#374151] py-8">
                    <span className="font-bold">Fee Collection via {downloadingTxn.method}</span>
                    <br/><span className="text-sm text-gray-500">Allocated to pending dues based on billing assessment (Tuition, Lab, Exam)</span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-lg text-[#15803d]">
                    + {downloadingTxn.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#f0fdf4]">
                  <td className="p-4 font-extrabold text-[#111827] text-right rounded-bl-lg">TOTAL PAID:</td>
                  <td className="p-4 text-right font-mono font-extrabold text-2xl text-[#15803d] rounded-br-lg">{downloadingTxn.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between items-end mt-16 pt-8">
              <div className="text-center">
                <div className="w-40 h-12 border-b-2 border-[#d1d5db] mb-2 flex items-center justify-center">
                  <span className="font-[cursive] text-2xl text-[#1e3a8a] opacity-80 -rotate-3">Shyam L.</span>
                </div>
                <p className="text-sm font-bold text-[#4b5563]">Authorized Signature</p>
                <p className="text-xs text-[#6b7280] uppercase mt-1">Accountant</p>
              </div>
              
              <div className="flex flex-col items-center gap-2 opacity-60">
                 <ShieldCheck className="w-10 h-10 text-[#15803d]" />
                 <span className="text-xs font-bold tracking-widest text-center">SYSTEM GENERATED<br/>VALID DOCUMENT</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
