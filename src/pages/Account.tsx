import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, FileText, Printer, ShieldCheck } from 'lucide-react';

export default function Account() {
  const [showNotification, setNotification] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  
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

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
      {showNotification && (
        <div className="col-span-1 md:col-span-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-3 rounded-lg text-sm flex items-center gap-2 print:hidden z-10">
          <CheckCircle2 className="h-4 w-4" />
          Payment processed. Receipt recorded and Sent to Admin!
        </div>
      )}

      {/* Account Summary */}
      <section className="col-span-1 bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] print:hidden">
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
              <button type="button" onClick={() => setPaymentMethod('eSewa')} className={`text-[0.6rem] px-3 py-1.5 font-bold rounded border transition-colors ${paymentMethod === 'eSewa' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>eSewa</button>
              <button type="button" onClick={() => setPaymentMethod('Khalti')} className={`text-[0.6rem] px-3 py-1.5 font-bold rounded border transition-colors ${paymentMethod === 'Khalti' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>Khalti</button>
              <button type="button" onClick={() => setPaymentMethod('Bank Transfer')} className={`text-[0.6rem] px-3 py-1.5 font-bold rounded border transition-colors ${paymentMethod === 'Bank Transfer' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb]'}`}>Bank Transfer</button>
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

      {/* Official Bill Slip Container (Visible mostly for printing) */}
      <section className="col-span-1 md:col-span-2 bg-transparent relative">
        <div className="bg-[#ffffff] rounded-xl p-6 md:p-10 shadow-lg border border-[#e5e7eb] relative print:absolute print:left-0 print:top-0 print:w-full print:border-none print:shadow-none bg-white">
          
          <div className="flex justify-between items-start mb-6 border-b-2 border-[#1e3a8a] pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white p-1 rounded-full shadow-sm">
                <img src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" alt="Logo" className="w-full h-full object-contain rounded-full" />
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
                <tr>
                  <td className="p-3 text-[#374151]">Annual Tuition Fee Assessment</td>
                  <td className="p-3 text-right font-mono">{(studentRecord.due + studentRecord.paid).toLocaleString()}.00</td>
                </tr>
                <tr>
                  <td className="p-3 text-[#15803d] font-bold">Payments Cleared</td>
                  <td className="p-3 text-right font-mono text-[#15803d]">- {studentRecord.paid.toLocaleString()}.00</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#f8fafc]">
                  <td className="p-3 font-bold text-[#111827] text-right">TOTAL PENDING BALANCE:</td>
                  <td className="p-3 text-right font-mono font-bold text-lg text-[#b91c1c]">{studentRecord.due.toLocaleString()}.00</td>
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
          <div className="absolute top-4 right-4 print:hidden flex gap-2">
             <button onClick={handlePrintReceipt} className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors">
               <Printer className="w-4 h-4"/> Print / Download PDF
             </button>
          </div>
        </div>
      </section>
    </div>
  );
}
