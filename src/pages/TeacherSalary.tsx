import React, { useState, useEffect, useRef } from 'react';
import { Wallet, FileDown } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function TeacherSalary() {
  const [records, setRecords] = useState<any[]>([]);
  const [structure, setStructure] = useState<any | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  useEffect(() => {
    let unsubs: any[] = [];
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
       if (user) {
         getDoc(doc(db, 'users', user.uid)).then(d => {
             if(d.exists()) setTeacherProfile(d.data());
         });
         
         const unsubStruct = onSnapshot(doc(db, 'salary_structures', user.uid), (snap) => {
            if(snap.exists()) setStructure(snap.data());
         }, (err) => console.log('Could not load salary structure', err));
         
         const qR = query(collection(db, 'salary_records'), where('teacherId', '==', user.uid));
         const unsubRecords = onSnapshot(qR, (snap) => {
            setRecords(snap.docs.map(d => ({id: d.id, ...d.data()})));
         }, (err) => console.log('Could not load salary records', err));
         
         unsubs = [unsubStruct, unsubRecords];
       }
    });
    return () => { unsubAuth(); unsubs.forEach(u => u()); };
  }, []);

  const downloadSlip = async () => {
     if(!slipRef.current) return;
     try {
         const el = slipRef.current;
         const w = el.offsetWidth;
         const h = el.scrollHeight;
         const canvas = await toPng(el, { pixelRatio: 2 });
         const dataUrl = canvas;
         const pdfWidth = 210;
         const pdfHeight = (h * pdfWidth) / w;
         const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
         pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
         pdf.save(`Salary_Slip_${selectedSlip.month}_${selectedSlip.year}.pdf`);
     } catch (e) {
         console.error(e);
     }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight uppercase">My Salary Dashboard</h1>
      </div>

      {structure && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Current Salary Structure</h2>
              <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-600">
                  <div className="bg-gray-50 p-4 rounded-xl flex-1 min-w-[150px]">
                      <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Basic Pay</span>
                      NRs. {(structure.basicPay||0).toLocaleString()}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl flex-1 min-w-[150px]">
                      <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Total Allowances</span>
                      NRs. {((structure.dearness||0)+(structure.transport||0)+(structure.houseRent||0)+(structure.other||0)).toLocaleString()}
                  </div>
                  <div className="bg-[#1e293b] text-white p-4 rounded-xl flex-1 min-w-[150px]">
                      <span className="text-gray-400 block text-[10px] uppercase tracking-widest mb-1">Gross Salary</span>
                      NRs. {((structure.basicPay||0)+(structure.dearness||0)+(structure.transport||0)+(structure.houseRent||0)+(structure.other||0)).toLocaleString()}
                  </div>
              </div>
          </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Salary History & Slips</h2>
         {records.length === 0 ? (
           <p className="text-gray-500 text-sm mt-4">No salary records found for your account.</p>
         ) : (
           <div className="space-y-4">
             {records.map(rec => (
                <div key={rec.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-center hover:bg-gray-50 transition-colors">
                   <div>
                      <p className="font-bold text-gray-800 flex items-center gap-2">
                          {rec.month} {rec.year}
                          {rec.status === 'Unpaid' && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest">Unpaid</span>}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">Net Pay: NRs. {rec.netPay?.toLocaleString()}</p>
                   </div>
                   <button onClick={() => setSelectedSlip(rec)} className="text-blue-600 font-bold text-sm items-center gap-1 flex bg-blue-50 px-4 py-2 rounded-xl transition-opacity hover:bg-blue-100 uppercase tracking-widest">
                      <FileDown className="w-4 h-4"/> View Slip
                   </button>
                </div>
             ))}
           </div>
         )}
      </div>

      {selectedSlip && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
              <div className="flex-1 overflow-auto bg-gray-100 p-4 sm:p-8 custom-scrollbar">
                 <div ref={slipRef} className="bg-white mx-auto shadow-md relative overflow-hidden" style={{ width: '600px', padding: '40px' }}>
                    <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                        <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2" />
                        <h2 className="font-black text-2xl text-gray-900 uppercase tracking-widest">Shikshantar Academy</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Siraha, Nepal</p>
                        <div className={`mt-4 inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedSlip.status === 'Unpaid' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
                            Official Salary Slip {selectedSlip.status === 'Unpaid' && '(UNPAID)'}
                        </div>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-6 pb-6 border-b border-gray-200">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Employee</p>
                            <p className="font-black text-gray-800 text-lg">{teacherProfile?.fullName || teacherProfile?.name || 'Unknown'}</p>
                            <p className="text-gray-500 font-bold mt-1">ID: {teacherProfile?.studentId || 'Teacher'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase">Salary Period</p>
                            <p className="font-black text-gray-800 text-lg">{selectedSlip.month} {selectedSlip.year}</p>
                            <p className="text-gray-500 font-bold mt-1">Paid on: {selectedSlip.date}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-3 pb-2 border-b border-gray-200">Earnings</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Basic Pay</span><span className="font-black text-gray-900">{selectedSlip.structureSnapshot?.basicPay?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Dearness Allow.</span><span className="font-black text-gray-900">{selectedSlip.structureSnapshot?.dearness?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Transport Allow.</span><span className="font-black text-gray-900">{selectedSlip.structureSnapshot?.transport?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">House Rent Allow.</span><span className="font-black text-gray-900">{selectedSlip.structureSnapshot?.houseRent?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Other Allow.</span><span className="font-black text-gray-900">{selectedSlip.structureSnapshot?.other?.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-3 pb-2 border-b border-gray-200">Deductions</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Tax</span><span className="font-black text-gray-900">{selectedSlip.tax?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Absent Deductions</span><span className="font-black text-gray-900">{selectedSlip.absentDeduction?.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600 font-bold">Loan Recovery</span><span className="font-black text-gray-900">{selectedSlip.loanRecovery?.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t-2 border-gray-800 pt-6 mt-6 pb-6 border-b-2">
                        <div className="flex justify-between items-center text-primary">
                            <span className="text-sm font-black uppercase tracking-widest">Net Payable Salary</span>
                            <span className="text-3xl font-black">NRs. {selectedSlip.netPay?.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mt-16 pt-8 flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <div className="text-center w-40 border-t-2 border-gray-300 pt-2">Employer Signature</div>
                        <div className="text-center w-40 border-t-2 border-gray-300 pt-2">Employee Signature</div>
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                 <div className="flex gap-3">
                    <button onClick={() => setSelectedSlip(null)} className="flex-1 py-3 border-primary text-primary border border-gray-200 rounded-xl font-black text-gray-600 uppercase tracking-widest text-[10px] sm:text-xs transition-colors hover:bg-gray-100">Close</button>
                    <button onClick={downloadSlip} className="flex-1 py-3 bg-primary text-white border rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors"><FileDown className="w-4 h-4"/> Download PDF Slip</button>
                 </div>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
