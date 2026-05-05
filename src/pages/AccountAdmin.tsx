import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, TrendingUp, AlertTriangle, Users, BookOpen, Clock, LogOut, GraduationCap } from 'lucide-react';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

import StudentLedgerTab from '../components/fee_management/StudentLedgerTab';
import RecordPaymentTab from '../components/fee_management/RecordPaymentTab';
import FeeStructure from './FeeStructure';
import ReportsAnalyticsTab from '../components/fee_management/ReportsAnalyticsTab';
import TransactionHistoryTab from '../components/fee_management/TransactionHistoryTab';
import ScholarshipTab from '../components/fee_management/ScholarshipTab';

export default function AccountAdmin() {
  const [activeTab, setActiveTab] = useState('student_ledger');
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

  const fetchFeeData = async () => {
      try {
          setLoading(true);
          
          // 1. Fetch structures
          const settingsDoc = await getDoc(doc(db, 'settings', 'fee_structure'));
          const structs = settingsDoc.exists() ? (settingsDoc.data().academic || []) : [];
          setFeeStructures(structs);

          // 2. Fetch students
          const studSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
          const studentsList = studSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

          // 3. Fetch transactions
          const txSnap = await getDocs(collection(db, 'transactions'));
          const txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTransactionsData(txList);

          // Assuming we calculate monthly due dynamically based on class structure & txn history.
          // Or read from studentFees if we save them individually.
          // For now, let's keep it simple: read 'studentFees' to get due per student.
          const feesSnap = await getDocs(collection(db, 'studentFees'));
          const feesList = feesSnap.docs.map(d => d.data());

          // Merge into studentData
          const mergedStudents = studentsList.map(s => {
              const studentFees = feesList.filter(f => f.studentId === s.id);
              const struct = structs.find((st: any) => st.className === s.class);
              let baseFee = struct?.tuition ? Number(String(struct.tuition).replace(/[^0-9.]/g, '')) : 1000;
              
              if (s.scholarshipStatus === 'Provided' && s.scholarshipAmount) {
                 baseFee = Math.max(0, baseFee - Number(s.scholarshipAmount));
              }

              return {
                 id: s.id,
                 name: s.fullName || s.name,
                 class: s.class,
                 monthlyFee: baseFee,
                 scholarshipStatus: s.scholarshipStatus,
                 scholarshipAmount: s.scholarshipAmount,
                 guardianName: s.guardianName || 'Unknown',
                 guardianPhone: s.parentPhone || s.phone || '',
                 fees: studentFees // all fee records
              };
          });

          setStudentsData(mergedStudents);

          // Calculate stats
          let outstanding = 0;
          let defaulters = 0;
          let collectedYear = 0;
          let expectedYear = 0;
          let collectedMonth = 0;

          // Process transaction collection stats
          txList.forEach((tx: any) => {
              if (tx.status === 'SUCCESS') {
                  collectedYear += tx.amount;
              }
          });

          // Process dues from studentFees
          feesList.forEach(f => {
              if (f.status === 'due') {
                  outstanding += Number(f.dueAmount || 0);
              }
          });
          
          // Count defaulters (students with at least 1 due fee older than current month theoretically)
          const defaulterIds = new Set(feesList.filter(f => f.status === 'due').map(f => f.studentId));
          defaulters = defaulterIds.size;

          const expectedTotal = collectedYear + outstanding;
          const rate = expectedTotal > 0 ? Math.round((collectedYear / expectedTotal) * 100) : 0;

          let lastCollectionDate = 'N/A';
          const sortedTx = [...txList].sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
          if (sortedTx.length > 0) {
             lastCollectionDate = (sortedTx[0] as any).date || 'N/A';
          }

          setStats({
             collectedThisMonth: collectedMonth, // Implement later
             totalOutstanding: outstanding,
             defaultersCount: defaulters,
             collectedThisYear: collectedYear,
             collectionRate: Math.min(rate, 100),
             expectedThisMonth: 0,
             lastCollectionDate
          } as any);

      } catch (err: any) {
          if (err?.message?.includes('Missing or insufficient permissions')) {
              console.log("Not authorized to load account data");
          } else {
              console.error("Error loading account data:", err);
          }
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
     // Fetch accurate role
     const role = localStorage.getItem('userRole') || 'teacher';
     setUserRole(role);

     const unsubAuth = onAuthStateChanged(auth, (user) => {
         if (user) {
             fetchFeeData();
         } else {
             setLoading(false);
         }
     });

     return () => unsubAuth();
  }, []);

  const ALL_TABS = [
     { id: 'student_ledger', label: 'Student Ledger', roles: ['admin', 'teacher'] },
     { id: 'scholarship_students', label: 'Scholarships', roles: ['admin', 'teacher'] },
     { id: 'record_payment', label: 'Record Payment', roles: ['admin'] },
     { id: 'fee_structure', label: 'Fee Structure', roles: ['admin'] },
     { id: 'history', label: 'Transaction History', roles: ['admin', 'teacher'] },
  ];

  const TABS = ALL_TABS.filter(t => t.roles.includes(userRole));

  const scholarshipCount = studentsData.filter(s => s.scholarshipStatus === 'Provided').length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-[#1e3a8a] tracking-tight uppercase">Fee Management</h1>
      </div>
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in zoom-in-95 duration-500">
        {/* Card 1 */}
        <div className="bg-emerald-50 rounded-2xl p-4 md:p-5 border border-emerald-100 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg cursor-default flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] md:text-xs text-emerald-800 font-bold uppercase leading-tight tracking-wider">Collected overall</p>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black text-emerald-900 tracking-tight">NRs. {stats.collectedThisYear.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Total revenue collected</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-red-50 rounded-2xl p-4 md:p-5 border border-red-100 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg cursor-default flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] md:text-xs text-red-800 font-bold uppercase leading-tight tracking-wider">Total Outstanding</p>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black text-red-900 tracking-tight">NRs. {stats.totalOutstanding.toLocaleString()}</p>
            <p className="text-[10px] text-red-600 font-medium mt-1">{stats.defaultersCount} students with dues</p>
          </div>
        </div>

        {/* Card 3 */}
        <div 
           className="bg-orange-50 rounded-2xl p-4 md:p-5 border border-orange-100 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg cursor-pointer flex flex-col justify-between"
           onClick={() => setActiveTab('student_ledger')}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] md:text-xs text-orange-800 font-bold uppercase leading-tight tracking-wider">Defaulters</p>
            <Users className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black text-orange-900 tracking-tight">{stats.defaultersCount} Students</p>
            <p className="text-[10px] text-orange-600 font-medium mt-1">Need to verify dates</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-blue-50 rounded-2xl p-4 md:p-5 border border-blue-100 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg cursor-default flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
             <p className="text-[10px] md:text-xs text-blue-800 font-bold uppercase leading-tight tracking-wider">Collection Rate</p>
             <Wallet className="w-4 h-4 text-blue-600"/>
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black text-blue-900 tracking-tight">{stats.collectionRate}%</p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2 mb-1">
               <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${stats.collectionRate}%` }}></div>
            </div>
            <p className="text-[10px] text-blue-600 font-medium leading-tight mt-1">Last Date: <span className="font-bold">{(stats as any).lastCollectionDate || 'N/A'}</span></p>
          </div>
        </div>

        {/* Card 5 */}
        <div 
           className="bg-purple-50 rounded-2xl p-4 md:p-5 border border-purple-100 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg cursor-pointer flex flex-col justify-between"
           onClick={() => setActiveTab('scholarship_students')}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] md:text-xs text-purple-800 font-bold uppercase leading-tight tracking-wider">Scholarships</p>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xl md:text-3xl font-black text-purple-900 tracking-tight">{scholarshipCount} Availed</p>
            <p className="text-[10px] text-purple-600 font-medium mt-1">Total sponsored students</p>
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
                  className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${
                     activeTab === tab.id 
                        ? 'border-[#1e3a8a] text-[#1e3a8a]' 
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                  }`}
               >
                  {tab.label}
               </button>
            ))}
         </div>
      </div>

      {/* Active Tab Content */}
      <div className="min-h-[500px]">
         {loading ? (
             <div className="p-10 text-center font-bold text-gray-500 animate-pulse">Loading fees data...</div>
         ) : (
             <>
                 {activeTab === 'student_ledger' && <StudentLedgerTab studentsData={studentsData} onRecordPayment={(id: string) => {
                    setTargetStudentId(id);
                    setActiveTab('record_payment');
                 }} />}
                 {activeTab === 'record_payment' && <RecordPaymentTab initialStudentId={targetStudentId} studentsData={studentsData} onRefresh={fetchFeeData} />}
                 {activeTab === 'fee_structure' && (
                     <div className="-mt-8">
                       <FeeStructure />
                     </div>
                 )}
                 {activeTab === 'scholarship_students' && <ScholarshipTab studentsData={studentsData} />}
                 {activeTab === 'history' && <TransactionHistoryTab transactionsData={transactionsData} onRefresh={fetchFeeData} />}
             </>
         )}
      </div>

    </div>
  );
}
