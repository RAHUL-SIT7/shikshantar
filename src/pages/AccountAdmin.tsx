import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, TrendingUp, AlertTriangle, Users, BookOpen, Clock, LogOut, GraduationCap } from 'lucide-react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';

import StudentLedgerTab from '../components/fee_management/StudentLedgerTab';
import RecordPaymentTab from '../components/fee_management/RecordPaymentTab';
import FeeStructure from './FeeStructure';
import ReportsAnalyticsTab from '../components/fee_management/ReportsAnalyticsTab';
import TransactionHistoryTab from '../components/fee_management/TransactionHistoryTab';
import ScholarshipTab from '../components/fee_management/ScholarshipTab';

export default function AccountAdmin() {
  const [activeTab, setActiveTab] = useState('student_ledger');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState('All');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [userRole, setUserRole] = useState('teacher'); // Default restrictive
  const [targetStudentId, setTargetStudentId] = useState<string | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [transactionsData, setTransactionsData] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);

  const [stats, setStats] = useState({
     collectedThisMonth: 0,
     totalOutstanding: 0,
     defaultersCount: 0,
     collectedThisYear: 0,
     collectionRate: 85,
     expectedThisMonth: 0,
  });

  const fetchFeeData = () => { /* No-op, updates automatically */ };

  useEffect(() => {
     const role = localStorage.getItem('userRole') || 'teacher';
     setUserRole(role);

     let unsubSettings: any;
     let unsubStudents: any;
     let unsubTx: any;
     let unsubFees: any;

     const unsubAuth = onAuthStateChanged(auth, (user) => {
         if (user) {
             setLoading(true);
             
             // 1. Fetch structures
             unsubSettings = onSnapshot(doc(db, 'settings', 'fee_structure'), (settingsDoc) => {
                 const structs = settingsDoc.exists() ? (settingsDoc.data().academic || []) : [];
                 setFeeStructures(structs);
                 const academicYear = settingsDoc.exists() ? (settingsDoc.data().academicYear || '2023-2024') : '2023-2024';
                 setStats(prev => ({ ...prev, academicYear }));

                 // 2. Fetch students
                 unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (studSnap) => {
                     const studentsList = studSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

                     // 3. Fetch transactions
                     unsubTx = onSnapshot(collection(db, 'transactions'), (txSnap) => {
                         const txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                         setTransactionsData(txList);

                         // 4. Fetch fees
                         unsubFees = onSnapshot(collection(db, 'studentFees'), (feesSnap) => {
                             const feesList = feesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

                             // Merge into studentData
                             const mergedStudents = studentsList.map(s => {
                                 const studentFees = feesList.filter(f => f.studentId === s.id);
                                 const struct = structs.find((st: any) => st.className === s.class);
                                 let baseFee = (s.monthlyFee !== undefined && s.monthlyFee !== null && s.monthlyFee !== "") ? Number(s.monthlyFee) : (struct?.tuition ? Number(String(struct.tuition).replace(/[^0-9.]/g, '')) : 1000);
                                 const originalTuition = baseFee;
                                 
                                 if (s.scholarshipStatus === 'Provided' && s.scholarshipAmount) {
                                     baseFee = Math.max(0, baseFee - Number(s.scholarshipAmount));
                                 }

                                 let extractedRoll = s.rollNumber || s.rollNo || '';
                                 if (!extractedRoll && s.studentId) {
                                     const match = s.studentId.match(/^SA\d+([A-Z]*\d*)*$/i);
                                     if (match) {
                                         const numPart = s.studentId.replace(/^SA/i, '');
                                         let clsStr = s.class || '';
                                         if (numPart.startsWith(clsStr)) {
                                             extractedRoll = numPart.substring(clsStr.length);
                                         } else if (numPart.startsWith('0' + clsStr)) {
                                             extractedRoll = numPart.substring(clsStr.length + 1);
                                         } else {
                                             extractedRoll = numPart;
                                         }
                                     } else {
                                         extractedRoll = s.studentId;
                                     }
                                 }

                                 return {
                                     id: s.id,
                                     studentId: s.studentId,
                                     rollNumber: extractedRoll,
                                     name: s.fullName || s.name,
                                     class: s.class,
                                     monthlyFee: baseFee,
                                     originalTuition: originalTuition,
                                     scholarshipStatus: s.scholarshipStatus,
                                     scholarshipAmount: s.scholarshipAmount,
                                     examFee: (s.examFee !== undefined && s.examFee !== null && s.examFee !== "") ? Number(s.examFee) : (struct?.exam ? Number(String(struct.exam).replace(/[^0-9.]/g, '')) : 0),
                                     computerFee: (s.computerFee !== undefined && s.computerFee !== null && s.computerFee !== "") ? Number(s.computerFee) : (struct?.computer ? Number(String(struct.computer).replace(/[^0-9.]/g, '')) : 0),
                                     transportFee: Number(s.transportFee || 0),
                                     otherFee: Number(s.otherFee || 0),
                                     guardianName: s.guardianName || 'Unknown',
                                     guardianPhone: s.parentPhone || s.phone || '',
                                     fees: studentFees // all fee records
                                 };
                             });

                             setStudentsData(mergedStudents);

                             // Calculate stats
                             let outstanding = 0;
                             let collectedYear = 0;
                             
                             txList.forEach((tx: any) => {
                                 if (tx.status === 'SUCCESS') collectedYear += tx.amount;
                             });

                             feesList.forEach(f => {
                                 if (f.status === 'due') outstanding += Number(f.dueAmount || 0);
                             });
                             
                             const defaulterIds = new Set(feesList.filter(f => f.status === 'due').map(f => f.studentId));
                             const defaulters = defaulterIds.size;

                             const expectedTotal = collectedYear + outstanding;
                             const rate = expectedTotal > 0 ? Math.round((collectedYear / expectedTotal) * 100) : 0;

                             let lastCollectionDate = 'N/A';
                             const sortedTx = [...txList].sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
                             if (sortedTx.length > 0) {
                                 lastCollectionDate = (sortedTx[0] as any).date || 'N/A';
                             }

                             setStats(prev => ({
                                 ...prev,
                                 collectedThisMonth: 0,
                                 totalOutstanding: outstanding,
                                 defaultersCount: defaulters,
                                 collectedThisYear: collectedYear,
                                 collectionRate: Math.min(rate, 100),
                                 expectedThisMonth: 0,
                                 lastCollectionDate
                             }));

                             setLoading(false);
                         }, (err) => {
                             if(err.message.includes('permissions')) console.log("Not authorized to load fees");
                         });
                     }, (err) => {
                         if(err.message.includes('permissions')) console.log("Not authorized to load tx");
                     });
                 }, (err) => {
                     if(err.message.includes('permissions')) console.log("Not authorized to load students");
                 });
             }, (err) => {
                 if(err.message.includes('permissions')) console.log("Not authorized to load settings");
             });
         } else {
             setLoading(false);
             if (unsubSettings) unsubSettings();
             if (unsubStudents) unsubStudents();
             if (unsubTx) unsubTx();
             if (unsubFees) unsubFees();
         }
     });

     return () => {
         unsubAuth();
         if (unsubSettings) unsubSettings();
         if (unsubStudents) unsubStudents();
         if (unsubTx) unsubTx();
         if (unsubFees) unsubFees();
     };
  }, []);

  const ALL_TABS = [
     { id: 'student_ledger', label: 'Student Ledger', roles: ['admin', 'teacher'] },
     { id: 'scholarship_students', label: 'Scholarships', roles: ['admin', 'teacher'] },
     { id: 'collect_fee', label: 'Cash Update', roles: ['admin'] },
     { id: 'fee_structure', label: 'Fee Structure', roles: ['admin'] },
     { id: 'history', label: 'Payment Records', roles: ['admin', 'teacher'] },
     { id: 'reports', label: 'Reports & Analytics', roles: ['admin'] },
  ];

  const TABS = ALL_TABS.filter(t => t.roles.includes(userRole));

  const scholarshipCount = studentsData.filter(s => s.scholarshipStatus === 'Provided').length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight uppercase">Cash & Fee Ledger</h1>
      </div>
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in fade-in zoom-in-95 duration-500">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm transition-transform duration-300 hover:shadow-md cursor-default flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Collected This Year</p>
            <TrendingUp className="w-5 h-5 text-[#059669]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">NRs. {stats.collectedThisYear.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Academic Year {(stats as any).academicYear || '2023-2024'}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm transition-transform duration-300 hover:shadow-md cursor-default flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Total Outstanding</p>
            <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">NRs. {stats.totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.defaultersCount} students have pending fees</p>
          </div>
        </div>

        {/* Card 3 */}
        <div 
           className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm transition-transform duration-300 hover:shadow-md cursor-pointer flex flex-col justify-between"
           onClick={() => { setActiveTab('student_ledger'); setLedgerFilterStatus('Defaulter'); }}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Defaulters</p>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.defaultersCount} Students</p>
            <p className="text-xs text-gray-400 mt-1">Dues over 30 days</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm transition-transform duration-300 hover:shadow-md cursor-default flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
             <p className="text-xs text-gray-500 font-medium">Collection Rate</p>
             <Wallet className="w-5 h-5 text-[#3b82f6]"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.collectionRate}%</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 mb-1">
               <div className="bg-primary h-1.5 rounded-full" style={{ width: `${stats.collectionRate}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Updated {(stats as any).lastCollectionDate || 'N/A'}</p>
          </div>
        </div>

        {/* Card 5 */}
        <div 
           className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm transition-transform duration-300 hover:shadow-md cursor-pointer flex flex-col justify-between lg:col-span-1 md:col-span-2 col-span-2"
           onClick={() => setActiveTab('scholarship_students')}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Scholarships Active</p>
            <GraduationCap className="w-5 h-5 text-[#a855f7]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{scholarshipCount} Students</p>
            <p className="text-xs text-gray-400 mt-1">Saving: NRs. {studentsData.reduce((acc, s) => acc + (s.scholarshipStatus === 'Provided' ? Number(s.scholarshipAmount||0) : 0), 0).toLocaleString()}/mo</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="overflow-x-auto custom-scrollbar border-b border-gray-200">
         <div className="flex gap-6 min-w-max">
            {TABS.map(tab => (
               <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${ activeTab === tab.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300' }`}
               >
                  {tab.label}
               </button>
            ))}
         </div>
      </div>

      {/* Active Tab Content */}
      <div className="min-h-[500px]">
         {loading ? (
             <div className="space-y-4">
               <div className="w-full h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center px-4">
                 <div className="w-1/4 h-6 bg-gray-200 rounded animate-pulse"></div>
               </div>
               <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-4 flex gap-4 items-center">
                       <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                       <div className="flex-1 space-y-2">
                          <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-1/3 h-3 bg-gray-100 rounded animate-pulse"></div>
                       </div>
                       <div className="w-32 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                  ))}
               </div>
             </div>
         ) : (
             <>
                 <div className={activeTab === 'student_ledger' ? 'block' : 'hidden'}>
                   <StudentLedgerTab 
                     studentsData={studentsData} 
                     initialFilterStatus={ledgerFilterStatus}
                     onFilterStatusChange={setLedgerFilterStatus}
                     onRefresh={fetchFeeData}
                     onRecordPayment={(id: string) => {
                        setTargetStudentId(id);
                        setActiveTab('collect_fee');
                     }} 
                     onViewLedger={(id: string) => {
                        setHistorySearchTerm(id);
                        setActiveTab('history');
                     }}
                   />
                 </div>
                 
                 <div className={activeTab === 'collect_fee' ? 'block' : 'hidden'}>
                   {/* Pass key based on targetStudentId if needed or just let it update via props */}
                   <RecordPaymentTab 
                     initialStudentId={targetStudentId} 
                     studentsData={studentsData} 
                     onRefresh={fetchFeeData} 
                     onBack={() => {
                       setTargetStudentId('');
                       setActiveTab('student_ledger');
                     }} 
                   />
                 </div>

                 {activeTab === 'fee_structure' && (
                     <div className="-mt-8">
                       <FeeStructure />
                     </div>
                 )}
                 {activeTab === 'scholarship_students' && <ScholarshipTab studentsData={studentsData} />}
                 
                 <div className={activeTab === 'history' ? 'block' : 'hidden'}>
                    <TransactionHistoryTab 
                      initialSearchTerm={historySearchTerm} 
                      onSearchTermChange={setHistorySearchTerm} 
                      transactionsData={transactionsData} 
                      studentsData={studentsData} 
                      onRefresh={fetchFeeData} 
                    />
                 </div>
                 
                 {activeTab === 'reports' && <ReportsAnalyticsTab students={studentsData} transactions={transactionsData} />}
             </>
         )}
      </div>

    </div>
  );
}
