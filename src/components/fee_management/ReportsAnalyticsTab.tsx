import React, { useState, useEffect } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FileDown, Users, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899'];

export default function ReportsAnalyticsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    let unsubS = () => {};
    let unsubT = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubS = onSnapshot(collection(db, 'financial_students'), (snap) => {
          setStudents(snap.docs.map(skip => skip.data()));
        }, (err: any) => handleFirestoreError(err, OperationType.LIST, 'financial_students'));
        unsubT = onSnapshot(query(collection(db, 'financial_transactions'), orderBy('date', 'desc')), (snap) => {
          setTransactions(snap.docs.map(skip => skip.data()));
        }, (err: any) => handleFirestoreError(err, OperationType.LIST, 'financial_transactions'));
      } else {
        setStudents([]);
        setTransactions([]);
      }
    });

    return () => { unsubS(); unsubT(); unsubAuth(); };
  }, []);

  // Aggregations
  const totalCollected = students.reduce((sum, s) => sum + (s.paid || 0), 0);
  const totalDues = students.reduce((sum, s) => sum + (s.due || 0), 0);
  const defaulters = students.filter(s => (s.due || 0) > 0);

  // Method Pie Chart
  const methodData = Object.entries(
    transactions.filter(t => t.type === 'payment').reduce((acc, t) => {
      acc[t.method] = (acc[t.method] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Class Bar Chart
  const classData = Object.entries(
    students.reduce((acc, s) => {
       if (!acc[s.class]) acc[s.class] = { class: s.class, paid: 0, due: 0 };
       acc[s.class].paid += s.paid || 0;
       acc[s.class].due += s.due || 0;
       return acc;
    }, {} as Record<string, any>)
  ).map(x => x[1] as any).sort((a: any, b: any) => {
     // A simple sort by class name logic could go here
     return (a.class || '').localeCompare(b.class || '');
  });

  const exportMonthlyReport = () => {
    const headers = ['Date', 'Receipt No', 'Student', 'Class', 'Method', 'Amount'];
    const csvRows = [headers.join(',')];
    const currentMonth = new Date().getMonth();
    
    transactions.filter(t => new Date(t.date).getMonth() === currentMonth).forEach(t => {
       csvRows.push([
          formatBSDate(t.date),
          t.receiptNo,
          `"${t.studentName}"`,
          t.class,
          t.method,
          t.amount
       ].join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Collection_${formatBSDate(new Date())}.csv`;
    a.click();
  };

  const exportFullLedger = () => {
     const headers = ['Student ID', 'Name', 'Class', 'Paid', 'Due'];
     const csvRows = [headers.join(',')];
     students.forEach(s => {
        csvRows.push([s.id, `"${s.name}"`, s.class, s.paid || 0, s.due || 0].join(','));
     });
     
     const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `Full_Ledger_${formatBSDate(new Date())}.csv`;
     a.click();
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
         <div>
           <h2 className="text-xl font-black text-gray-800">Reports & Analytics</h2>
           <p className="text-sm text-gray-500 font-medium">Financial insights for 2083-2084 B.S.</p>
         </div>
         <div className="flex flex-wrap gap-2">
            <button onClick={exportMonthlyReport} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 flex gap-2 items-center"><FileDown className="w-4 h-4"/> Monthly Report</button>
            <button onClick={exportFullLedger} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 flex gap-2 items-center"><FileDown className="w-4 h-4"/> Full Ledger</button>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
             <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6">Class-wise Collection Breakdown</h3>
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={classData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis dataKey="class" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 700}}/>
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 700}} tickFormatter={(v) => `रू ${v/1000}k`}/>
                   <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700}}/>
                   <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 700}} />
                   <Bar dataKey="paid" name="Collected" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="due" name="Outstanding" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
             </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
             <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6">Payment Method Distribution</h3>
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                   <Pie data={methodData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                      {methodData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Pie>
                   <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700}} />
                   <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px', fontWeight: 700}}/>
                </PieChart>
             </ResponsiveContainer>
          </div>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
             <div>
               <h3 className="text-base font-black text-gray-800">Defaulters List</h3>
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Students with outstanding dues</p>
             </div>
             <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700">Send Bulk Reminders</button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white">
                   <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="p-4 px-6">Student</th>
                      <th className="p-4">Class</th>
                      <th className="p-4 text-right">Due Amount</th>
                      <th className="p-4 text-center">Guardian Phone</th>
                      <th className="p-4 text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {defaulters.map((s, idx) => (
                      <tr key={idx} className="hover:bg-red-50/10">
                         <td className="p-4 px-6 font-bold text-gray-800">{s.name}</td>
                         <td className="p-4 text-xs font-black text-gray-500">{s.class}</td>
                         <td className="p-4 text-right font-black text-red-500">रू {s.due?.toLocaleString()}</td>
                         <td className="p-4 text-center text-xs font-bold text-gray-500">{s.guardianPhone || 'N/A'}</td>
                         <td className="p-4 text-right">
                           <button className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase hover:bg-green-100">WhatsApp Alert</button>
                         </td>
                      </tr>
                   ))}
                   {defaulters.length === 0 && (
                      <tr>
                         <td colSpan={5} className="p-10 text-center text-emerald-500 font-bold uppercase tracking-widest text-xs">No defaulters. Everyone is paid up! 🎉</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
