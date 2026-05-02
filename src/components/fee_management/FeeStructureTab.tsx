import React, { useState, useEffect } from 'react';
import { Save, Users } from 'lucide-react';
import { db, auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, updateDoc, doc, setDoc, writeBatch } from 'firebase/firestore';

export interface FeeStructure {
  class: string;
  monthlyTuition: number;
  examFee: number;
  totalYear: number;
  busFee?: number;
  annualFee?: number;
}

export default function FeeStructureTab() {
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [structures, setStructures] = useState<FeeStructure[]>([]);

  const defaultClasses = ['Play Group', 'Class 1-5', 'Class 6-8', 'Class 9-10'];

  const fetchStructures = async () => {
     setLoading(true);
     try {
         const snap = await getDocs(collection(db, 'feeStructure'));
         if (!snap.empty) {
             const list: FeeStructure[] = [];
             snap.forEach(doc => {
                 list.push({ class: doc.id, ...doc.data() } as FeeStructure);
             });
             // Sort them based on defaultClasses if possible
             list.sort((a,b) => defaultClasses.indexOf(a.class) - defaultClasses.indexOf(b.class));
             setStructures(list);
         } else {
             // Create defaults if not exist
             const defaults = [
                 { class: 'Play Group', monthlyTuition: 600, examFee: 300, totalYear: 7500, busFee: 0, annualFee: 0 },
                 { class: 'Class 1-5', monthlyTuition: 800, examFee: 500, totalYear: 10100, busFee: 0, annualFee: 0 },
                 { class: 'Class 6-8', monthlyTuition: 1200, examFee: 600, totalYear: 15000, busFee: 0, annualFee: 0 },
                 { class: 'Class 9-10', monthlyTuition: 1800, examFee: 800, totalYear: 22400, busFee: 0, annualFee: 0 }
             ];
             const batch = writeBatch(db);
             defaults.forEach(d => {
                 batch.set(doc(db, 'feeStructure', d.class), {
                     tuitionFee: d.monthlyTuition,
                     examFee: d.examFee,
                     busFee: d.busFee,
                     annualFee: d.annualFee
                 });
             });
             await batch.commit();
             setStructures(defaults);
         }
     } catch (err: any) {
         if (err?.message?.includes('Missing or insufficient permissions')) {
             console.log("Not authorized to load fee structures");
         } else {
             console.error("Error fetching fee structures:", err);
             setToastMessage('Error loading structures');
         }
     } finally {
         setLoading(false);
     }
  };

  useEffect(() => {
     const unsubAuth = onAuthStateChanged(auth, (user) => {
         if (user) {
             fetchStructures();
         } else {
             setLoading(false);
         }
     });
     return () => unsubAuth();
  }, []);

  const handleStructureChange = (c: string, field: keyof FeeStructure, value: string) => {
      setStructures(prev => prev.map(s => s.class === c ? { ...s, [field]: Number(value) || 0 } : s));
  };

  const saveStructure = async () => {
      try {
          const batch = writeBatch(db);
          structures.forEach(st => {
              batch.set(doc(db, 'feeStructure', st.class), {
                  class: st.class,
                  tuitionFee: st.monthlyTuition,
                  examFee: st.examFee,
                  busFee: st.busFee || 0,
                  annualFee: st.totalYear || 0
              });
          });
          await batch.commit();
          setToastMessage('Fee structure updated successfully!');
          setTimeout(() => setToastMessage(''), 3000);
      } catch (err: any) {
          console.error("Error saving fee structures:", err);
          setToastMessage('Failed to save structure.');
      }
  };

  const applyBulkFee = async () => {
      if (!confirm(`Are you sure you want to generate fee statements for all students? This will apply tuition fees based on the fee structure to all students.`)) return;
      
      setLoading(true);
      try {
          // 1. Fetch all students
          const usersSnap = await getDocs(collection(db, 'users'));
          const students = usersSnap.docs
             .map(d => ({ id: d.id, ...d.data() }))
             .filter((s: any) => s.role === 'student') as any[];

          // 2. Fetch current structure map
          const structMap = new Map();
          structures.forEach(s => structMap.set(s.class, s));

          // 3. Batch commit fees for a specific month (e.g. current month) -> here we will prompt the user
          const selectedMonth = prompt("Enter the month to generate fee for (e.g. Shrawan, Bhadra, Ashoj...):", "Poush");
          if (!selectedMonth) { setLoading(false); return; }

          let count = 0;
          let batch = writeBatch(db);
          
          for (const s of students) {
              const studentClass = s.class;
              const feeStruct = structMap.get(studentClass);
              const tuitionFee = feeStruct ? feeStruct.monthlyTuition : 1000;

              const feeRef = doc(db, 'studentFees', `${s.id}_${selectedMonth}`);
              batch.set(feeRef, {
                  studentId: s.id,
                  month: selectedMonth,
                  totalFee: tuitionFee,
                  paidAmount: 0,
                  dueAmount: tuitionFee,
                  status: 'due'
              }, { merge: true }); // Merge so we don't accidentally overwrite if they already paid some part

              count++;
              if (count === 400) { // arbitrary safe chunk limit
                  await batch.commit();
                  batch = writeBatch(db);
                  count = 0;
              }
          }
          if (count > 0) {
              await batch.commit();
          }

          setToastMessage(`Generated ${selectedMonth} fee for all students!`);
          setTimeout(() => setToastMessage(''), 4000);
      } catch (err) {
          console.error("Failed bulk fee generation:", err);
          setToastMessage("Failed to generate bulk fees.");
      }
      setLoading(false);
  };

  if (loading) return <div className="p-10 font-bold text-gray-500 text-center animate-pulse">Loading Fee Structure...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-black text-[#1e3a8a] uppercase tracking-tight">Fee Structure Setup</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Base fees per academic year</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
          {toastMessage && <span className="text-sm font-bold text-emerald-600 self-center">{toastMessage}</span>}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap min-w-max hidden md:table">
          <thead className="bg-[#1e3a8a]">
            <tr className="text-[10px] font-black text-white uppercase tracking-widest border-b border-gray-100">
              <th className="p-4 px-6 sticky left-0 bg-[#1e3a8a] z-10 w-24">Class</th>
              <th className="p-4">Tuition/Month</th>
              <th className="p-4">Exam Fee</th>
              <th className="p-4 text-right">Total Annual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {structures.map(row => {
               const totalAnnual = (row.monthlyTuition * 12) + (row.examFee * 3);
               
               return (
                <tr key={row.class} className="hover:bg-blue-50/20 transition-colors">
                  <td className="p-4 px-6 sticky left-0 bg-white font-black text-[#1e3a8a]">{row.class}</td>
                  {[
                      { key: 'monthlyTuition', label: 'tuition' }, 
                      { key: 'examFee', label: 'exam' }
                   ].map(cat => (
                     <td key={cat.key} className="p-2">
                       <div className="relative w-28">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">रू</span>
                         <input 
                           type="number"
                           value={(row as any)[cat.key]}
                           onChange={(e) => handleStructureChange(row.class, cat.key as keyof FeeStructure, e.target.value)}
                           className="w-full bg-gray-50 border border-transparent rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all outline-none"
                         />
                       </div>
                     </td>
                  ))}
                  <td className="p-4 px-6 text-sm font-black text-gray-600 text-right">रू {totalAnnual.toLocaleString()}</td>
                </tr>
               );
            })}
          </tbody>
        </table>
        
        {/* Mobile View for Table */}
        <div className="md:hidden p-4 space-y-4">
           {structures.map(row => {
              const totalAnnual = (row.monthlyTuition * 12) + (row.examFee * 3);
              
              return (
                 <div key={row.class} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                       <span className="font-black text-[#1e3a8a] text-lg">{row.class}</span>
                       <div className="text-right">
                          <span className="block text-[9px] font-black uppercase text-gray-400">Total Annual</span>
                          <span className="font-black text-gray-800">रू {totalAnnual.toLocaleString()}</span>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       {[
                           { key: 'monthlyTuition', label: 'Tuition' }, 
                           { key: 'examFee', label: 'Exam' }
                       ].map(cat => (
                         <div key={cat.key}>
                           <label className="text-[9px] font-black uppercase text-gray-500 block mb-1">{cat.label}</label>
                           <div className="relative w-full">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">रू</span>
                             <input 
                               type="number"
                               value={(row as any)[cat.key]}
                               onChange={(e) => handleStructureChange(row.class, cat.key as keyof FeeStructure, e.target.value)}
                               className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-3 text-sm font-bold text-gray-800 focus:border-[#1e3a8a] outline-none"
                             />
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
              );
           })}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-end gap-3 mt-4">
         <button 
           onClick={saveStructure} 
           className="w-full md:w-auto bg-[#059669] text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#047857] shadow-md"
         >
           <Save className="w-5 h-5" /> Save Fee Structure
         </button>
         <button 
           onClick={applyBulkFee}
           className="w-full md:w-auto bg-[#1e3a8a] text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#1e40af] shadow-md"
         >
           <Users className="w-5 h-5" /> Calculate Future Bills
         </button>
      </div>
    </div>
  );
}
