import React, { useState, useEffect } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';
import { Search, Download, ChevronDown, ChevronRight, Bell, FileText, Banknote, Users, Edit2, X, Save, Check } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const MONTHS = ['Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra', 'Baisakh', 'Jestha', 'Ashad'];

export default function StudentLedgerTab({ studentsData, onRecordPayment, onViewLedger }: { 
    studentsData: any[], 
    onRecordPayment?: (studentId: string) => void, 
    onViewLedger?: (studentId: string) => void 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [selectedPill, setSelectedPill] = useState<{ student: any, month: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: 'class' | 'name' | 'id', direction: 'asc'|'desc'} | null>(null);
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [savingFee, setSavingFee] = useState(false);
  const [feeStructure, setFeeStructure] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'fee_structure'), (docSnap) => {
      if (docSnap.exists()) {
        setFeeStructure(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  const handleSaveFee = async () => {
    if (!editingFee) return;
    setSavingFee(true);
    try {
        await updateDoc(doc(db, 'users', editingFee.id), {
           monthlyFee: Number(editingFee.monthlyFee),
           otherFee: Number(editingFee.otherFee || 0)
        });
        setEditingFee(null);
    } catch(err) {
        console.error(err);
    }
    setSavingFee(false);
  };

  const getStudentTotalDueYear = (s: any) => {
      let annual = 0;
      let monthlyTuition = Number(s.monthlyFee || 0);

      if (feeStructure?.academic) {
         const rawClass = s.class || s.studentClass || '';
         const formattedClass = ['PG', 'Nursery', 'LKG', 'UKG'].includes(rawClass) ? rawClass : `Class ${rawClass}`;
         const matchingStruct = feeStructure.academic.find((a: any) => a.className === formattedClass || a.className === rawClass);
         if (matchingStruct) {
            annual = Number(matchingStruct.annual?.replace(/[^0-9.]/g, '') || 0);
            if(monthlyTuition === 0) {
               monthlyTuition = Number(matchingStruct.tuition?.replace(/[^0-9.]/g, '') || 0);
            }
         }
      }

      let scholarship = 0;
      if (s.scholarshipStatus === 'Provided') {
          scholarship = Number(s.scholarshipAmount || 0);
      }
      
      const totalYear = (monthlyTuition * 12) + annual - scholarship;
      return Math.max(0, totalYear);
  };

  const getStudentDueTokens = (s: any) => {
      let totalDue = 0;
      s.fees?.forEach((f: any) => {
          if (f.status === 'due') {
              totalDue += Number(f.dueAmount || 0);
          }
      });
      return totalDue;
  };

  const getStudentStatus = (s: any) => {
      const dueCount = s.fees?.filter((f: any) => f.status === 'due').length || 0;
      if (dueCount === 0) return 'PAID';
      
      // Simple default logic: if they have any due older than Poush (index 5)
      const oldDues = s.fees?.filter((f: any) => {
          if (f.status === 'due') {
             const mIdx = MONTHS.indexOf(f.month);
             return mIdx !== -1 && mIdx <= 5;
          }
          return false;
      });

      if (oldDues && oldDues.length > 0) return 'DEFAULTER';
      return 'DUE';
  };

  const getMonthStatus = (s: any, month: string) => {
      const feeMonth = s.fees?.find((f: any) => f.month === month);
      if (!feeMonth) return 'grey';
      if (feeMonth.status === 'paid') return 'green';
      if (feeMonth.status === 'due') return 'red';
      return 'grey';
  };

  const toggleMonthDue = async (student: any, month: string) => {
      const status = getMonthStatus(student, month);
      
      if (status === 'green') {
          alert('This month is already paid. Go to Transaction History to revert or modify.');
          return;
      }
      
      const feeRef = doc(db, 'studentFees', `${student.id}_${month}`);
      
      if (status === 'red') {
         if (window.confirm(`Remove fee due for ${month}?`)) {
             await deleteDoc(feeRef);
         }
      } else {
         let tuition = Number(student.monthlyFee || 0);
         let other = Number(student.otherFee || 0);
         let scholarship = Number(student.scholarshipAmount || 0);
         
         if (student.scholarshipStatus !== 'Provided') {
             scholarship = 0;
         }
         
         let total = Math.max(0, tuition + other - scholarship);
         
         if (window.confirm(`Generate fee due of रू ${total} for ${month}?`)) {
             await setDoc(feeRef, {
                 studentId: student.id,
                 month: month,
                 totalFee: total,
                 paidAmount: 0,
                 dueAmount: total,
                 status: 'due',
                 createdAt: new Date().toISOString()
             });
         }
      }
  };

  const filteredStudents = studentsData.filter(s => {
    const matchSearch = String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        String(s.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = filterClass === 'All' || s.class === filterClass;
    
    let matchStatus = true;
    const status = getStudentStatus(s);
    
    if (filterStatus !== 'All') {
        if (filterStatus === 'Defaulter') matchStatus = status === 'DEFAULTER';
        else if (filterStatus === 'Paid') matchStatus = status === 'PAID';
        else if (filterStatus === 'Due') matchStatus = status === 'DUE';
    }
    
    return matchSearch && matchClass && matchStatus;
  });

  const exportCSV = () => {
     const headers = ['Student ID', 'Name', 'Class', 'Monthly Fee', 'Total Due', 'Status'];
     const csvRows = [headers.join(',')];
     
     filteredStudents.forEach(s => {
        csvRows.push([
           s.id,
           `"${s.name || ''}"`,
           s.class,
           s.monthlyFee || 0,
           getStudentTotalDueYear(s),
           getStudentStatus(s)
        ].join(','));
     });
     
     const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.setAttribute('hidden', '');
     a.setAttribute('href', url);
     a.setAttribute('download', `StudentLedger_${formatBSDate(new Date())}.csv`);
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  };

  const getStatusBadge = (s: any) => {
    const status = getStudentStatus(s);
    
    if (status === 'DEFAULTER') return <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase">DEFAULTER</span>;
    if (status === 'DUE') return <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase">DUE</span>;
    return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">PAID</span>;
  };


  const currentMonthIndex = 10; // Jestha
  const activeMonths = MONTHS.slice(0, currentMonthIndex + 2); // Up to Ashad


  const sortedStudents = [...filteredStudents].sort((a, b) => {
     if (!sortConfig) return 0;
     const dir = sortConfig.direction === 'asc' ? 1 : -1;
     
     if (sortConfig.key === 'class') {
       const aNum = parseInt(a.class) || 0;
       const bNum = parseInt(b.class) || 0;
       if (aNum !== bNum) return (aNum - bNum) * dir;
       return String(a.class).localeCompare(String(b.class)) * dir;
     }

     return String(a[sortConfig.key] || '').localeCompare(String(b[sortConfig.key] || '')) * dir;
  });

  return (
    <div className="space-y-6">
       {/* Filters */}
       <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
           <input 
             type="text" 
             placeholder="Search by name or student ID"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 border-primary text-primary border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
           />
         </div>
         
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <select 
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0 min-h-[48px]"
            >
              <option value="All">Class: All</option>
              {['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0 min-h-[48px]"
            >
              <option value="All">Payment Status: All</option>
              <option value="Paid">Status: Paid</option>
              <option value="Due">Status: Due</option>
              <option value="Defaulter">Status: Defaulter</option>
            </select>
            
            <button onClick={exportCSV} className="border-primary text-primary border border-primary text-primary border-primary text-primary rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-widest hover:text-primary transition-colors shrink-0 flex gap-2 items-center min-h-[48px]">
               <Download className="w-4 h-4"/> Export
            </button>
         </div>
       </div>

       {/* Main Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
         <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="text-primary">
               <tr className="text-[10px] font-black text-white uppercase tracking-widest border-b border-gray-100">
                  <th className="p-4 px-6 cursor-pointer hover:bg-[#2546a3] transition-colors" onClick={() => setSortConfig({key: 'id', direction: sortConfig?.key === 'id' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>ID {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-4">Roll</th>
                  <th className="p-4 cursor-pointer hover:bg-[#2546a3] transition-colors" onClick={() => setSortConfig({key: 'name', direction: sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Name {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-4 cursor-pointer hover:bg-[#2546a3] transition-colors" onClick={() => setSortConfig({key: 'class', direction: sortConfig?.key === 'class' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Class {sortConfig?.key === 'class' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-4 text-right">Monthly Fee</th>
                  <th className="p-4 text-right">Expected (Year)</th>
                  <th className="p-4 text-right">Current Dues</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {sortedStudents.map((s, idx) => {
                  const cleanId = s.studentId || ('S' + (101 + idx));
                  const cleanRoll = s.rollNumber || String(idx + 1).padStart(2, '0');
                  
                  return (
                  <React.Fragment key={s.id}>
                    <tr className="hover:bg-blue-50/20 transition-colors group">
                       <td className="p-4 px-6">
                          <p className="text-sm font-bold text-gray-700">{cleanId}</p>
                       </td>
                       <td className="p-4">
                          <span className="text-sm font-bold text-gray-500">{cleanRoll}</span>
                       </td>
                       <td className="p-4 cursor-pointer" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 hover:text-primary transition-colors">
                               <span className="font-bold text-gray-800 text-sm group-hover:opacity-90">{s.name}</span>
                               {expandedStudent === s.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:opacity-90" />}
                             </div>
                             {s.scholarshipStatus === 'Provided' && (
                                <span className="inline-block bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-200 self-start">Scholarship Student</span>
                             )}
                          </div>
                       </td>
                       <td className="p-4">
                          <span className="text-sm font-bold text-gray-600">Class {s.class}</span>
                       </td>
                       <td className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            {Number(s.scholarshipAmount) > 0 && <span className="text-[10px] text-emerald-600 font-bold tracking-widest line-through">NRs. {Number(s.monthlyFee) + Number(s.scholarshipAmount)}</span>}
                            <span className="text-sm text-gray-800 font-black">NRs. {s.monthlyFee || 0}</span>
                          </div>
                       </td>
                       <td className="p-4 text-right font-black text-primary text-sm">NRs. {getStudentTotalDueYear(s).toLocaleString()}</td>
                      <td className="p-4 text-right font-black text-red-500 text-sm">{getStudentDueTokens(s) > 0 ? `NRs. ${getStudentDueTokens(s).toLocaleString()}` : '-'}</td>
                       <td className="p-4 text-center">
                          {getStatusBadge(s)}
                       </td>
                       <td className="p-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                             <button onClick={(e) => { e.stopPropagation(); onRecordPayment?.(s.id); }} className="px-3 py-1.5 bg-primary text-white hover:bg-blue-800 rounded-lg transition-colors border border-transparent font-bold text-xs flex justify-center items-center gap-1.5 shadow-sm min-w-[85px]" title="Collect Payment">
                               <Banknote className="w-3.5 h-3.5 hidden md:block" /> <span className="hidden md:block">Collect</span><span className="md:hidden">💰</span>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); setExpandedStudent(expandedStudent === s.id ? null : s.id); }} className="px-3 py-1.5 bg-white text-gray-700 hover:text-primary border border-gray-200 rounded-lg transition-colors font-bold text-xs flex justify-center items-center gap-1.5 shadow-sm min-w-[85px]" title="View Ledger">
                               <FileText className="w-3.5 h-3.5 hidden md:block" /> <span className="hidden md:block">Ledger</span><span className="md:hidden">📋</span>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); 
                                 const unpaidMonths = s.fees?.filter((f: any) => f.status === 'due').map((f: any) => f.month) || [];
                                 window.open(`https://wa.me/977${s.guardianPhone}?text=${encodeURIComponent(`Namaste ${s.guardianName} ji, Shikshantar Academy Siraha bata suchit garinchhau ki ${s.name} (Class ${s.class}) ko ${unpaidMonths.join(' ra ')} mahina ko fee NRs. ${getStudentDueTokens(s)} baki chha. Kripaya school aaera tirna anurodh chha. Dhanyabad.`)}`, '_blank');
                             }} className="px-3 py-1.5 bg-white text-gray-700 hover:text-primary border border-gray-200 rounded-lg transition-colors font-bold text-xs flex justify-center items-center gap-1.5 shadow-sm min-w-[85px]" title="Send Reminder">
                               <Bell className="w-3.5 h-3.5 hidden md:block" /> <span className="hidden md:block">Remind</span><span className="md:hidden">🔔</span>
                             </button>
                          </div>
                       </td>
                    </tr>
                    {expandedStudent === s.id && (
                      <tr className="text-primary">
                        <td colSpan={9} className="p-4 px-6 border-b border-gray-100">
                          <div className="mb-3 flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-600">Monthly Dues Overview</span>
                            <span className="text-[10px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">Click a month to view details or add due</span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-3xl">
                             {MONTHS.map(m => {
                               const status = getMonthStatus(s, m);
                               let bg = 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer';
                               if (status === 'green') bg = 'bg-emerald-100 text-emerald-700 cursor-pointer border border-emerald-200 shadow-sm hover:bg-emerald-200';
                               if (status === 'red') bg = 'bg-red-50 text-red-600 font-bold border border-red-200 cursor-pointer hover:bg-red-100 shadow-sm';
                               
                               return (
                                 <div key={m} onClick={() => {
                                    if (status === 'green' || status === 'red') {
                                       setSelectedPill({ student: s, month: m });
                                    } else {
                                       toggleMonthDue(s, m);
                                    }
                                 }} className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center ${bg} transition-colors group relative`} title={status === 'grey' ? 'Mark as Due' : status === 'red' ? 'Unpaid' : 'Paid'}>
                                   <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">{m}</span>
                                   {status === 'green' && <span className="text-xs font-black">✓</span>}
                                   {status === 'red' && <span className="text-[10px]">NRs. {s.monthlyFee}</span>}
                                   {status === 'grey' && <span className="text-xs group-hover:hidden">—</span>}
                                   {status === 'grey' && <span className="text-[10px] hidden group-hover:block text-gray-500 font-medium">+ Due</span>}
                                 </div>
                               );
                             })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
               })}
               {filteredStudents.length === 0 && studentsData.length > 0 && (
                  <tr>
                     <td colSpan={9} className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No students match your filters</td>
                  </tr>
               )}
               {studentsData.length === 0 && (
                  <tr>
                     <td colSpan={9} className="p-10 text-center">
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 max-w-sm mx-auto flex flex-col items-center">
                           <Users className="w-10 h-10 text-orange-400 mb-3" />
                           <h3 className="font-black text-gray-800 text-lg mb-1">No Students Found</h3>
                           <p className="text-sm text-gray-600 mb-4 font-medium">There are no students registered in the system yet.</p>
                           <a href="/admin/users" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-800 transition-colors">
                              Go to User Management
                           </a>
                        </div>
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
       </div>

       {/* Selected Pill Modal */}
       {selectedPill && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPill(null)}>
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                    {(() => {
                        const feeMonth = selectedPill.student.fees?.find((f: any) => f.month === selectedPill.month);
                        const isPaid = feeMonth?.status === 'paid';
                        
                        return (
                            <div className="p-6">
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                  {isPaid ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                               </div>
                               <h3 className="text-xl font-black text-gray-900 mb-1">{selectedPill.month} 2083</h3>
                               
                               {isPaid ? (
                                   <>
                                     <p className="text-gray-600 text-sm mb-4">Paid NRs. {feeMonth.paidAmount || feeMonth.totalFee} on {formatBSDate(feeMonth.paidAt ? new Date(feeMonth.paidAt) : new Date())}</p>
                                     <div className="border-primary text-primary rounded-xl p-3 border border-gray-100 text-sm mb-5">
                                        <div className="flex justify-between mb-1">
                                           <span className="text-gray-500 font-medium">Method</span>
                                           <span className="text-gray-800 font-bold">{feeMonth.paymentMethod || 'Cash'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                           <span className="text-gray-500 font-medium">Receipt</span>
                                           <span className="text-gray-800 font-bold">{feeMonth.receiptNo || 'RCP-2083-010'}</span>
                                        </div>
                                     </div>
                                     <button className="w-full bg-white border border-gray-200 text-gray-800 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:text-primary transition-colors">
                                        🖨️ Print Receipt
                                     </button>
                                   </>
                               ) : (
                                   <>
                                     <p className="text-gray-600 text-sm mb-5">NRs. {feeMonth?.totalFee || selectedPill.student.monthlyFee} unpaid</p>
                                     <div className="flex gap-3">
                                         <button onClick={() => {
                                             setSelectedPill(null);
                                             onRecordPayment?.(selectedPill.student.id);
                                         }} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors">
                                            💰 Collect Now
                                         </button>
                                         <button onClick={() => {
                                             if(window.confirm('Remove this due from ledger?')) toggleMonthDue(selectedPill.student, selectedPill.month);
                                             setSelectedPill(null);
                                         }} className="px-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:text-primary transition-colors">
                                            Remove
                                         </button>
                                     </div>
                                   </>
                               )}
                            </div>
                        );
                    })()}
               </div>
           </div>
       )}

    </div>
  );
}
