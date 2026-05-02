import React, { useState, useEffect } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';
import { Search, Download, ChevronDown, ChevronRight, Bell, FileText, IndianRupee } from 'lucide-react';

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

  const getStudentDue = (s: any) => {
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
           getStudentDue(s),
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
             className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all outline-none"
           />
         </div>
         
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <select 
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0 min-h-[48px]"
            >
              <option value="All">All</option>
              <option value="Play Group">Play Group</option>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0 min-h-[48px]"
            >
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Due">Due</option>
              <option value="Defaulter">Defaulter</option>
            </select>
            
            <button onClick={exportCSV} className="bg-[#1e3a8a]/10 border border-[#1e3a8a] text-[#1e3a8a] rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-widest hover:bg-[#1e3a8a]/20 transition-colors shrink-0 flex gap-2 items-center min-h-[48px]">
               <Download className="w-4 h-4"/> Export
            </button>
         </div>
       </div>

       {/* Main Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
         <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#1e3a8a]">
               <tr className="text-[10px] font-black text-white uppercase tracking-widest border-b border-gray-100">
                  <th className="p-4 px-6">Student ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Class</th>
                  <th className="p-4 text-right">Monthly Fee</th>
                  <th className="p-4 text-right">Due Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {filteredStudents.map(s => (
                  <React.Fragment key={s.id}>
                    <tr className="hover:bg-blue-50/20 transition-colors group">
                       <td className="p-4 px-6">
                          <p className="text-[10px] font-mono text-gray-500 font-bold uppercase">{s.id}</p>
                       </td>
                       <td className="p-4 cursor-pointer" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 text-sm">{s.name}</span>
                            {expandedStudent === s.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </div>
                       </td>
                       <td className="p-4">
                          <span className="text-sm font-bold text-gray-600">{s.class}</span>
                       </td>
                       <td className="p-4 text-right text-sm text-gray-600">रू {s.monthlyFee || 0}</td>
                       <td className="p-4 text-right font-black text-red-500 text-sm">{getStudentDue(s) > 0 ? `रू ${getStudentDue(s).toLocaleString()}` : '-'}</td>
                       <td className="p-4 text-center">
                          {getStatusBadge(s)}
                       </td>
                       <td className="p-4 text-center">
                          <div className="flex items-center gap-1 justify-center">
                             <button onClick={() => onRecordPayment?.(s.id)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200" title="Collect">
                               <IndianRupee className="w-4 h-4" />
                             </button>
                             <button onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Ledger">
                               <FileText className="w-4 h-4" />
                             </button>
                             <button onClick={() => {
                                 const unpaidMonths = s.fees?.filter((f: any) => f.status === 'due').map((f: any) => f.month) || [];
                                 window.open(`https://wa.me/977${s.guardianPhone}?text=${encodeURIComponent(`Namaste ${s.guardianName} ji, Shikshantar Academy Siraha bata suchit garinchhau ki ${s.name} (Class ${s.class}) ko ${unpaidMonths.join(' ra ')} mahina ko fee baki chha. Kripaya school aaera tirna anurodh chha. Dhanyabad.`)}`, '_blank');
                             }} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200" title="Remind">
                               <Bell className="w-4 h-4" />
                             </button>
                          </div>
                       </td>
                    </tr>
                    {expandedStudent === s.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={8} className="p-4 px-6 border-b border-gray-100">
                          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                             {MONTHS.map(m => {
                               const status = getMonthStatus(s, m);
                               let bg = 'bg-gray-100 text-gray-400';
                               if (status === 'green') bg = 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200';
                               if (status === 'red') bg = 'bg-red-100 text-red-700 font-bold border border-red-200';
                               
                               return (
                                 <div key={m} className={`flex flex-col items-center justify-center p-2 rounded-xl text-center ${bg} transition-colors`}>
                                   <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">{m}</span>
                                   {status === 'green' && <span className="text-xs">✓</span>}
                                   {status === 'red' && <span className="text-[10px]">रू {s.monthlyFee}</span>}
                                   {status === 'grey' && <span className="text-xs">—</span>}
                                 </div>
                               );
                             })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
               ))}
               {filteredStudents.length === 0 && (
                  <tr>
                     <td colSpan={8} className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No students found</td>
                  </tr>
               )}
            </tbody>
         </table>
       </div>

       {/* Mobile View */}
       <div className="md:hidden space-y-4">
          {filteredStudents.map(s => (
             <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                  <div className="flex justify-between items-start mb-2">
                     <div>
                        <p className="font-black text-lg text-gray-800 leading-tight">{s.name}</p>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Class {s.class} • {s.id}</p>
                     </div>
                     {getStatusBadge(s)}
                  </div>
                  {getStudentDue(s) > 0 && <p className="text-sm font-black text-red-600">Due: रू {getStudentDue(s).toLocaleString()}</p>}
                </div>
                
                {expandedStudent === s.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-y border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400 pt-3 pb-2 tracking-widest">12-Month Ledger</p>
                    <div className="grid grid-cols-4 gap-2 mb-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                       {MONTHS.map(m => {
                         const status = getMonthStatus(s, m);
                         let bg = 'bg-gray-100 text-gray-400';
                         if (status === 'green') bg = 'bg-emerald-100 text-emerald-700';
                         if (status === 'red') bg = 'bg-red-100 text-red-700 font-bold';
                         
                         return (
                           <div key={m} className={`flex flex-col items-center justify-center p-2 rounded-lg text-center ${bg}`}>
                             <span className="text-[9px] font-bold uppercase tracking-wider">{m}</span>
                             {status === 'green' && <span className="text-[10px] mt-0.5">✓</span>}
                             {status === 'red' && <span className="text-[8px] mt-0.5">रू {s.monthlyFee}</span>}
                             {status === 'grey' && <span className="text-[10px] mt-0.5">—</span>}
                           </div>
                         );
                       })}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 border-t border-gray-100 divide-x divide-gray-100">
                   <button onClick={() => onRecordPayment?.(s.id)} className="flex py-3 items-center justify-center gap-2 hover:bg-emerald-50 text-emerald-600 transition-colors">
                      <IndianRupee className="w-5 h-5" />
                   </button>
                   <button onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)} className="flex py-3 items-center justify-center gap-2 hover:bg-blue-50 text-blue-600 transition-colors">
                      <FileText className="w-5 h-5" />
                   </button>
                   <button onClick={() => {
                       const unpaidMonths = s.fees?.filter((f: any) => f.status === 'due').map((f: any) => f.month) || [];
                       window.open(`https://wa.me/977${s.guardianPhone}?text=${encodeURIComponent(`Namaste ${s.guardianName} ji, Shikshantar Academy Siraha bata suchit garinchhau ki ${s.name} (Class ${s.class}) ko ${unpaidMonths.join(' ra ')} mahina ko fee baki chha. Kripaya school aaera tirna anurodh chha. Dhanyabad.`)}`, '_blank');
                   }} className="flex py-3 items-center justify-center gap-2 hover:bg-orange-50 text-orange-600 transition-colors">
                      <Bell className="w-5 h-5" />
                   </button>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}
