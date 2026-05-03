
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, AlertCircle, CheckCircle, Clock, PieChart, BarChart, Calendar, DollarSign, ListOrdered } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const NEPALI_MONTHS = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

const MONTH_RANK: Record<string, number> = {
  'baisakh': 1, 'baishak': 1,
  'jestha': 2, 'jeth': 2,
  'ashad': 3, 'ashadh': 3,
  'shrawan': 4, 'shravan': 4, 'sawan': 4,
  'bhadra': 5, 'bhadon': 5,
  'ashoj': 6, 'asoj': 6, 'ashwin': 6,
  'kartik': 7, 'kartikk': 7,
  'mangsir': 8, 'mangshir': 8,
  'poush': 9, 'push': 9,
  'magh': 10,
  'falgun': 11, 'phalgun': 11, 'fagun': 11,
  'chaitra': 12, 'chait': 12
};

const getMonthRank = (fee: any): number => {
  const raw = (fee.month || fee.fromMonth || '').toLowerCase();
  for (const [key, rank] of Object.entries(MONTH_RANK)) {
    if (raw.includes(key)) return rank;
  }
  return 99; // Should not happen with valid month data
};

export default function Account() {
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async (user: any) => {
      setLoading(true);
      setError(null);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists() || (userDocSnap.data().role !== 'student' && userDocSnap.data().role !== 'Student')) {
          setError("Your account is not linked to a valid student profile.");
          setLoading(false);
          return;
        }

        const studentData = { id: userDocSnap.id, ...userDocSnap.data() };
        setStudentRecord(studentData);

        // Use the student's user document ID to fetch their fees.
        const feesQuery = query(collection(db, 'studentFees'), where('studentId', '==', studentData.id));
        const feesSnap = await getDocs(feesQuery);
        const studentFees = feesSnap.docs.map(d => d.data());
        
        setFees(studentFees);

      } catch (err: any) {
        console.error("--- ACCOUNT DATA LOAD FAILED ---", { code: err.code, message: err.message });
        setError(`Failed to load account data due to a permissions issue or network error.`);
      } finally {
        setLoading(false);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchStudentData(user);
      } else {
        setLoading(false);
        setError("You are not logged in.");
      }
    });
    return () => unsubAuth();
  }, []);

  // Memoize complex calculations to prevent re-running on every render
  const feeDetails = useMemo(() => {
    if (fees.length === 0) return null;

    const totalFee = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const totalDue = totalFee - totalPaid;

    const detailedFeeList = [...fees].sort((a, b) => getMonthRank(a) - getMonthRank(b));

    const categoricalBreakdown = detailedFeeList.reduce((acc, fee) => {
        if (!acc[fee.feeType]) {
            acc[fee.feeType] = { total: 0, paid: 0, items: [] };
        }
        acc[fee.feeType].total += fee.amount;
        if (fee.status === 'paid') {
            acc[fee.feeType].paid += fee.amount;
        }
        acc[fee.feeType].items.push(fee);
        return acc;
    }, {} as Record<string, { total: number; paid: number; items: any[] }>);

    const monthlyBreakdown = NEPALI_MONTHS.map(monthName => {
        const normalizedMonth = monthName.toLowerCase();
        const feesForMonth = fees.filter(f => (f.month || '').toLowerCase().startsWith(normalizedMonth.substring(0,4)));
        if (feesForMonth.length === 0) return { month: monthName, status: 'N/A', hasFees: false };
        const hasDue = feesForMonth.some(f => f.status === 'due');
        return { month: monthName, status: hasDue ? 'Due' : 'Paid', hasFees: true };
    });

    const monthsCleared = monthlyBreakdown.filter(m => m.status === 'Paid').length;

    return { totalFee, totalPaid, totalDue, monthsCleared, detailedFeeList, categoricalBreakdown, monthlyBreakdown };
  }, [fees]);

  if (loading) {
    return <div className="p-10 text-center font-semibold text-gray-500">Loading Fee Details...</div>;
  }

  if (error || !studentRecord) {
    return (
        <div className="bg-white rounded-lg p-8 max-w-lg mx-auto mt-10 text-center shadow-sm border">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Access Denied</h3>
            <p className="text-gray-600 mt-2">{error || "Could not retrieve student information."}</p>
        </div>
    );
  }

  if (!feeDetails) {
      return (
          <div className="bg-white rounded-lg p-8 max-w-lg mx-auto mt-10 text-center shadow-sm border">
              <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">No Fee Records Found</h3>
              <p className="text-gray-600 mt-2">There are no fee records associated with your account for the current academic year.</p>
          </div>
      )
  }

  const { totalFee, totalPaid, totalDue, monthsCleared, detailedFeeList, categoricalBreakdown, monthlyBreakdown } = feeDetails;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Student Info Card (Existing) */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-800">Fee Status for {studentRecord.fullName}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 mt-2">
            <span><strong>Class:</strong> {studentRecord.class}</span>
            <span><strong>Roll No:</strong> {studentRecord.studentId}</span>
            <span><strong>Academic Year:</strong> 2083-2084</span>
          </div>
        </div>

        {/* Due Alert Banner (Existing) */}
        {totalDue > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 mr-3" />
              <div>
                <p className="font-bold">Outstanding Balance Alert: You have a total due of NRs. {totalDue.toLocaleString()}.</p>
                <p className="text-sm">Please clear your dues to avoid interruptions.</p>
              </div>
            </div>
          </div>
        )}

        {/* 4 Summary Cards (New) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <SummaryCard icon={DollarSign} title="Total Fee" value={`NRs. ${totalFee.toLocaleString()}`} color="blue" />
            <SummaryCard icon={CheckCircle} title="Total Paid" value={`NRs. ${totalPaid.toLocaleString()}`} color="green" />
            <SummaryCard icon={Clock} title="Total Due" value={`NRs. ${totalDue.toLocaleString()}`} color="red" />
            <SummaryCard icon={Calendar} title="Months Cleared" value={`${monthsCleared} of 12`} color="indigo" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Detailed and Categorical Breakdown */}
            <div className="lg:col-span-2 space-y-6">
                {/* Detailed Fee Table (New) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-200 flex items-center gap-3">
                      <ListOrdered className="w-6 h-6 text-gray-500" />
                      <h3 className="text-lg font-bold text-gray-800">Detailed Fee Ledger</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold">Month</th>
                          <th className="py-3 px-4 text-left font-semibold">Fee Type</th>
                          <th className="py-3 px-4 text-right font-semibold">Amount</th>
                          <th className="py-3 px-4 text-center font-semibold">Status</th>
                          <th className="py-3 px-4 text-left font-semibold">Paid Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailedFeeList.map((fee, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold text-gray-700">{fee.month}</td>
                            <td className="py-3 px-4 text-gray-600">{fee.feeType}</td>
                            <td className="py-3 px-4 text-right font-mono">{fee.amount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${fee.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {fee.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500">{fee.paidDate || '---'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>

            {/* Right Column: Monthly and Categorical status */}
            <div className="space-y-6">
                {/* Monthly Payment Status (New) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-5 border-b border-gray-200 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-gray-500" />
                        <h3 className="text-lg font-bold text-gray-800">Monthly Status</h3>
                    </div>
                    <div className="p-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {monthlyBreakdown.map(({ month, status, hasFees }) => (
                            <div key={month} className={`text-center p-2 rounded-lg border-2 ${!hasFees ? 'bg-gray-50 text-gray-400 border-gray-200' : status === 'Paid' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                                <p className="font-bold text-sm">{month}</p>
                                <p className="text-xs font-semibold">{hasFees ? status : 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Categorical Breakdown (New) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-5 border-b border-gray-200 flex items-center gap-3">
                        <PieChart className="w-6 h-6 text-gray-500" />
                        <h3 className="text-lg font-bold text-gray-800">Fee Category Breakdown</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        {Object.entries(categoricalBreakdown).map(([type, data]) => (
                            <div key={type}>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-gray-700">{type}</p>
                                    <p className="text-sm font-mono">{data.paid.toLocaleString()} / {data.total.toLocaleString()}</p>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(data.paid / data.total) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

const SummaryCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string, color: string }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };
    return (
        <div className={`bg-white p-5 rounded-2xl shadow-sm border flex items-start gap-4 ${colors[color]}`}>
            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center bg-white border-4 border-current">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-bold opacity-80">{title}</p>
                <p className="text-2xl font-black mt-1">{value}</p>
            </div>
        </div>
    );
};
