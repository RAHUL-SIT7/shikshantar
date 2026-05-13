import React, { useState, useEffect } from 'react';
import { formatBSDate, getBSYearMonthDate } from '../../lib/nepaliDate';
import { Search, Download, ChevronDown, ChevronRight, Bell, FileText, Banknote, Users, Edit2, X, Save, Check } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, setDoc, deleteDoc, onSnapshot, deleteField, writeBatch, query, collection, where, getDocs } from 'firebase/firestore';
import { exportToExcel } from '../../lib/excelExport';
import { exportToPDF } from '../../lib/pdfExport';

const MONTHS = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

export default function StudentLedgerTab({ studentsData, initialFilterStatus = 'All', onFilterStatusChange, onRecordPayment, onViewLedger, onRefresh }: { 
    studentsData: any[], 
    initialFilterStatus?: string,
    onFilterStatusChange?: (status: string) => void,
    onRecordPayment?: (studentId: string) => void, 
    onViewLedger?: (studentId: string) => void,
    onRefresh?: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);

  useEffect(() => {
    setFilterStatus(initialFilterStatus);
  }, [initialFilterStatus]);

  const handleStatusChange = (val: string) => {
    setFilterStatus(val);
    if (onFilterStatusChange) onFilterStatusChange(val);
  };
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [selectedPill, setSelectedPill] = useState<{ student: any, month: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: 'class' | 'name' | 'id', direction: 'asc'|'desc'} | null>(null);
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [savingFee, setSavingFee] = useState(false);
  const [feeStructure, setFeeStructure] = useState<any>(null);
  
  const [bulkMonth, setBulkMonth] = useState('');
  const [generatingBulk, setGeneratingBulk] = useState(false);

  const handleBulkGenerateDue = async () => {
      if (!bulkMonth) {
          alert('Please select a month for bulk generation.');
          return;
      }
      if (!window.confirm(`Are you sure you want to generate dues for ${bulkMonth} (and any missing prior months) for all ${filteredStudents.length} currently filtered students?`)) return;
      
      setGeneratingBulk(true);
      try {
          const batchPromises = filteredStudents.map(async (student) => {
              const targetIdx = MONTHS.indexOf(bulkMonth);
              
              for (let i = 0; i <= targetIdx; i++) {
                  const currentM = MONTHS[i];
                  const status = getMonthStatus(student, currentM);
                  if (status !== 'grey') continue; // Only process if not already due or paid

                  const feeRef = doc(db, 'studentFees', `${student.id}_${currentM}`);
                  let tuition = Number(student.originalTuition !== undefined ? student.originalTuition : 0);
                  let exam = Number(student.examFee || 0);
                  let computer = Number(student.computerFee || 0);
                  let transport = Number(student.transportFee || 0);
                  let other = Number(student.otherFee || 0);
                  let scholarship = Number(student.scholarshipAmount || 0);
                  
                  if (student.scholarshipStatus !== 'Provided') {
                      scholarship = 0;
                  }
                  
                  let total = Math.max(0, tuition + exam + computer + transport + other - scholarship);
                  
                  await setDoc(feeRef, {
                      studentId: student.id,
                      month: currentM,
                      totalFee: total,
                      paidAmount: 0,
                      dueAmount: total,
                      status: 'due',
                      breakdown: { tuition, exam, computer, transport, other, scholarship },
                      createdAt: new Date().toISOString()
                  });
              }
          });
          
          await Promise.all(batchPromises);
          if (onRefresh) onRefresh();
          alert(`Success! Generated dues through ${bulkMonth}.`);
      } catch (err) {
          console.error(err);
          alert('Failed to generate bulk dues.');
      }
      setGeneratingBulk(false);
  };

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
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', editingFee.id);
        
        batch.update(userRef, {
           monthlyFee: Number(editingFee.monthlyFee),
           examFee: Number(editingFee.examFee || 0),
           computerFee: Number(editingFee.computerFee || 0),
           transportFee: Number(editingFee.transportFee || 0),
           otherFee: Number(editingFee.otherFee || 0)
        });

        // Find existing 'due' studentFees for this student to update their totals to match new fee config
        const q = query(collection(db, 'studentFees'), where('studentId', '==', editingFee.id), where('status', '==', 'due'));
        const snap = await getDocs(q);
        
        snap.docs.forEach(d => {
            const tuition = Number(editingFee.monthlyFee);
            const exam = Number(editingFee.examFee || 0);
            const computer = Number(editingFee.computerFee || 0);
            const transport = Number(editingFee.transportFee || 0);
            const other = Number(editingFee.otherFee || 0);
            const scholarship = Number(editingFee.scholarshipAmount || 0);
            
            const total = Math.max(0, tuition + exam + computer + transport + other - scholarship);
            
            batch.update(doc(db, 'studentFees', d.id), {
                totalFee: total,
                dueAmount: total,
                breakdown: { tuition, exam, computer, transport, other, scholarship }
            });
        });

        await batch.commit();
        setEditingFee(null);
        if (onRefresh) onRefresh();
    } catch(err) {
        console.error(err);
    }
    setSavingFee(false);
  };

  const getStudentTotalDueYear = (s: any) => {
      let annual = 0;
      let monthlyTuition = Number(s.originalTuition !== undefined ? s.originalTuition : (s.monthlyFee !== undefined ? s.monthlyFee : 0));

      if (feeStructure?.academic) {
         const rawClass = s.class || s.studentClass || '';
         const formattedClass = ['PG', 'Nursery', 'LKG', 'UKG'].includes(rawClass) ? rawClass : `Class ${rawClass}`;
         const matchingStruct = feeStructure.academic.find((a: any) => a.className === formattedClass || a.className === rawClass);
         if (matchingStruct) {
            annual = Number(matchingStruct.annual?.replace(/[^0-9.]/g, '') || 0);
         }
      }

      let scholarship = 0;
      if (s.scholarshipStatus === 'Provided') {
          scholarship = Number(s.scholarshipAmount || 0);
      }
      
      let exam = Number(s.examFee || 0);
      let computer = Number(s.computerFee || 0);
      let transport = Number(s.transportFee || 0);
      let other = Number(s.otherFee || 0);
      
      const monthlyTotalBeforeScholarship = monthlyTuition + exam + computer + transport + other;
      const monthlyTotalAfterScholarship = Math.max(0, monthlyTotalBeforeScholarship - scholarship);
      
      const totalYear = (monthlyTotalAfterScholarship * 12) + annual;
      return totalYear;
  };

  const getStudentDueTokens = (s: any) => {
      let totalDue = 0;
      s.fees?.forEach((f: any) => {
          if (f.status === 'due') {
              const due = f.dueAmount !== undefined ? Number(f.dueAmount) : Number(f.totalFee || 0);
              totalDue += due;
          }
      });
      return totalDue;
  };

  const getStudentStatus = (s: any) => {
      const activeDues = s.fees?.filter((f: any) => {
          if (f.status !== 'due') return false;
          const due = f.dueAmount !== undefined ? Number(f.dueAmount) : Number(f.totalFee || 0);
          return due > 0;
      }) || [];
      if (activeDues.length === 0) return 'PAID';
      
      const { month: currentMonthIdx } = getBSYearMonthDate();
      
      const oldDues = activeDues.filter((f: any) => {
          let m = f.month;
          if (m === 'Baishak') m = 'Baisakh';
          else if (m === 'Ashad') m = 'Asar';
          else if (m === 'Ashoj') m = 'Ashwin';
          const mIdx = MONTHS.indexOf(m);
          return mIdx !== -1 && mIdx < currentMonthIdx;
      });

      if (oldDues.length > 0) return 'DEFAULTER';
      return 'DUE';
  };

  const getMonthStatus = (s: any, month: string) => {
      const matchingFees = s.fees?.filter((f: any) => {
          let m = f.month;
          if (m === 'Baishak') m = 'Baisakh';
          else if (m === 'Ashad') m = 'Asar';
          else if (m === 'Ashoj') m = 'Ashwin';
          return m === month;
      });
      if (!matchingFees || matchingFees.length === 0) return 'grey';
      
      const isAnyPaid = matchingFees.some((f: any) => f.status === 'paid');
      if (isAnyPaid) return 'green';
      
      const isAnyDue = matchingFees.some((f: any) => f.status === 'due');
      if (isAnyDue) return 'red';
      
      return 'grey';
  };

  const toggleMonthDue = async (student: any, month: string) => {
      const status = getMonthStatus(student, month);
      
      if (status === 'green') {
          alert('This month is already paid. go to Transaction History to revert or modify.');
          return;
      }
      
      let mIdx = MONTHS.indexOf(month);
      
      if (status === 'grey') {
          for (let i = 0; i < mIdx; i++) {
              if (getMonthStatus(student, MONTHS[i]) === 'grey') {
                  alert(`Please mark earlier months (like ${MONTHS[i]}) as due before marking ${month}.`);
                  return;
              }
          }
      }
      
      if (status === 'red') {
          for (let i = mIdx + 1; i < MONTHS.length; i++) {
              if (getMonthStatus(student, MONTHS[i]) !== 'grey') {
                  alert(`Please undo later marked months (like ${MONTHS[i]}) before undoing ${month}.`);
                  return;
              }
          }
      }

      const matchingFees = student.fees?.filter((f: any) => {
          let m = f.month;
          if (m === 'Baishak') m = 'Baisakh';
          else if (m === 'Ashad') m = 'Asar';
          else if (m === 'Ashoj') m = 'Ashwin';
          return m === month;
      });
      const feeMonth = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
      const feeRef = doc(db, 'studentFees', feeMonth?.id || `${student.id}_${month}`);
      
      if (status === 'red') {
         await deleteDoc(feeRef);
      } else {
         let tuition = Number(student.originalTuition !== undefined ? student.originalTuition : 0);
         let exam = Number(student.examFee || 0);
         let computer = Number(student.computerFee || 0);
         let transport = Number(student.transportFee || 0);
         let other = Number(student.otherFee || 0);
         let scholarship = Number(student.scholarshipAmount || 0);
         
         if (student.scholarshipStatus !== 'Provided') {
             scholarship = 0;
         }
         
         let total = Math.max(0, tuition + exam + computer + transport + other - scholarship);
         
         await setDoc(feeRef, {
             studentId: student.id,
             month: month,
             totalFee: total,
             paidAmount: 0,
             dueAmount: total,
             status: 'due',
             breakdown: { tuition, exam, computer, transport, other, scholarship },
             createdAt: new Date().toISOString()
         });
      }
  };

  const filteredStudents = studentsData.filter(s => {
    const cleanId = String(s.studentId || s.id || '').toLowerCase();
    const cleanRoll = String(s.rollNumber || '').toLowerCase();
    const matchSearch = String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        cleanId.includes(searchTerm.toLowerCase()) ||
                        cleanRoll.includes(searchTerm.toLowerCase());
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

  const exportExcel = async () => {
     const columns = [
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Monthly Fee', key: 'monthlyFee', width: 15 },
        { header: 'Collected Amount', key: 'collected', width: 15 },
        { header: 'Outstanding Due', key: 'due', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
     ];
     
     const exportData = filteredStudents.map(s => {
        let collected = 0;
        s.fees?.forEach((f: any) => {
           if (f.status === 'paid') collected += Number(f.paidAmount || 0);
        });
        return {
           studentId: s.studentId || s.id,
           name: s.name || '',
           class: s.class,
           monthlyFee: s.monthlyFee || 0,
           collected: collected,
           due: getStudentDueTokens(s),
           status: getStudentStatus(s)
        };
     });
     
     await exportToExcel('Student_Ledger', 'Student Ledger Report', columns, exportData);
  };

  const exportPDF = async () => {
     const columns = ['Student ID', 'Name', 'Class', 'Monthly Fee', 'Collected', 'Due', 'Status'];
     
     const exportData = filteredStudents.map(s => {
        let collected = 0;
        s.fees?.forEach((f: any) => {
           if (f.status === 'paid') collected += Number(f.paidAmount || 0);
        });
        return [
           s.studentId || s.id || '-',
           s.name || '-',
           s.class || '-',
           `NRs. ${s.monthlyFee || 0}`,
           `NRs. ${collected}`,
           `NRs. ${getStudentDueTokens(s)}`,
           getStudentStatus(s)
        ];
     });
     
     await exportToPDF('Student Ledger Report', columns, exportData, 'Student_Ledger', false);
  };

  const getStatusBadge = (s: any) => {
    const status = getStudentStatus(s);
    
    if (status === 'DEFAULTER') return <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase">DEFAULTER</span>;
    if (status === 'DUE') return <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase">DUE</span>;
    return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">PAID</span>;
  };


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
            <div className="flex bg-blue-50/50 rounded-xl p-1 shrink-0 border border-blue-100">
                <select value={bulkMonth} onChange={e => setBulkMonth(e.target.value)} className="bg-transparent text-sm font-bold text-primary focus:outline-none px-2 border-r border-blue-200">
                   <option value="">Bulk Month</option>
                   {MONTHS.filter((m, i) => i <= getBSYearMonthDate().month).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={handleBulkGenerateDue} disabled={generatingBulk || !bulkMonth} className="px-3 text-sm font-bold text-blue-700 hover:text-blue-900 disabled:opacity-50">
                    {generatingBulk ? 'Generating...' : '+ Generate'}
                </button>
            </div>
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
              onChange={e => handleStatusChange(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none shrink-0 min-h-[48px]"
            >
              <option value="All">Payment Status: All</option>
              <option value="Paid">Status: Paid</option>
              <option value="Due">Status: Due</option>
              <option value="Defaulter">Status: Defaulter</option>
            </select>
            
            <div className="flex bg-blue-50/50 rounded-xl p-1 shrink-0 border border-blue-100 min-h-[48px]">
               <button onClick={exportExcel} className="border-r border-blue-200 text-blue-700 font-bold px-3 text-sm hover:text-blue-900 flex gap-2 items-center"><Download className="w-4 h-4"/> Excel</button>
               <button onClick={exportPDF} className="text-blue-700 font-bold px-3 text-sm hover:text-blue-900 flex gap-2 items-center"><Download className="w-4 h-4"/> PDF</button>
            </div>
         </div>
       </div>

       {/* Main Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
         <table className="w-full text-left whitespace-nowrap min-w-[800px]">
            <thead className="bg-primary text-white">
               <tr className="text-[10px] font-black uppercase tracking-widest border-b border-blue-800">
                  <th className="p-4 px-6 cursor-pointer hover:bg-[#2546a3] transition-colors" onClick={() => setSortConfig({key: 'id', direction: sortConfig?.key === 'id' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>ID {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-4">Roll</th>
                  <th className="p-4 cursor-pointer hover:bg-[#2546a3] transition-colors" onClick={() => setSortConfig({key: 'name', direction: sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Name {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-4 cursor-pointer hover:bg-[#2546a3] transition-colors" onClick={() => setSortConfig({key: 'class', direction: sortConfig?.key === 'class' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Class {sortConfig?.key === 'class' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  <th className="p-4 text-right">Monthly Fee</th>
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
                    <tr className={`hover:bg-blue-50/20 transition-colors group cursor-pointer ${expandedStudent === s.id ? 'bg-blue-50/40 border-l-4 border-l-blue-500' : ''}`} onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}>
                       <td className="p-4 px-6">
                          <p className={`text-sm font-bold ${expandedStudent === s.id ? 'text-blue-900' : 'text-gray-900'}`}>{cleanId}</p>
                       </td>
                       <td className="p-4">
                          <span className={`text-sm font-bold ${expandedStudent === s.id ? 'text-blue-700' : 'text-gray-600'}`}>{cleanRoll}</span>
                       </td>
                       <td className="p-4">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 hover:text-primary transition-colors">
                               <span className={`font-bold text-sm group-hover:opacity-90 ${expandedStudent === s.id ? 'text-blue-900' : 'text-gray-900'}`}>{s.name}</span>
                               {expandedStudent === s.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:opacity-90" />}
                             </div>
                             {s.scholarshipStatus === 'Provided' && (
                                <span className="inline-block bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-200 self-start">Scholarship Student</span>
                             )}
                          </div>
                       </td>
                       <td className="p-4">
                          <span className={`text-sm font-bold ${expandedStudent === s.id ? 'text-blue-800' : 'text-gray-800'}`}>Class {s.class}</span>
                       </td>
                       <td className="p-4 text-right">
                          <div className="flex flex-col items-end relative">
                            {Number(s.scholarshipAmount) > 0 && <span className="text-[10px] text-emerald-600 font-bold tracking-widest line-through">NRs. {s.originalTuition !== undefined ? s.originalTuition : (Number(s.monthlyFee) + Number(s.scholarshipAmount))}</span>}
                            {editingFee?.id === s.id ? (
                                <div className="flex flex-col bg-white border border-gray-200 shadow-xl p-3 rounded-xl absolute top-8 z-50 right-0 w-64 gap-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-700">Custom Fee Setup</span>
                                        <button onClick={() => setEditingFee(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Tuition Fee</span>
                                        <input type="number" className="w-20 px-2 py-1 border border-gray-300 rounded text-right" value={editingFee.monthlyFee} onChange={e => setEditingFee({...editingFee, monthlyFee: e.target.value})} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Exam Fee</span>
                                        <input type="number" className="w-20 px-2 py-1 border border-gray-300 rounded text-right" value={editingFee.examFee} onChange={e => setEditingFee({...editingFee, examFee: e.target.value})} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Computer Fee</span>
                                        <input type="number" className="w-20 px-2 py-1 border border-gray-300 rounded text-right" value={editingFee.computerFee} onChange={e => setEditingFee({...editingFee, computerFee: e.target.value})} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                                        <span className="text-gray-600">Transport/Other</span>
                                        <input type="number" className="w-20 px-2 py-1 border border-gray-300 rounded text-right" value={editingFee.otherFee} onChange={e => setEditingFee({...editingFee, otherFee: e.target.value})} />
                                    </div>
                                    <button onClick={() => handleSaveFee()} disabled={savingFee} className="w-full bg-primary text-white py-1.5 rounded font-bold text-xs hover:bg-blue-800 transition-colors">
                                        {savingFee ? 'Saving...' : 'Save Custom Fee'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                     <span className="text-sm text-gray-800 font-black">NRs. {s.monthlyFee || 0}</span>
                                     <button onClick={(e) => { e.stopPropagation(); setEditingFee({ id: s.id, monthlyFee: s.originalTuition !== undefined ? s.originalTuition : (s.monthlyFee || 0), examFee: s.examFee || 0, computerFee: s.computerFee || 0, otherFee: (s.otherFee || 0) + (s.transportFee || 0) }); }} className="text-gray-300 hover:text-blue-600 transition-colors" title="Edit custom fee via DB">
                                        <Edit2 className="w-3 h-3" />
                                     </button>
                                </div>
                            )}
                          </div>
                       </td>
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
                             {MONTHS.filter((m, i) => i <= getBSYearMonthDate().month || getMonthStatus(s, m) !== 'grey').map(m => {
                               const status = getMonthStatus(s, m);
                               let bg = 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer';
                               if (status === 'green') bg = 'bg-emerald-100 text-emerald-700 cursor-pointer border border-emerald-200 shadow-sm hover:bg-emerald-200';
                               if (status === 'red') bg = 'bg-red-50 text-red-600 font-bold border border-red-200 cursor-pointer hover:bg-red-100 shadow-sm';
                               
                               const matchingFees = s.fees?.filter((f: any) => {
                                   let fm = f.month;
                                   if (fm === 'Baishak') fm = 'Baisakh';
                                   else if (fm === 'Ashad') fm = 'Asar';
                                   else if (fm === 'Ashoj') fm = 'Ashwin';
                                   return fm === m;
                               });
                               const feeDoc = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
                               
                               return (
                                 <div key={m} onClick={() => {
                                    if (status === 'green' || status === 'red') {
                                       setSelectedPill({ student: s, month: m });
                                    } else {
                                       toggleMonthDue(s, m);
                                    }
                                 }} className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center ${bg} transition-colors group relative`} title={status === 'grey' ? 'Mark as Due' : status === 'red' ? 'Unpaid (Click to View or Undo)' : 'Paid (Click to view)'}>
                                   <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">{m}</span>
                                   {status === 'green' && <span className="text-xs font-black">✓</span>}
                                   {status === 'red' && <span className="text-[10px]">NRs. {feeDoc?.totalFee ?? s.monthlyFee}</span>}
                                   {status === 'grey' && <span className="text-xs group-hover:hidden">—</span>}
                                   {status === 'grey' && <span className="text-[10px] hidden group-hover:block text-gray-500 font-medium">+ Due</span>}
                                 </div>
                               );
                             })}
                          </div>
                          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden max-w-5xl mt-6">
                              <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                                 <span className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-3">
                                     Full Payment Statement
                                     <button onClick={(e) => {
                                        e.stopPropagation();
                                        const printWindow = window.open('', '_blank');
                                        if (printWindow) {
                                            const paidRows = (s.fees || []).filter((f: any) => f.status === 'paid' || f.status === 'due')
                                                .sort((a:any, b:any) => {
                                                    const yearA = Number(a.year || a.academicYear?.split('-')[0] || 0) || getBSYearMonthDate().year;
                                                    const yearB = Number(b.year || b.academicYear?.split('-')[0] || 0) || getBSYearMonthDate().year;
                                                    if (yearA !== yearB) return yearA - yearB;
                                                    return MONTHS.indexOf(a.month === 'Baishak' ? 'Baisakh' : (a.month === 'Ashad' ? 'Asar' : (a.month === 'Ashoj' ? 'Ashwin' : a.month))) - MONTHS.indexOf(b.month === 'Baishak' ? 'Baisakh' : (b.month === 'Ashad' ? 'Asar' : (b.month === 'Ashoj' ? 'Ashwin' : b.month)));
                                                });
                                            
                                            let tableRows = '';
                                            let totalPaid = 0;
                                            let totalDue = 0;
                                            paidRows.forEach((f: any, idx: number) => {
                                                const paidAmt = Number(f.paidAmount || (f.status === 'paid' ? f.totalFee : 0) || 0);
                                                const dueAmt = Number(f.dueAmount !== undefined ? f.dueAmount : (f.status === 'due' ? f.totalFee : 0));
                                                totalPaid += paidAmt;
                                                totalDue += dueAmt;
                                                const mName = f.month === 'Baishak' ? 'Baisakh' : (f.month === 'Ashad' ? 'Asar' : (f.month === 'Ashoj' ? 'Ashwin' : f.month));
                                                
                                                const recordYear = f.year || f.academicYear?.split('-')[0] || getBSYearMonthDate().year;
                                                const paidDate = f.paidAt ? formatBSDate(f.paidAt) : '-';
                                                const breakdown = f.breakdown ? 
                                                    `Tuition: ${f.breakdown.tuition||0}, Exam: ${f.breakdown.exam||0}, Comp: ${f.breakdown.computer||0}, Trans: ${f.breakdown.transport||0}, Other: ${f.breakdown.other||0}` 
                                                    : 'N/A';

                                                tableRows += `
                                                  <tr>
                                                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${idx + 1}</td>
                                                    <td style="border: 1px solid #000; padding: 4px;">${mName} ${recordYear}</td>
                                                    <td style="border: 1px solid #000; padding: 4px; text-align: right;">${paidAmt.toLocaleString()}</td>
                                                    <td style="border: 1px solid #000; padding: 4px; text-align: right;">${dueAmt.toLocaleString()}</td>
                                                    <td style="border: 1px solid #000; padding: 4px; text-align: center; text-transform: uppercase;">${f.status}</td>
                                                    <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${paidDate}</td>
                                                    <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${breakdown}</td>
                                                    <td style="border: 1px solid #000; padding: 4px;">${f.receiptNo || '-'}</td>
                                                  </tr>
                                                `;
                                            });

                                            printWindow.document.write(`
                                                <html>
                                                    <head>
                                                        <title>Student Statement - ${s.name}</title>
                                                        <style>
                                                            @page { size: auto; margin: 0; }
                                                            body { font-family: 'Times New Roman', serif; padding: 20px; }
                                                            .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
                                                            .text-center { text-align: center; }
                                                            .text-right { text-align: right; }
                                                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                            th, td { border: 1px solid #000; padding: 4px; }
                                                            th { background-color: #f0f0c0; }
                                                        </style>
                                                    </head>
                                                    <body onload="window.print(); window.close();">
                                                        <div class="receipt-container">
                                                            <div style="display: flex; align-items: center; justify-content: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                                                                <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin-right: 20px; filter: grayscale(100%);" />
                                                                <div class="text-center">
                                                                    <h1 style="margin: 5px 0;">SHIKSHANTAR ACADEMY</h1>
                                                                    <p style="margin: 2px 0;">Bastipur-5, Siraha, Nepal</p>
                                                                    <h2 style="margin-top: 15px;">Student Payment Statement</h2>
                                                                </div>
                                                            </div>
                                                            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
                                                                <div>
                                                                    <p><strong>Student Name:</strong> ${s.name}</p>
                                                                    <p><strong>Class:</strong> ${s.class || ''} ${s.section ? ' - Sec ' + s.section : ''}</p>
                                                                    <p><strong>Roll/ID:</strong> ${s.rollNumber || s.id || '-'}</p>
                                                                </div>
                                                                <div class="text-right">
                                                                    <p><strong>Statement Date:</strong> ${formatBSDate(new Date())}</p>
                                                                    <p><strong>Total Paid:</strong> NRs. ${totalPaid.toLocaleString()}</p>
                                                                    <p><strong>Total Due:</strong> NRs. ${totalDue.toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                            <table>
                                                                <thead>
                                                                    <tr>
                                                                        <th>S.N.</th>
                                                                        <th>Month / Particulars</th>
                                                                        <th>Paid (NRs.)</th>
                                                                        <th>Due (NRs.)</th>
                                                                        <th>Status</th>
                                                                        <th>Paid Date</th>
                                                                        <th>Breakdown</th>
                                                                        <th>Receipt No.</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    ${tableRows || '<tr><td colSpan="8" class="text-center">No records</td></tr>'}
                                                                </tbody>
                                                            </table>
                                                            <div style="margin-top: 20px; text-align: right;">
                                                                <p><strong>Total Paid:</strong> NRs. ${totalPaid.toLocaleString()}</p>
                                                                <p><strong>Total Due:</strong> NRs. ${totalDue.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </body>
                                                </html>
                                            `);
                                            printWindow.document.close();
                                        }
                                     }} className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 hover:text-primary transition-colors cursor-pointer text-[10px] font-bold">Print Statement</button>
                                 </span>
                                 <div className="max-w-xs text-right text-xs">
                                     <span className="font-bold text-emerald-600 mr-3">PAID: {(s.fees?.filter((f: any) => f.status === 'paid') || []).length} months</span>
                                     <span className="font-bold text-red-600">PENDING: {(s.fees?.filter((f: any) => f.status === 'due') || []).length} months</span>
                                 </div>
                              </div>
                              <table className="w-full text-xs text-left">
                                 <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                     <tr>
                                         <th className="py-2 px-4 font-bold">Month</th>
                                         <th className="py-2 px-4 font-bold">Total Fee</th>
                                         <th className="py-2 px-4 font-bold">Status</th>
                                         <th className="py-2 px-4 font-bold max-w-[200px]">Breakdown</th>
                                         <th className="py-2 px-4 font-bold hidden sm:table-cell">Paid At</th>
                                         <th className="py-2 px-4 font-bold hidden sm:table-cell">Receipt</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                     {!s.fees || s.fees.length === 0 ? (
                                         <tr><td colSpan={6} className="py-4 px-4 text-center text-gray-400">No payment records found</td></tr>                                      ) : (
                                        [...s.fees]
                                        .map(f => {
                                            let m = f.month;
                                            if (m === 'Baishak') m = 'Baisakh';
                                            else if (m === 'Ashad') m = 'Asar';
                                            else if (m === 'Ashoj') m = 'Ashwin';
                                            return { ...f, month: m };
                                        })
                                        .sort((a, b) => {
                                            if (a.status === 'paid' && b.status !== 'paid') return -1;
                                            if (a.status !== 'paid' && b.status === 'paid') return 1;
                                            return 0;
                                        })
                                        .filter((f, index, self) => index === self.findIndex(t => t.month === f.month && (t.year || t.academicYear) === (f.year || f.academicYear)))
                                        .sort((a:any, b:any) => {
                                           const yearA = Number(a.year || a.academicYear?.split('-')[0] || 0) || getBSYearMonthDate().year;
                                           const yearB = Number(b.year || b.academicYear?.split('-')[0] || 0) || getBSYearMonthDate().year;
                                           if (yearA !== yearB) return yearA - yearB;
                                           return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
                                        })
                                        .map((f: any, fIdx: number) => {
                                         const recordYear = f.year || f.academicYear?.split('-')[0] || getBSYearMonthDate().year;
                                         return (
                                         <tr key={f.id || `${f.month}-${recordYear}-${fIdx}`} onClick={() => setSelectedPill({ student: s, month: f.month, year: recordYear })} className="hover:bg-gray-50 transition-colors cursor-pointer" title="Click to view receipt or due details">
                                             <td className="py-2 px-4 font-bold text-gray-700">{f.month} {recordYear}</td>
                                             <td className="py-2 px-4 font-bold text-gray-900">NRs. {Number(f.totalFee || 0).toLocaleString()}</td>
                                             <td className="py-2 px-4">
                                                 {f.status === 'paid' ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest">Paid</span> : <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest">Due</span>}
                                             </td>
                                             <td className="py-2 px-4 text-gray-500 max-w-[200px] text-[10px]">
                                                 {f.breakdown ? Object.entries(f.breakdown).map(([k, v]) => Number(v) > 0 ? `${k}: ${v}` : null).filter(Boolean).join(', ') : '-'}
                                             </td>
                                             <td className="py-2 px-4 text-gray-500 hidden sm:table-cell">{f.paidAt ? formatBSDate(new Date(f.paidAt)) : '-'}</td>
                                             <td className="py-2 px-4 font-mono text-[10px] text-gray-500 hidden sm:table-cell">{f.receiptNo || '-'}</td>
                                         </tr>
                                        );})
                                      )}
                                 </tbody>
                              </table>
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
                        const matchingFees = selectedPill.student.fees?.filter((f: any) => {
                            let m = f.month;
                            if (m === 'Baishak') m = 'Baisakh';
                            else if (m === 'Ashad') m = 'Asar';
                            else if (m === 'Ashoj') m = 'Ashwin';
                            const fYear = Number(f.year || f.academicYear?.split('-')[0] || 0) || getBSYearMonthDate().year;
                            return m === selectedPill.month && (selectedPill.year ? fYear === Number(selectedPill.year) : true);
                        });
                        const feeMonth = matchingFees && matchingFees.length > 0 ? (matchingFees.find((f:any) => f.status === 'paid') || matchingFees[0]) : undefined;
                        const isPaid = feeMonth?.status === 'paid';
                        
                        return (
                            <div className="p-0 flex flex-col relative w-full h-full max-h-[85vh] bg-[#f8fafc]">
                               {/* Modal Header */}
                               <div className={`p-6 pb-8 border-b ${isPaid ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100'}`}>
                                   <div className="flex justify-between items-start mb-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isPaid ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                                         {isPaid ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                                      </div>
                                      <button onClick={() => setSelectedPill(null)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 transition-colors">
                                         <X className="w-5 h-5"/>
                                      </button>
                                   </div>
                                   <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedPill.month} {selectedPill.year || getBSYearMonthDate().year}</h3>
                                   <p className={`font-bold mt-1 uppercase tracking-widest text-xs ${isPaid ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPaid ? 'Payment Cleared' : 'Payment Due'}
                                   </p>
                               </div>

                               <div className="flex-1 overflow-auto p-6 space-y-6 bg-white">
                                   {isPaid ? (
                                       <>
                                         <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Transaction Details</p>
                                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                               <div>
                                                  <p className="text-xs text-gray-500 font-medium line-clamp-1">Amount Paid</p>
                                                  <p className="font-black text-gray-900">NRs. {(feeMonth.paidAmount || feeMonth.totalFee || 0).toLocaleString()}</p>
                                               </div>
                                               <div>
                                                  <p className="text-xs text-gray-500 font-medium">Date</p>
                                                  <p className="font-bold text-gray-900">{feeMonth.paidAt ? formatBSDate(new Date(feeMonth.paidAt)) : formatBSDate(new Date())}</p>
                                               </div>
                                               <div>
                                                  <p className="text-xs text-gray-500 font-medium">Method</p>
                                                  <p className="font-bold text-gray-900">{feeMonth.paymentMethod || 'Cash'}</p>
                                               </div>
                                               <div>
                                                  <p className="text-xs text-gray-500 font-medium">Receipt</p>
                                                  <p className="font-bold text-gray-900 uppercase">{feeMonth.receiptNo || 'N/A'}</p>
                                               </div>
                                            </div>
                                         </div>
                                         
                                         <div className="flex flex-col gap-3 mt-4">
                                            <button onClick={() => {
                                              const printWindow = window.open('', '_blank');
                                              if (printWindow) {
                                                  const studentName = selectedPill.student.name || '';
                                                  const rollNo = selectedPill.student.rollNumber || '-';
                                                  const className = selectedPill.student.class || '';
                                                  const section = selectedPill.student.section || 'A';
                                                  const receiptNo = feeMonth.receiptNo || `RCP-${getBSYearMonthDate().year}-${Math.floor(Math.random() * 10000)}`;
                                                  const method = feeMonth.paymentMethod || 'Cash';
                                                  const amount = feeMonth.paidAmount || feeMonth.totalFee || 0;
                                                  
                                                  let breakdownRows = '';
                                                  
                                                  let totalTuition = 0;
                                                  let totalExam = 0;
                                                  let totalComputer = 0;
                                                  let totalExtra = 0;
                                                  let totalAdmission = 0;
                                                  let totalDiscount = 0;

                                                  if (feeMonth.breakdown) {
                                                      totalTuition = Number(feeMonth.breakdown.tuition || 0);
                                                      totalExam = Number(feeMonth.breakdown.exam || 0);
                                                      totalComputer = Number(feeMonth.breakdown.computer || 0);
                                                      totalExtra = Number(feeMonth.breakdown.other || 0) + Number(feeMonth.breakdown.transport || 0);
                                                      totalDiscount = Number(feeMonth.breakdown.scholarship || 0);
                                                  } else {
                                                      totalTuition = amount;
                                                  }
                                                  
                                                  let srNo = 1;
                                                  const addRow = (name: string, amt: number) => {
                                                      if (amt > 0 || name === 'Monthly Fee' || name === 'Admission Fee') {
                                                          breakdownRows += `
                                                            <tr>
                                                               <td style="border: 1px solid #000; padding: 8px; text-align: center; border-left: none;">${srNo++}</td>
                                                               <td style="border: 1px solid #000; padding: 8px;">${name}</td>
                                                               <td style="border: 1px solid #000; padding: 8px; text-align: right; border-right: none;">${amt > 0 ? amt.toLocaleString() : ''}</td>
                                                            </tr>
                                                          `;
                                                      }
                                                  };

                                                  addRow('Admission Fee', totalAdmission);
                                                  addRow('Monthly Fee', totalTuition);
                                                  addRow('Exam Fee', totalExam);
                                                  addRow('Computer Fee', totalComputer);
                                                  addRow('Extra Fee', totalExtra);
                                                  
                                                  if (totalDiscount > 0) {
                                                      breakdownRows += `
                                                          <tr>
                                                             <td style="border: 1px solid #000; padding: 8px; text-align: center; border-left: none;">${srNo++}</td>
                                                             <td style="border: 1px solid #000; padding: 8px;">Discount / Scholarship</td>
                                                             <td style="border: 1px solid #000; padding: 8px; text-align: right; border-right: none;">- ${totalDiscount.toLocaleString()}</td>
                                                          </tr>
                                                      `;
                                                  }

                                                  printWindow.document.write(`
                                                      <html>
                                                          <head>
                                                              <title>Print Receipt</title>
                                                              <style>
                                                                  @page { size: auto; margin: 0; }
                                                                  body { background-color: #fff; font-family: 'Times New Roman', serif; padding: 20px; }
                                                                  .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; background-color: #ffffe0; padding: 0; }
                                                                  .text-center { text-align: center; }
                                                                  .header-text { margin: 5px 0; }
                                                                  .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 0 20px; }
                                                                  .line-input { border-bottom: 1px dashed #000; display: inline-block; min-width: 150px; font-style: normal; }
                                                                  table { width: 100%; border-collapse: collapse; margin-top: 10px; border-left: none; border-right: none; }
                                                                  th, td { border: 1px solid #000; padding: 10px; }
                                                                  th { background-color: #f0f0c9; }
                                                                  tr td:first-child, tr th:first-child { border-left: none; }
                                                                  tr td:last-child, tr th:last-child { border-right: none; }
                                                              </style>
                                                          </head>
                                                          <body onload="window.print(); window.close();">
                                                              <div class="receipt-container">
                                                                  <div style="display: flex; align-items: center; justify-content: center; border-bottom: 2px solid #000; padding-bottom: 15px; padding-top: 15px;">
                                                                      <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin-right: 20px; filter: grayscale(100%);" />
                                                                      <div class="text-center">
                                                                          <div style="font-size: 16px;">Receipt</div>
                                                                          <h1 style="margin: 5px 0; font-size: 28px; font-weight: bold; font-family: Arial, sans-serif;">SHIKSHANTAR ACADEMY</h1>
                                                                          <p style="margin: 2px 0; font-size: 15px;">Bastipur-5, Siraha, Nepal</p>
                                                                          <p style="margin: 2px 0; font-size: 15px;">Website: https://shikshantar.academy.nepalghum.xyz</p>
                                                                          <p style="margin: 2px 0; font-size: 15px;">Contact: +977 9807790805 | Email: info@shikshantar.academy.nepalghum.xyz</p>
                                                                      </div>
                                                                  </div>
                                                                  
                                                                  <div style="padding: 20px 20px 10px 20px;">
                                                                      <span style="font-size: 18px;">Receipt No. <strong class="line-input">${receiptNo}</strong></span>
                                                                  </div>
                                                                  
                                                                  <div class="info-row">
                                                                      <div style="flex: 1; font-size: 16px;">Name of Student: <strong class="line-input" style="min-width: 300px;">${studentName}</strong></div>
                                                                      <div style="font-size: 16px;">Class: <strong class="line-input" style="min-width: 100px; text-align: center;">${className}</strong> 
                                                                           Section: <strong class="line-input" style="min-width: 80px; text-align: center;">${section}</strong></div>
                                                                  </div>
                                                                  
                                                                  <div class="info-row">
                                                                      <div style="flex: 1; font-size: 16px;">Roll No: <strong class="line-input" style="min-width: 150px;">${rollNo}</strong></div>
                                                                      <div style="font-size: 16px;">Month: <strong class="line-input" style="min-width: 150px; text-align: center;">${selectedPill.month}</strong></div>
                                                                  </div>

                                                                  <div class="info-row">
                                                                      <div style="flex: 1; font-size: 16px;">Paid Date: <strong class="line-input" style="min-width: 150px;">${feeMonth.paidAt ? formatBSDate(feeMonth.paidAt) : '-'}</strong></div>
                                                                  </div>
                                                                  
                                                                  <table>
                                                                      <thead>
                                                                          <tr>
                                                                              <th style="width: 80px;">Sr. No.</th>
                                                                              <th>Particulars</th>
                                                                              <th style="width: 150px;">Amount</th>
                                                                          </tr>
                                                                      </thead>
                                                                      <tbody>
                                                                          ${breakdownRows}
                                                                          <tr>
                                                                              <td colspan="2" style="text-align: right; font-weight: bold; font-family: Arial, sans-serif; font-size: 18px;">Total</td>
                                                                              <td style="text-align: right; font-weight: bold; font-family: Arial, sans-serif; font-size: 18px;">${amount.toLocaleString()}</td>
                                                                          </tr>
                                                                      </tbody>
                                                                  </table>
                                                                  
                                                                  <div style="margin-top: 40px; padding: 0 20px 20px 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                                                                      <div>
                                                                          <p style="margin-bottom: 20px; font-size: 16px;">Paid By: <strong style="border-bottom: 2px dashed #000; font-family: Arial, sans-serif;">${method}</strong></p>
                                                                          <p style="font-size: 18px;">Signature of Centre Head</p>
                                                                      </div>
                                                                  </div>
                                                                  
                                                                  <div style="border-top: 2px solid #000; padding: 10px; text-align: center; font-size: 14px; font-weight: bold;">
                                                                      All above mentioned Amount once paid are non refundable in any case whatsoever.
                                                                  </div>
                                                              </div>
                                                          </body>
                                                      </html>
                                                  `);
                                                  printWindow.document.close();
                                              }
                                            }} className="w-full bg-blue-50 text-blue-800 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors uppercase tracking-widest">
                                            🖨️ Print Receipt
                                            </button>
                                            
                                            <button onClick={async () => {
                                             if(!window.confirm('Are you sure you want to revert this payment back to unpaid? This will mark the transaction as REFUNDED in history.')) return;
                                             try {
                                                 const s = selectedPill.student;
                                                 const t = Number(s.originalTuition || 0);
                                                 const e = Number(s.examFee || 0);
                                                 const c = Number(s.computerFee || 0);
                                                 const tr = Number(s.transportFee || 0);
                                                 const o = Number(s.otherFee || 0);
                                                 const sch = Number(s.scholarshipStatus === 'Provided' ? (s.scholarshipAmount || 0) : 0);
                                                 const calcTotal = Math.max(0, t + e + c + tr + o - sch);

                                                 if (feeMonth?.transactionId) {
                                                     const batch = writeBatch(db);
                                                     
                                                     // Query all fee docs tied to this transaction
                                                     const q = query(collection(db, 'studentFees'), where('transactionId', '==', feeMonth.transactionId));
                                                     const snap = await getDocs(q);
                                                     
                                                     if (!snap.empty) {
                                                         snap.forEach(d => {
                                                             batch.set(d.ref, {
                                                                 status: 'due',
                                                                 paidAmount: 0,
                                                                 dueAmount: d.data().totalFee || calcTotal,
                                                                 paidAt: deleteField(),
                                                                 receiptNo: deleteField(),
                                                                 transactionId: deleteField(),
                                                                 paymentMethod: deleteField(),
                                                                 collectorId: deleteField(),
                                                                 collectorName: deleteField()
                                                             }, { merge: true });
                                                         });
                                                     } else {
                                                         // Fallback if not found via query (e.g., missing transactionId on doc)
                                                         const feeId = feeMonth?.id || `${selectedPill.student.id}_${selectedPill.month}`;
                                                         const feeRef = doc(db, 'studentFees', feeId);
                                                         batch.set(feeRef, {
                                                             status: 'due',
                                                             paidAmount: 0,
                                                             dueAmount: feeMonth?.totalFee || calcTotal,
                                                             totalFee: feeMonth?.totalFee || calcTotal,
                                                             studentId: selectedPill.student.id,
                                                             month: feeMonth?.month || selectedPill.month,
                                                             paidAt: deleteField(),
                                                             receiptNo: deleteField(),
                                                             transactionId: deleteField(),
                                                             paymentMethod: deleteField(),
                                                             collectorId: deleteField(),
                                                             collectorName: deleteField()
                                                         }, { merge: true });
                                                     }
                                                     
                                                     // Instead of deleting, mark as Refunded
                                                     batch.set(doc(db, 'transactions', feeMonth.transactionId), { status: 'REFUNDED' }, { merge: true });
                                                     
                                                     await batch.commit();
                                                 } else {
                                                     // No transaction ID recorded, just revert this single document directly
                                                     const feeId = feeMonth?.id || `${selectedPill.student.id}_${selectedPill.month}`;
                                                     const feeRef = doc(db, 'studentFees', feeId);
                                                     
                                                     await setDoc(feeRef, {
                                                         status: 'due',
                                                         paidAmount: 0,
                                                         dueAmount: feeMonth?.totalFee || calcTotal,
                                                         totalFee: feeMonth?.totalFee || calcTotal,
                                                         studentId: selectedPill.student.id,
                                                         month: feeMonth?.month || selectedPill.month,
                                                         paidAt: deleteField(),
                                                         receiptNo: deleteField(),
                                                         transactionId: deleteField(),
                                                         paymentMethod: deleteField(),
                                                         collectorId: deleteField(),
                                                         collectorName: deleteField()
                                                     }, { merge: true });
                                                 }

                                                 setSelectedPill(null);
                                                 if (onRefresh) onRefresh();
                                             } catch(e: any) {
                                                 console.error("Revert error: ", e);
                                                 alert(`Failed to revert payment: ${e.message || 'Unknown error'}`);
                                             }
                                          }} className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors uppercase tracking-widest border border-red-100/50">
                                             ⚠️ Revert to Unpaid
                                          </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-5 flex flex-col items-center justify-center text-center">
                                         <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-1">Amount Due</p>
                                         <p className="text-3xl font-black text-red-600">NRs. {(feeMonth?.dueAmount || feeMonth?.totalFee || selectedPill.student.monthlyFee || 0).toLocaleString()}</p>
                                      </div>
                                      <div className="flex flex-col gap-3">
                                          <button onClick={() => {
                                              setSelectedPill(null);
                                              onRecordPayment?.(selectedPill.student.id);
                                          }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-transform hover:scale-[1.02] shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-sm">
                                             💰 Collect Now
                                          </button>
                                          <button onClick={() => {
                                              toggleMonthDue(selectedPill.student, selectedPill.month);
                                              setSelectedPill(null);
                                          }} className="w-full py-3 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-black hover:text-gray-900 transition-colors uppercase tracking-widest text-xs">
                                             Remove Due
                                          </button>
                                      </div>
                                    </>
                                )}
                            </div>
                        </div>
                        );
                    })()}
               </div>
           </div>
       )}

    </div>
  );
}
