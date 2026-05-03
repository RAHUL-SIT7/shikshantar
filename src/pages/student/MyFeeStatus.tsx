import React, { useState, useEffect } from 'react';
import { BarChart, Calendar, Check, DollarSign, Info, TrendingUp, X } from 'lucide-react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format, parseISO } from 'date-fns';

interface FeeRecord {
  id: string;
  feeType: string;
  amount: number;
  status: 'paid' | 'due';
  month: string;
  fromMonth: string;
  toMonth: string;
  dueDate?: string; 
  paidDate?: string; 
}

export default function MyFeeStatus() {
  const [student, setStudent] = useState<any>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async (user: any) => {
      setLoading(true);
      try {
        const studentQuery = query(collection(db, 'users'), where('email', '==', user.email));
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
          setError('No student record linked to your account.');
          setLoading(false);
          return;
        }

        const studentData = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() };
        setStudent(studentData);

        const feesQuery = query(collection(db, 'studentFees'), where('studentId', '==', studentData.id));
        const feesSnap = await getDocs(feesQuery);
        const feesData = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeRecord));
        setFees(feesData);
        
      } catch (err) {
        console.error("Fee status fetch error:", err);
        setError('Failed to fetch your fee information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user);
      } else {
        setLoading(false);
        setError('You must be logged in to view this page.');
      }
    });

    return () => unsubscribe();
  }, []);

  const totalFee = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const remaining = totalFee - totalPaid;
  const discount = 0; // Placeholder for discount logic
  const paidPercentage = totalFee > 0 ? (totalPaid / totalFee) * 100 : 0;

  const installments = fees.map(fee => ({
    id: fee.id,
    name: fee.feeType,
    amount: fee.amount,
    dueDate: fee.dueDate || 'N/A',
    paidDate: fee.paidDate || (fee.status === 'paid' ? 'N/A' : '-'),
    status: fee.status === 'paid' ? 'Paid' : (new Date() > (fee.dueDate ? parseISO(fee.dueDate) : new Date())) ? 'Overdue' : 'Upcoming',
  })).sort((a,b) => (a.dueDate > b.dueDate ? 1 : -1));

  const feeBreakdown = fees.reduce((acc, fee) => {
    if(acc[fee.feeType]) {
        acc[fee.feeType] += fee.amount;
    } else {
        acc[fee.feeType] = fee.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="text-center py-20 font-semibold">Loading your fee status...</div>;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500 font-bold">{error}</div>;
  }

  if (!student) {
    return <div className="text-center py-20 font-semibold">No student data found.</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Fee Status</h1>
          <p className="text-gray-500 mt-1">A complete overview of your fee payments for the current academic year.</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{student.fullName}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 mt-2">
                <span><b>Roll No:</b> {student.studentId}</span>
                <span><b>Class:</b> {student.class}</span>
                <span><b>Section:</b> {student.section || 'A'}</span>
                <span><b>Academic Year:</b> {student.academicYear || '2083-2084'}</span>
              </div>
            </div>
          </div>
        </div>

        {remaining > 0 && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm">
            <div className="flex items-center">
              <Info className="h-6 w-6 mr-3" />
              <div>
                <p className="font-bold">You have an outstanding balance of NRs. {remaining.toLocaleString()}.</p>
                <p className="text-sm">Please clear your dues at the earliest to avoid any inconvenience.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-sm"><p className="text-sm text-gray-500">Total Fee</p><p className="text-2xl font-bold">{totalFee.toLocaleString()}</p></div>
          <div className="bg-white p-5 rounded-lg shadow-sm"><p className="text-sm text-gray-500">Total Paid</p><p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()}</p></div>
          <div className="bg-white p-5 rounded-lg shadow-sm"><p className="text-sm text-gray-500">Remaining</p><p className="text-2xl font-bold text-red-600">{remaining.toLocaleString()}</p></div>
          <div className="bg-white p-5 rounded-lg shadow-sm"><p className="text-sm text-gray-500">Discount</p><p className="text-2xl font-bold text-blue-600">{discount.toLocaleString()}</p></div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Payment Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${paidPercentage}%` }}></div>
          </div>
          <p className="text-right text-sm text-gray-600 mt-2">{paidPercentage.toFixed(2)}% Paid</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold p-6 border-b">Installment Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-sm">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Installment</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Paid Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((inst, index) => (
                    <tr key={inst.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="p-4 text-gray-500">{index + 1}</td>
                      <td className="p-4 font-semibold">{inst.name}</td>
                      <td className="p-4">{inst.amount.toLocaleString()}</td>
                      <td className="p-4">{inst.dueDate}</td>
                      <td className="p-4">{inst.paidDate}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${inst.status === 'Paid' ? 'bg-green-100 text-green-800' : inst.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {inst.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold p-6 border-b">Fee Breakdown</h3>
            <div className="p-6">
              <ul className="space-y-4">
                {Object.entries(feeBreakdown).map(([key, value]) => (
                   <li key={key} className="flex justify-between items-center">
                     <span className="text-gray-700">{key}</span>
                     <span className="font-semibold">NRs. {value.toLocaleString()}</span>
                   </li>
                ))}
                 <li className="flex justify-between items-center border-t pt-4 mt-4 font-bold">
                   <span className="text-gray-800">Net Payable</span>
                   <span className="text-xl text-gray-900">NRs. {totalFee.toLocaleString()}</span>
                 </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
