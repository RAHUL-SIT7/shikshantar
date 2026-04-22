import React, { useState, useEffect } from 'react';
import { CheckCircle2, Bell, DollarSign, Search, History, X, CreditCard, User, GraduationCap, Building2, TrendingUp, AlertTriangle, FileDown, PlusCircle } from 'lucide-react';

export default function AccountAdmin() {
  const [showNotification, setShowNotification] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null); // For Payment Modal
  const [addingFees, setAddingFees] = useState(false); // To toggle between "Add Payment" and "Add Fine/Fee"

  const [students, setStudents] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    const storedStudents = localStorage.getItem('school_fees_students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    } else {
      const defaultStudents = [
        { id: 'S101', name: 'Aarav Sharma', class: '10', due: 20000, paid: 30000 },
        { id: 'S102', name: 'Bina Thapa', class: '10', due: 0, paid: 50000 },
        { id: 'S103', name: 'Chirag Yadav', class: '9', due: 15000, paid: 35000 },
        { id: 'S104', name: 'Diya Rai', class: '8', due: 5000, paid: 40000 },
      ];
      setStudents(defaultStudents);
      localStorage.setItem('school_fees_students', JSON.stringify(defaultStudents));
    }

    const storedHistory = localStorage.getItem('school_fees_history');
    if (storedHistory) {
      setPaymentHistory(JSON.parse(storedHistory));
    } else {
      const defaultHistory = [
        { id: 'TXN001', studentId: 'S101', studentName: 'Aarav Sharma', date: '2024-04-15', amount: 10000, method: 'eSewa' },
        { id: 'TXN002', studentId: 'S102', studentName: 'Bina Thapa', date: '2024-04-14', amount: 50000, method: 'Bank Transfer (Nabil)' },
        { id: 'TXN003', studentId: 'S103', studentName: 'Chirag Yadav', date: '2024-04-10', amount: 15000, method: 'Khalti' },
        { id: 'TXN004', studentId: 'S101', studentName: 'Aarav Sharma', date: '2024-03-05', amount: 20000, method: 'Cash' },
      ];
      setPaymentHistory(defaultHistory);
      localStorage.setItem('school_fees_history', JSON.stringify(defaultHistory));
    }

    // Interval to poll for student Portal payments (simulate real-time)
    const interval = setInterval(() => {
      const st = localStorage.getItem('school_fees_students');
      if (st) setStudents(JSON.parse(st));
      const ph = localStorage.getItem('school_fees_history');
      if (ph) setPaymentHistory(JSON.parse(ph));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Modal State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const handleNotify = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleUpdatePayment = (student: any) => {
    setSelectedStudent(student);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setAddingFees(false);
  };

  const handleAddFee = (student: any) => {
    setSelectedStudent(student);
    setPaymentAmount('');
    setPaymentMethod('Penalty/Extra Charge');
    setAddingFees(true);
  };

  const submitPayment = () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;
    const amountNum = Number(paymentAmount);
    
    // Update student balances
    const updatedStudents = students.map(s => {
      if (s.id === selectedStudent.id) {
        if (addingFees) {
          // Increase their due
          return {
            ...s,
            due: s.due + amountNum
          };
        } else {
          // Record payment
          return {
            ...s,
            paid: s.paid + amountNum,
            due: Math.max(0, s.due - amountNum)
          };
        }
      }
      return s;
    });

    // Add to history
    const updatedHistory = addingFees ? paymentHistory : [
      {
        id: `TXN${Date.now().toString().slice(-6)}`,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        date: new Date().toISOString().split('T')[0],
        amount: amountNum,
        method: paymentMethod + " (Manual Setup)"
      },
      ...paymentHistory
    ];

    setStudents(updatedStudents);
    setPaymentHistory(updatedHistory);
    localStorage.setItem('school_fees_students', JSON.stringify(updatedStudents));
    localStorage.setItem('school_fees_history', JSON.stringify(updatedHistory));

    setSelectedStudent(null);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCollected = students.reduce((acc, s) => acc + s.paid, 0);
  const totalDues = students.reduce((acc, s) => acc + s.due, 0);

  const handleDownloadDefaulters = () => {
    const defaulters = students.filter(s => s.due > 0);
    if (defaulters.length === 0) {
      alert("No pending dues found.");
      return;
    }

    let csvContent = "Student ID,Name,Class,Pending Due (NRs.)\n";
    defaulters.forEach(d => {
      csvContent += `${d.id},${d.name},${d.class},${d.due}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Overdue_Students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 gap-6 relative">
      {/* Top Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#1e3a8a]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#64748b] uppercase">Total Revenue</p>
            <p className="text-xl font-extrabold text-[#1f2937]">NRs. {totalCollected.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#dc2626]/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#dc2626]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#64748b] uppercase">Total Pending Dues</p>
            <p className="text-xl font-extrabold text-[#1f2937]">NRs. {totalDues.toLocaleString()}</p>
          </div>
        </div>
        <div 
          onClick={handleDownloadDefaulters}
          className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex items-center justify-between cursor-pointer hover:bg-[#f8fafc] transition-colors group"
        >
          <div className="flex flex-col">
            <p className="text-sm font-bold text-[#1f2937] group-hover:text-[#1e3a8a]">Defaulters List</p>
            <p className="text-xs text-[#64748b]">Download CSV Report</p>
          </div>
          <FileDown className="w-6 h-6 text-[#94a3b8] group-hover:text-[#1e3a8a] transition-colors" />
        </div>
      </div>
      {/* Payment Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1e3a8a] text-white p-4 flex justify-between items-center relative overflow-hidden">
              <Building2 className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
              <div className="relative z-10 text-left">
                <h3 className="font-bold text-lg">{addingFees ? 'Add Fees / Penalty' : 'Record Payment'}</h3>
                <p className="text-white/80 text-xs">{addingFees ? 'Increase due amount' : 'Update account balance'} for {selectedStudent.id}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors relative z-10"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="bg-[#f3f4f6] p-4 rounded-lg flex items-center gap-3 border border-[#e5e7eb]">
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#1e3a8a]" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1f2937] text-sm">{selectedStudent.name}</h4>
                  <div className="flex gap-2 text-xs text-[#6b7280]">
                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Class {selectedStudent.class}</span>
                    <span>•</span>
                    <span className="text-[#b91c1c] font-semibold">Current Due: NRs. {selectedStudent.due.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4b5563] mb-1">{addingFees ? 'Charge Amount (NRs.)' : 'Payment Amount (NRs.)'}</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full pl-9 pr-3 py-2 border border-[#d1d5db] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4b5563] mb-1">{addingFees ? 'Reason for Charge' : 'Payment Method'}</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#d1d5db] rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    {!addingFees ? (
                      <>
                        <option value="Cash">Cash</option>
                        <option value="eSewa">eSewa</option>
                        <option value="Khalti">Khalti</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </>
                    ) : (
                      <>
                        <option value="Penalty/Extra Charge">Penalty / Extra Charge</option>
                        <option value="Transport Fees">Transport Fees</option>
                        <option value="Exam Fees">Exam Fees</option>
                        <option value="Books / Uniforms">Books / Uniforms</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-[#f3f4f6]">
                <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 text-sm font-semibold text-[#4b5563] hover:bg-[#f3f4f6] rounded-lg transition-colors">Cancel</button>
                <button onClick={submitPayment} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm ${addingFees ? 'bg-[#ea580c] hover:bg-[#c2410c]' : 'bg-[#1e3a8a] hover:bg-[#1e40af]'}`}>
                  {addingFees ? 'Apply Charge' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotification && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-3 rounded-lg text-sm flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          Fee reminder notification sent successfully.
        </div>
      )}

      {/* Main Content Sections */}
      <section className="bg-[#ffffff] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] border border-[#e5e7eb] overflow-hidden">
        <div className="p-5 border-b border-[#f3f4f6] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1e3a8a]" />
            <h2 className="text-[#1e293b] font-bold text-lg">Manage Student Accounts</h2>
          </div>
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#94a3b8]" />
            </div>
            <input
              type="text"
              placeholder="Search ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-[#cbd5e1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.85rem]">
            <thead>
              <tr className="bg-[#f1f5f9]">
                <th className="text-left p-3 border-b border-[#e2e8f0] text-[#475569] font-bold">Student ID</th>
                <th className="text-left p-3 border-b border-[#e2e8f0] text-[#475569] font-bold">Name</th>
                <th className="text-center p-3 border-b border-[#e2e8f0] text-[#475569] font-bold">Class</th>
                <th className="text-right p-3 border-b border-[#e2e8f0] text-[#475569] font-bold">Paid Amount</th>
                <th className="text-right p-3 border-b border-[#e2e8f0] text-[#475569] font-bold">Due Amount</th>
                <th className="text-center p-3 border-b border-[#e2e8f0] text-[#475569] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-[#f8fafc] transition-colors group">
                  <td className="p-3 font-semibold text-[#334155]">{student.id}</td>
                  <td className="p-3 font-medium text-[#0f172a]">{student.name}</td>
                  <td className="p-3 text-center">
                    <span className="bg-[#e2e8f0] text-[#475569] px-2 py-0.5 rounded text-xs font-semibold">Class {student.class}</span>
                  </td>
                  <td className="p-3 text-right text-[#059669] font-semibold">NRs. {student.paid.toLocaleString()}</td>
                  <td className={`p-3 text-right font-semibold ${student.due > 0 ? 'text-[#dc2626]' : 'text-[#64748b]'}`}>
                    NRs. {student.due.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleUpdatePayment(student)}
                        className="p-1.5 bg-[#e0f2fe] text-[#0284c7] rounded hover:bg-[#bae6fd] hover:text-[#0369a1] transition-colors shadow-sm"
                        title="Record Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAddFee(student)}
                        className="p-1.5 bg-[#ffedd5] text-[#ea580c] rounded hover:bg-[#fed7aa] hover:text-[#c2410c] transition-colors shadow-sm"
                        title="Add Fine / Fee"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleNotify}
                        disabled={student.due === 0}
                        className={`p-1.5 rounded transition-colors shadow-sm ${student.due > 0 ? 'bg-[#fee2e2] text-[#dc2626] hover:bg-[#fecaca]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
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
                  <td colSpan={6} className="p-8 text-center text-[#64748b] bg-[#f8fafc]">No students found matching "{searchTerm}".</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment History Section */}
      <section className="bg-[#ffffff] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] border border-[#e5e7eb] overflow-hidden">
        <div className="p-4 border-b border-[#f3f4f6] bg-[#f8fafc] flex items-center gap-2">
          <History className="w-5 h-5 text-[#475569]" />
          <h2 className="text-[#1e293b] font-bold text-base">Recent Payment Transactions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.85rem]">
            <thead>
              <tr className="bg-[#ffffff]">
                <th className="text-left p-3 border-b border-[#e2e8f0] text-[#64748b] font-medium text-xs uppercase tracking-wider">Date</th>
                <th className="text-left p-3 border-b border-[#e2e8f0] text-[#64748b] font-medium text-xs uppercase tracking-wider">Txn ID</th>
                <th className="text-left p-3 border-b border-[#e2e8f0] text-[#64748b] font-medium text-xs uppercase tracking-wider">Student</th>
                <th className="text-left p-3 border-b border-[#e2e8f0] text-[#64748b] font-medium text-xs uppercase tracking-wider">Method</th>
                <th className="text-right p-3 border-b border-[#e2e8f0] text-[#64748b] font-medium text-xs uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {paymentHistory.map((payment) => (
                <tr key={payment.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="p-3 text-[#475569]">{payment.date}</td>
                  <td className="p-3 font-mono text-xs text-[#64748b]">{payment.id}</td>
                  <td className="p-3">
                    <span className="font-semibold text-[#334155]">{payment.studentName}</span>
                    <span className="text-[#94a3b8] ml-1 text-xs">({payment.studentId})</span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-bold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                      {payment.method}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-[#059669]">
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
