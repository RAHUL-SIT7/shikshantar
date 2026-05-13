import React, { useState, useEffect } from 'react';
import { Wallet, Search, Filter, TrendingUp, AlertTriangle } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import SalaryStructuresTab from '../components/salary_management/SalaryStructuresTab';
import ProcessSalaryTab from '../components/salary_management/ProcessSalaryTab';

export default function SalaryAdmin() {
  const [activeTab, setActiveTab] = useState('structures');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);

  useEffect(() => {
    let unsubs: any[] = [];
    const unsubAuth = onAuthStateChanged(auth, (user) => {
       if (user) {
         const qT = query(collection(db, 'users'), where('role', '==', 'teacher'));
         
         const unsubTeachers = onSnapshot(qT, (snap) => {
            setTeachers(snap.docs.map(d => ({id: d.id, ...d.data()})));
         }, (err) => console.log('Could not load teachers', err));
         
         const unsubStructures = onSnapshot(collection(db, 'salary_structures'), (snap) => {
            setStructures(snap.docs.map(d => ({id: d.id, ...d.data()})));
         }, (err) => console.log('Could not load salary structures', err));
         
         const unsubRecords = onSnapshot(collection(db, 'salary_records'), (snap) => {
            setSalaryRecords(snap.docs.map(d => ({id: d.id, ...d.data()})));
         }, (err) => console.log('Could not load salary records', err));
         
         unsubs = [unsubTeachers, unsubStructures, unsubRecords];
       }
    });
    return () => { unsubAuth(); unsubs.forEach(u => u()); };
  }, []);

  // Compute stats
  const totalPayout = salaryRecords.filter(r => r.status === 'Paid').reduce((acc, curr) => acc + (curr.netPay || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight uppercase">Salary Management</h1>
      </div>
      
      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Total Teachers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Total Salaries Paid</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">NRs. {totalPayout.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto custom-scrollbar border-b border-gray-200">
         <div className="flex gap-6 min-w-max">
            {['structures', 'process'].map(tab => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${ activeTab === tab ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-400 hover:border-gray-200' }`}
               >
                  {tab === 'process' ? 'Process Salary' : 'Structures'}
               </button>
            ))}
         </div>
      </div>

      <div className="min-h-[500px]">
          {activeTab === 'structures' && <SalaryStructuresTab teachers={teachers} structures={structures} />}
          {activeTab === 'process' && <ProcessSalaryTab teachers={teachers} structures={structures} records={salaryRecords} />}
      </div>
    </div>
  );
}
