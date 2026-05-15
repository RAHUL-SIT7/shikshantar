import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, doc, writeBatch, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Search, Loader2, Download, Printer, Plus, X, Receipt, Zap, BookOpen, Banknote, Bell, FileText } from 'lucide-react';
import { formatBSDate, getBSYearMonthDate } from '../../lib/nepaliDate';

const MONTHS = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

export default function SimpleStudentLedgerTab({ students, onRefresh }: { students: any[], onRefresh: () => void }) {
    const [viewMode, setViewMode] = useState<'quick'|'advanced'|'cash'>('quick');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Payment Modal State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [paymentMode, setPaymentMode] = useState<'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually' | 'Custom'>('Monthly');
    const [customMonthsCount, setCustomMonthsCount] = useState<number>(1);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [monthlyFeeBase, setMonthlyFeeBase] = useState<string>('');
    const [additionalFees, setAdditionalFees] = useState<{ id: string, type: string, amount: string, customName?: string }[]>([]);
    const [discount, setDiscount] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [recentTxs, setRecentTxs] = useState<any[]>([]);
    const [fetchingTxs, setFetchingTxs] = useState(false);

    const getMaxMonths = (mode: string, customCount?: number) => {
        switch (mode) {
            case 'Monthly': return 1;
            case 'Quarterly': return 3;
            case 'Semi-Annually': return 6;
            case 'Annually': return 12;
            case 'Custom': return customCount || customMonthsCount;
            default: return 1;
        }
    };

    const getAutoMonths = (startIdx: number, mode: string, customCount?: number) => {
        const count = getMaxMonths(mode, customCount);
        const auto = [];
        for (let i = 0; i < count; i++) {
            auto.push(MONTHS[(startIdx + i) % 12]);
        }
        return auto;
    };

    const toggleMonth = (m: string) => {
        if (selectedMonths.includes(m)) {
            setSelectedMonths(selectedMonths.filter(x => x !== m));
        } else {
            if (selectedMonths.length < getMaxMonths(paymentMode)) {
                setSelectedMonths([...selectedMonths, m]);
            }
        }
    };

    const addAdditionalFee = () => {
        setAdditionalFees([...additionalFees, { id: Date.now().toString(), type: 'Exam Fee', amount: '' }]);
    };

    const updateAdditionalFee = (id: string, key: string, value: string) => {
        setAdditionalFees(additionalFees.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const removeAdditionalFee = (id: string) => {
        setAdditionalFees(additionalFees.filter(f => f.id !== id));
    };

    const getRealisticLedgerRows = (s: any) => {
        const records: any[] = [];
        const currentMonthIdx = getBSYearMonthDate().month;
        const baseFee = Number(s?.monthlyFee || 0);
        const feesList = s?.fees || [];

        // 1. Process explicit records
        feesList.forEach((f: any) => {
            if (f.status === 'paid' || f.status === 'due') {
                records.push({...f, isImplicit: false});
            }
        });

        // 2. Add implicit dues
        if (baseFee > 0) {
            for (let i = 0; i <= currentMonthIdx; i++) {
                const m = MONTHS[i];
                const hasTuitionRecord = feesList.some((f: any) => 
                    (f.month === m || f.month === m.replace('Baisakh', 'Baishak').replace('Asar', 'Ashad').replace('Ashwin', 'Ashoj')) 
                    && ((f.type === 'Tuition Fee' && (f.status === 'paid' || f.status === 'due')) || f.status === 'paid' || f.status === 'due')
                );
                
                if (!hasTuitionRecord) {
                    records.push({
                        month: m,
                        status: 'due',
                        totalFee: baseFee,
                        dueAmount: baseFee,
                        paidAmount: 0,
                        type: 'Tuition Fee',
                        isImplicit: true,
                        receiptNo: '*Auto-Calculated*'
                    });
                }
            }
        }

        return records.sort((a, b) => {
            // Give preference to month order if both are tuition
            const aIdx = MONTHS.indexOf(a.month.replace('Baishak', 'Baisakh').replace('Ashad', 'Asar').replace('Ashoj', 'Ashwin'));
            const bIdx = MONTHS.indexOf(b.month.replace('Baishak', 'Baisakh').replace('Ashad', 'Asar').replace('Ashoj', 'Ashwin'));
            
            if (aIdx !== -1 && bIdx !== -1) {
                if (aIdx === bIdx) return a.isImplicit ? 1 : -1;
                return aIdx - bIdx;
            }
            return 0;
        });
    };

    const getStudentDue = (s: any) => {
        const rows = getRealisticLedgerRows(s);
        return rows.reduce((total, row) => total + (row.status === 'due' ? Number(row.dueAmount ?? row.totalFee ?? 0) : 0), 0);
    };

    const getRecentReceipts = (s: any) => {
        const fees = s?.fees || [];
        const receipts: Record<string, { date: string, total: number, types: string[] }> = {};
        fees.forEach((f: any) => {
             if (f.receiptNo && f.receiptNo !== '*Auto-Calculated*' && f.status === 'paid') {
                 if (!receipts[f.receiptNo]) {
                     receipts[f.receiptNo] = { date: f.paidAt ? new Date(f.paidAt).toLocaleDateString() : 'Recent', total: 0, types: [] };
                 }
                 receipts[f.receiptNo].total += Number(f.paidAmount || 0);
                 if (!receipts[f.receiptNo].types.includes(f.type || 'Fee')) {
                     receipts[f.receiptNo].types.push(f.type || 'Fee');
                 }
             }
        });
        const arr = Object.entries(receipts).map(([no, data]) => ({ no, ...data }));
        arr.reverse(); // Simplified sort, Assuming natural chronological insertion or sequential receipt numbers
        return arr.slice(0, 3);
    };

    const grandTotal = Math.max(0, (Number(monthlyFeeBase) * getMaxMonths(paymentMode)) + additionalFees.reduce((sum, f) => sum + Number(f.amount || 0), 0) - Number(discount || 0));
    
    // Filtered students
    const filteredStudents = students.filter(s => {
        const matchClass = selectedClass ? s.class === selectedClass : true;
        const matchSearch = searchTerm ? String(s.name).toLowerCase().includes(searchTerm.toLowerCase()) || String(s.rollNumber || '').includes(searchTerm) : true;
        return matchClass && matchSearch;
    }).sort((a, b) => Number(a.rollNumber || 0) - Number(b.rollNumber || 0));

    const handlePayClick = (student: any) => {
        setErrorMessage('');
        setSuccessMessage('');
        setSelectedStudent(student);
        setMonthlyFeeBase(student.monthlyFee?.toString() || '0');
        setPaymentMode('Monthly');
        setSelectedMonths([MONTHS[getBSYearMonthDate().month]]);
        setAdditionalFees([]);
    };

    const printReceipt = (student: any, receiptNo: string, date: string, total: number, breakdown: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let rows = '';
        breakdown.months.forEach((m: string) => {
            rows += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">Tuition Fee - ${m}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">NRs. ${breakdown.tuition.toLocaleString()}</td>
                </tr>
            `;
        });

        breakdown.additional.forEach((f: any) => {
            rows += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${f.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">NRs. ${f.amount.toLocaleString()}</td>
                </tr>
            `;
        });

        if (breakdown.discount > 0) {
            rows += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">Discount / Scholarship</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: red;">- NRs. ${breakdown.discount.toLocaleString()}</td>
                </tr>
            `;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Receipt - ${receiptNo}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; }
                    .receipt-container { max-width: 600px; margin: 40px auto; padding: 40px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .school-name { font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                    .school-addr { font-size: 14px; color: #666; margin: 5px 0 0; }
                    .receipt-title { font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; text-decoration: underline; text-underline-offset: 4px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; font-size: 14px; }
                    .info-item span { font-weight: bold; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background-color: #f9fafb; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; padding: 12px 10px; text-align: left; border-bottom: 2px solid #ddd; }
                    .total-row { font-weight: bold; font-size: 18px; }
                    .total-row td { border-top: 2px solid #333; padding-top: 15px; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px;}
                    .signature { border-top: 1px solid #333; padding-top: 5px; width: 200px; text-align: center; }
                </style>
            </head>
            <body onload="window.print();">
                <div class="receipt-container">
                    <div class="header">
                        <h1 class="school-name">SHIKSHANTAR ACADEMY</h1>
                        <p class="school-addr">Siraha, Nepal | Phone: 021-512345</p>
                    </div>
                    <div class="receipt-title">FEE RECEIPT</div>
                    
                    <div class="info-grid">
                        <div class="info-item"><span>Receipt No:</span> ${receiptNo}</div>
                        <div class="info-item" style="text-align: right;"><span>Date:</span> ${date}</div>
                        <div class="info-item"><span>Student Name:</span> ${student.name}</div>
                        <div class="info-item" style="text-align: right;"><span>Class:</span> ${student.class}</div>
                        <div class="info-item"><span>Roll No:</span> ${student.rollNumber || '-'}</div>
                        <div class="info-item" style="text-align: right;"><span>Payment Mode:</span> ${breakdown.mode}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount (NRs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                            <tr class="total-row">
                                <td>Grand Total</td>
                                <td style="text-align: right;">NRs. ${total.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="footer">
                        <div>
                            <p style="margin:0; font-size:12px; color:#666;">Generated via Admin System</p>
                        </div>
                        <div class="signature">Authorized Signature</div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleProcessPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');
        
        if (!selectedStudent || selectedMonths.length !== getMaxMonths(paymentMode)) {
            setErrorMessage(`Please select exactly ${getMaxMonths(paymentMode)} month(s) for ${paymentMode} mode.`);
            return;
        }
        if (grandTotal <= 0) {
            setErrorMessage("Total amount must be greater than 0");
            return;
        }
        setProcessing(true);

        try {
            const batch = writeBatch(db);
            const receiptNo = `RCP-${getBSYearMonthDate().year}-${Date.now().toString().slice(-4)}`;
            const bsDate = formatBSDate(new Date());

            const breakdown = {
                tuition: Number(monthlyFeeBase),
                mode: paymentMode,
                months: selectedMonths,
                additional: additionalFees.map(f => ({
                    name: f.type === 'Other' ? (f.customName || 'Other') : f.type,
                    amount: Number(f.amount || 0)
                })),
                discount: Number(discount || 0)
            };

            // 1. Transaction
            const txRef = doc(collection(db, 'transactions'));
            batch.set(txRef, {
                date: bsDate,
                receipt: receiptNo,
                studentId: selectedStudent.id,
                studentName: selectedStudent.name,
                class: selectedStudent.class,
                amount: grandTotal,
                method: 'Cash',
                collectedBy: 'Admin',
                status: 'SUCCESS',
                months: selectedMonths,
                breakdown: breakdown,
                discount: Number(discount || 0),
                remarks: `Fee payment (${paymentMode})`,
                timestamp: serverTimestamp()
            });

            // 2. Student Fee Record for each tuition month
            for (const month of selectedMonths) {
                const feeId = `${selectedStudent.id}_tuition_${month}`;
                const feeRef = doc(db, 'studentFees', feeId);
                batch.set(feeRef, {
                    studentId: selectedStudent.id,
                    month: month,
                    type: 'Tuition Fee',
                    totalFee: Number(monthlyFeeBase),
                    paidAmount: Number(monthlyFeeBase),
                    dueAmount: 0,
                    status: 'paid',
                    transactionId: txRef.id,
                    receiptNo: receiptNo,
                    paidAt: new Date().toISOString()
                }, { merge: true });
            }
            
            // 3. Student Fee Record for additional fees
            for (const [idx, fee] of breakdown.additional.entries()) {
                const feeId = `${selectedStudent.id}_addl_${Date.now()}_${idx}`;
                const feeRef = doc(db, 'studentFees', feeId);
                batch.set(feeRef, {
                    studentId: selectedStudent.id,
                    month: fee.name, // Displayed as month name in ledger to reuse existing table cleanly
                    type: 'Additional Fee',
                    totalFee: fee.amount,
                    paidAmount: fee.amount,
                    dueAmount: 0,
                    status: 'paid',
                    transactionId: txRef.id,
                    receiptNo: receiptNo,
                    paidAt: new Date().toISOString()
                }, { merge: true });
            }

            await batch.commit();

            setSuccessMessage('Fee updated successfully in ledger and transaction history!');
            printReceipt(selectedStudent, receiptNo, bsDate, grandTotal, breakdown);
            
            setTimeout(() => {
                setSelectedStudent(null);
                if (onRefresh) onRefresh();
            }, 1500);

        } catch (err: any) {
            console.error('Payment Error:', err);
            setErrorMessage('Failed to process payment');
        }
        setProcessing(false);
    };

    const printStatement = (s: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const allRows = getRealisticLedgerRows(s);
        let tableRows = '';
        let totalPaid = 0;
        let totalDue = 0;

        allRows.forEach((f: any, idx: number) => {
            const paidAmt = Number(f.paidAmount || (f.status === 'paid' ? f.totalFee : 0) || 0);
            const dueAmt = Number(f.dueAmount !== undefined ? f.dueAmount : (f.status === 'due' ? f.totalFee : 0));
            totalPaid += paidAmt;
            totalDue += dueAmt;

            tableRows += `
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">${idx + 1}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${f.month} ${f.type && f.type !== 'Tuition Fee' ? `(${f.type})` : ''}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${paidAmt}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${dueAmt}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${f.status}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${f.receiptNo || '-'}</td>
                </tr>
            `;
        });

        printWindow.document.write(`
            <html>
            <head><title>Statement - ${s.name}</title></head>
            <body onload="window.print();window.close();" style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="text-align: center;">Fee Statement</h2>
                <p><strong>Name:</strong> ${s.name} &nbsp;&nbsp; <strong>Class:</strong> ${s.class} &nbsp;&nbsp; <strong>Roll:</strong> ${s.rollNumber || '-'}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="border: 1px solid #000; padding: 6px;">SN</th>
                            <th style="border: 1px solid #000; padding: 6px;">Month</th>
                            <th style="border: 1px solid #000; padding: 6px;">Paid</th>
                            <th style="border: 1px solid #000; padding: 6px;">Due</th>
                            <th style="border: 1px solid #000; padding: 6px;">Status</th>
                            <th style="border: 1px solid #000; padding: 6px;">Receipt</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows || '<tr><td colspan="6" style="text-align:center;">No Records</td></tr>'}</tbody>
                </table>
                <p style="text-align: right; margin-top: 20px;"><strong>Total Paid:</strong> NRs. ${totalPaid}</p>
                <p style="text-align: right;"><strong>Total Due:</strong> NRs. ${totalDue}</p>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="animate-in fade-in space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* LEFT PANEL : Class Selection & Student List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
                        <select 
                            value={selectedClass} 
                            onChange={e => {
                                setSelectedClass(e.target.value);
                                setSelectedStudent(null);
                                setExpandedStudent(null);
                            }}
                            className="w-full sm:w-auto bg-blue-50 text-blue-800 font-bold border border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                                <option value="">-- Choose Class --</option>
                                {['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(c => (
                                    <option key={c} value={c}>Class {c}</option>
                                ))}
                            </select>

                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search student by name or roll..."
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setSelectedStudent(null);
                                setExpandedStudent(null);
                            }}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                                <th className="p-4 px-6">Roll No</th>
                                <th className="p-4">Actual Name</th>
                                <th className="p-4">Class</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                <React.Fragment key={student.id}>
                                <tr className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-4 px-6 font-bold text-gray-700">{student.rollNumber || '-'}</td>
                                    <td className="p-4 font-bold text-gray-900">{student.name}</td>
                                    <td className="p-4 font-bold text-gray-600">Class {student.class}</td>
                                     <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2 items-center">
                                            <button 
                                                onClick={() => handlePayClick(student)}
                                                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                                                title="Quick Pay Fee"
                                            >
                                                <Zap className="w-3.5 h-3.5 hidden xl:block" /> Pay Fee
                                            </button>
                                            <button 
                                                onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                                                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                                                title="View Ledger"
                                            >
                                                <FileText className="w-3.5 h-3.5 hidden xl:block" /> Ledger
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); 
                                                const rows = getRealisticLedgerRows(student);
                                                const unpaidMonths = rows.filter((r: any) => r.status === 'due').map((r: any) => r.month);
                                                window.open(`https://wa.me/977${student.guardianPhone}?text=${encodeURIComponent(`Namaste ${student.guardianName} ji, SHIKSHANTAR ACADEMY Siraha bata suchit garinchhau ki ${student.name} (Class ${student.class}) ko ${unpaidMonths.length > 0 ? unpaidMonths.join(', ') + ' mahina ko ' : ''}fee NRs. ${getStudentDue(student)} baki chha. Kripaya school aaera tirna anurodh chha. Dhanyabad.`)}`, '_blank');
                                            }} className="bg-white text-gray-700 hover:text-primary border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm min-w-[80px] justify-center" title="Send WhatsApp Reminder">
                                              <Bell className="w-3.5 h-3.5 hidden xl:block" /> Remind
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedStudent === student.id && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={4} className="p-6 border-b border-gray-100">
                                            <div className="mb-4 flex justify-between items-center">
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600"/> Ledger Statement</h4>
                                                <button onClick={() => printStatement(student)} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm flex items-center gap-2 font-bold text-gray-700 hover:text-blue-600 transition-colors">
                                                    <Printer className="w-3.5 h-3.5" /> Print
                                                </button>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-sm max-w-4xl mx-auto shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                                        <tr>
                                                            <th className="p-3 pl-4">Month/Fee Type</th>
                                                            <th className="p-3">Status</th>
                                                            <th className="p-3 text-right">Paid</th>
                                                            <th className="p-3 text-right">Due</th>
                                                            <th className="p-3 pl-4 font-normal">Receipt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {(() => {
                                                            const allRows = getRealisticLedgerRows(student);
                                                            if (allRows.length === 0) return <tr><td colSpan={5} className="p-6 text-center text-gray-400 font-bold">No records found.</td></tr>;
                                                            return allRows.map((f: any, idx: number) => {
                                                                const isDue = f.status === 'due';
                                                                return (
                                                                    <tr key={idx} className={isDue ? 'bg-red-50/30' : (f.isImplicit ? 'bg-orange-50/20' : '')}>
                                                                        <td className="p-3 pl-4 font-bold text-gray-800 flex items-center gap-2">
                                                                            {f.month} {f.type !== 'Tuition Fee' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{f.type}</span>}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isDue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                                {f.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3 text-right font-bold text-emerald-700">NRs. {f.paidAmount || (f.status === 'paid' ? f.totalFee : 0) || 0}</td>
                                                                        <td className="p-3 text-right font-bold text-red-600">NRs. {f.dueAmount !== undefined ? f.dueAmount : (isDue ? f.totalFee : 0)}</td>
                                                                        <td className="p-3 pl-4 text-xs text-gray-500 font-mono italic">{f.receiptNo || '-'}</td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400 font-bold text-sm">
                                        {selectedClass ? 'No students found in this class' : 'Please select a class to view students'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT PANEL : Payment Form Modal-like view */}
            <div className="lg:col-span-1">
                {selectedStudent ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6 sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-emerald-100">
                            <h3 className="text-lg font-black text-emerald-800 uppercase tracking-tight">Record Payment</h3>
                            <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors" title="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-6 bg-emerald-50 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <p className="text-xs uppercase font-bold text-emerald-600 mb-1">Paying For</p>
                                <p className="font-black text-gray-900">{selectedStudent.name}</p>
                                <p className="text-sm font-bold text-gray-500">Class {selectedStudent.class} | Roll: {selectedStudent.rollNumber || '-'}</p>
                            </div>
                            <div className="text-right border-l border-emerald-200 pl-4 ml-4">
                                <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Total Due</p>
                                <p className="font-black text-red-600 text-lg">NRs. {getStudentDue(selectedStudent).toLocaleString()}</p>
                            </div>
                        </div>

                        {getRecentReceipts(selectedStudent).length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-2">Recent Transactions</h4>
                                <div className="space-y-2">
                                    {getRecentReceipts(selectedStudent).map((rec, idx) => (
                                        <div key={idx} className="bg-white border text-xs border-gray-100 p-2.5 rounded-lg flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-bold text-gray-800">{rec.no}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{rec.date} &bull; {rec.types.join(', ')}</p>
                                            </div>
                                            <p className="font-black text-emerald-600">NRs. {rec.total.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleProcessPayment} className="space-y-4">
                            {errorMessage && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">⚠️</span>
                                    <span>{errorMessage}</span>
                                </div>
                            )}
                            {successMessage && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">✅</span>
                                    <span>{successMessage}</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Payment Mode</label>
                                <select 
                                    value={paymentMode} 
                                    onChange={e => {
                                        const mode = e.target.value as any;
                                        setPaymentMode(mode);
                                        const startIdx = getBSYearMonthDate().month;
                                        setSelectedMonths(getAutoMonths(startIdx, mode));
                                    }}
                                    className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none font-bold text-gray-700 mb-4"
                                >
                                    <option value="Monthly">Monthly (1 Month)</option>
                                    <option value="Quarterly">Quarterly (3 Months)</option>
                                    <option value="Semi-Annually">Semi-Annually (6 Months)</option>
                                    <option value="Annually">Annually (12 Months)</option>
                                    <option value="Custom">Custom (Select Months)</option>
                                </select>
                                
                                {paymentMode === 'Custom' && (
                                    <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Number of Months</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="12" 
                                            value={customMonthsCount} 
                                            onChange={e => {
                                                const val = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                                                setCustomMonthsCount(val);
                                                const startIdx = getBSYearMonthDate().month;
                                                // Adjust selectedMonths length based on new val
                                                const autoMonths = getAutoMonths(startIdx, 'Custom', val);
                                                setSelectedMonths(autoMonths);
                                            }}
                                            className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none font-bold text-gray-700" 
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Months ({selectedMonths.length}/{getMaxMonths(paymentMode)})</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {MONTHS.map(m => {
                                        const isSelected = selectedMonths.includes(m);
                                        const isDisabled = !isSelected && selectedMonths.length >= getMaxMonths(paymentMode);
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => toggleMonth(m)}
                                                className={`py-2 px-1 text-xs font-bold rounded-lg transition-colors border ${isSelected ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {m}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Base Tuition (Monthly)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">NRs.</span>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="any"
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                        value={monthlyFeeBase} 
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setMonthlyFeeBase(val >= 0 ? e.target.value : '0');
                                        }}
                                        className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-xl pl-12 pr-4 py-3 outline-none font-black text-lg text-emerald-700 bg-white"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1.5 ml-1 text-right">
                                    Total Tuition: NRs. {(Number(monthlyFeeBase) * getMaxMonths(paymentMode)).toLocaleString()}
                                </p>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Additional Fees</label>
                                    <button type="button" onClick={addAdditionalFee} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded-md transition-colors"><Plus className="w-3 h-3 mr-1"/> Add</button>
                                </div>
                                <div className="space-y-3">
                                    {additionalFees.map(fee => (
                                        <div key={fee.id} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-2">
                                                <select
                                                    value={fee.type}
                                                    onChange={e => updateAdditionalFee(fee.id, 'type', e.target.value)}
                                                    className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-lg px-2 py-2 outline-none font-bold text-gray-700 text-xs"
                                                >
                                                    <option value="Exam Fee">Exam Fee</option>
                                                    <option value="Computer Fee">Computer Fee</option>
                                                    <option value="Annual Fee">Annual Fee</option>
                                                    <option value="Science Lab Fee">Science Lab Fee</option>
                                                    <option value="Late Fine">Late Fine</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                {fee.type === 'Other' && (
                                                    <input
                                                        type="text"
                                                        placeholder="Specify fee name"
                                                        value={fee.customName || ''}
                                                        onChange={e => updateAdditionalFee(fee.id, 'customName', e.target.value)}
                                                        className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-lg px-2 py-1.5 outline-none font-bold text-gray-700 text-xs"
                                                    />
                                                )}
                                            </div>
                                            <div className="w-24 relative shrink-0">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                    placeholder="Amount"
                                                    value={fee.amount}
                                                    onChange={e => {
                                                        const val = Number(e.target.value);
                                                        updateAdditionalFee(fee.id, 'amount', val >= 0 ? e.target.value : '0');
                                                    }}
                                                    className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-lg px-2 py-2 outline-none font-bold text-gray-700 text-xs"
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeAdditionalFee(fee.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg mt-0.5 transition-colors"><X className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                    {additionalFees.length === 0 && <p className="text-xs text-gray-400 font-medium italic">No additional fees added.</p>}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Discount / Scholarship</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">NRs.</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="any"
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                        value={discount} 
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setDiscount(val >= 0 ? e.target.value : '0');
                                        }}
                                        className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl pl-12 pr-4 py-3 outline-none font-black text-lg text-red-600 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center shadow-inner">
                                <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Grand Total</span>
                                <span className="text-2xl font-black text-emerald-700">NRs. {grandTotal.toLocaleString()}</span>
                            </div>

                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-700 transition flex justify-center items-center gap-2 mt-4 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirm & Pay'}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">Receipt and Transaction History will auto-update</p>
                        </form>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center sticky top-6 shadow-sm">
                        <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">👉</span>
                        </div>
                        <h4 className="font-bold text-gray-800 mb-2">No Student Selected</h4>
                        <p className="text-sm text-gray-500">First select a class, then click "Pay Fee" next to a student's name to process their payment here.</p>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
