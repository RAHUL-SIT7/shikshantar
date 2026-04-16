import React, { useState } from 'react';
import { CheckCircle2, Bell, DollarSign, Search, History } from 'lucide-react';

export default function AccountAdmin() {
  const [showNotification, setShowNotification] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const students = [
    { id: 'S101', name: 'Aarav Sharma', class: '10', due: 20000, paid: 30000 },
    { id: 'S102', name: 'Bina Thapa', class: '10', due: 0, paid: 50000 },
    { id: 'S103', name: 'Chirag Yadav', class: '9', due: 15000, paid: 35000 },
    { id: 'S104', name: 'Diya Rai', class: '8', due: 5000, paid: 40000 },
  ];

  const paymentHistory = [
    { id: 'TXN001', studentId: 'S101', studentName: 'Aarav Sharma', date: '2024-04-15', amount: 10000, method: 'eSewa' },
    { id: 'TXN002', studentId: 'S102', studentName: 'Bina Thapa', date: '2024-04-14', amount: 50000, method: 'Bank Transfer (Nabil)' },
    { id: 'TXN003', studentId: 'S103', studentName: 'Chirag Yadav', date: '2024-04-10', amount: 15000, method: 'Khalti' },
    { id: 'TXN004', studentId: 'S101', studentName: 'Aarav Sharma', date: '2024-03-05', amount: 20000, method: 'Cash' },
  ];

  const handleNotify = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleUpdatePayment = (id: string) => {
    alert(`Payment update dialog for student ${id} would open here.`);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-5">
      {showNotification && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Fee reminder notification sent successfully.
        </div>
      )}

      <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
          <span>Manage Student Accounts</span>
        </div>

        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#6b7280]" />
          </div>
          <input
            type="text"
            placeholder="Search by Student ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-[#e5e7eb] rounded-lg bg-[#f9fafb] text-sm focus:outline-none focus:border-[#1e3a8a]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.85rem]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="text-left p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Student ID</th>
                <th className="text-left p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Name</th>
                <th className="text-center p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Class</th>
                <th className="text-right p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Paid Amount</th>
                <th className="text-right p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Due Amount</th>
                <th className="text-center p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="p-3 border-b border-[#f3f4f6] font-medium">{student.id}</td>
                  <td className="p-3 border-b border-[#f3f4f6]">{student.name}</td>
                  <td className="p-3 border-b border-[#f3f4f6] text-center">{student.class}</td>
                  <td className="p-3 border-b border-[#f3f4f6] text-right text-[#10b981]">NRs. {student.paid.toLocaleString()}</td>
                  <td className="p-3 border-b border-[#f3f4f6] text-right text-[#b91c1c]">NRs. {student.due.toLocaleString()}</td>
                  <td className="p-3 border-b border-[#f3f4f6]">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleUpdatePayment(student.id)}
                        className="p-1.5 bg-[#e0f2fe] text-[#0369a1] rounded hover:bg-[#bae6fd] transition-colors"
                        title="Update Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleNotify}
                        disabled={student.due === 0}
                        className={`p-1.5 rounded transition-colors ${student.due > 0 ? 'bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        title="Send Fee Reminder"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-[#6b7280]">No students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment History Section */}
      <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>Recent Payment History</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.85rem]">
            <thead>
              <tr className="bg-[#f9fafb]">
                <th className="text-left p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Date</th>
                <th className="text-left p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Transaction ID</th>
                <th className="text-left p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Student</th>
                <th className="text-left p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Method</th>
                <th className="text-right p-3 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="p-3 border-b border-[#f3f4f6]">{payment.date}</td>
                  <td className="p-3 border-b border-[#f3f4f6] font-mono text-xs">{payment.id}</td>
                  <td className="p-3 border-b border-[#f3f4f6]">
                    <span className="font-medium">{payment.studentName}</span>
                    <span className="text-[#6b7280] ml-1">({payment.studentId})</span>
                  </td>
                  <td className="p-3 border-b border-[#f3f4f6]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#f3f4f6] text-[#4b5563]">
                      {payment.method}
                    </span>
                  </td>
                  <td className="p-3 border-b border-[#f3f4f6] text-right font-medium text-[#10b981]">
                    + NRs. {payment.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
