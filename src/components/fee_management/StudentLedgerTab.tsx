
import React, { useState } from 'react';
import { Search, Printer, AlertCircle } from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

const ACADEMIC_YEARS_BS_OPTIONS = ['All Years', '2083-2084', '2082-2083', '2081-2082', '2080-2079'];

const ALL_CLASSES = [
  { label: 'Nursery', value: 'Nursery' },
  { label: 'LKG', value: 'LKG' },
  { label: 'UKG', value: 'UKG' },
  ...Array.from({ length: 10 }, (_, i) => ({
    label: `Class ${i + 1}`,
    value: String(i + 1)
  }))
];

const MONTH_RANK: Record<string, number> = {
  'baishak': 1, 'baisakh': 1,
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

const FEE_STRUCTURE_BY_CLASS: Record<string, any> = {
  'Nursery': { admission: 5000, tuition: 1500, annual: 3000, computer: 0, science: 0 },
  'LKG':     { admission: 5000, tuition: 1500, annual: 3000, computer: 0, science: 0 },
  'UKG':     { admission: 5000, tuition: 1500, annual: 3000, computer: 0, science: 0 },
  '1':       { admission: 6000, tuition: 1800, annual: 3500, computer: 500, science: 0 },
  '2':       { admission: 6000, tuition: 1800, annual: 3500, computer: 500, science: 0 },
  '3':       { admission: 6000, tuition: 1800, annual: 3500, computer: 500, science: 0 },
  '4':       { admission: 7000, tuition: 2000, annual: 4000, computer: 500, science: 0 },
  '5':       { admission: 7000, tuition: 2000, annual: 4000, computer: 500, science: 0 },
  '6':       { admission: 8000, tuition: 2500, annual: 5000, computer: 500, science: 0 },
  '7':       { admission: 8000, tuition: 2500, annual: 5000, computer: 500, science: 0 },
  '8':       { admission: 8000, tuition: 2500, annual: 5000, computer: 500, science: 0 },
  '9':       { admission: 9000, tuition: 3000, annual: 6000, computer: 500, science: 600 },
  '10':      { admission: 10000, tuition: 3000, annual: 6000, computer: 500, science: 600 },
};

const getMonthRank = (fee: any): number => {
  const raw = (fee.month || fee.fromMonth || '').toLowerCase();
  for (const [key, rank] of Object.entries(MONTH_RANK)) {
    if (raw.includes(key)) return rank;
  }
  return 99;
};

const printHTML = (html: string) => {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.onload = () => { win.focus(); win.print(); };
    }
};

export default function StudentLedgerTab() {
    const [reportYear, setReportYear] = useState(ACADEMIC_YEARS_BS_OPTIONS[1]);
    const [reportClass, setReportClass] = useState('1');
    const [classFeeReport, setClassFeeReport] = useState<any[]>([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const [indName, setIndName] = useState('');
    const [indRoll, setIndRoll] = useState('');
    const [indClass, setIndClass] = useState('1');
    const [indYear, setIndYear] = useState('2083-2084');
    const [individualStudent, setIndividualStudent] = useState<any>(null);
    const [groupedFees, setGroupedFees] = useState<any>({});
    const [grandTotal, setGrandTotal] = useState({ totalFee: 0, totalPaid: 0, totalDue: 0 });
    const [loadingIndividual, setLoadingIndividual] = useState(false);
    const [individualSearchError, setIndividualSearchError] = useState('');

    const [seedingProgress, setSeedingProgress] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);

    const seedAllStudentFees = async () => {
      setIsSeeding(true);
      setSeedingProgress('Fetching all users from Firestore...');

      try {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        console.log('Total users in Firestore:', allUsersSnap.docs.length);

        const students = allUsersSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(u => 
            u.role === 'student' || 
            u.role === 'Student' ||
            (u.class && u.fullName && u.role !== 'admin' && u.role !== 'teacher')
          );

        console.log('Students found:', students.length);
        students.forEach(s => 
          console.log('→', s.fullName, '| Class:', s.class, 
                      '| Roll:', s.studentId, '| ID:', s.id)
        );

        if (students.length === 0) {
          alert('No students found in Firestore. Check console for details.');
          setIsSeeding(false);
          setSeedingProgress('');
          return;
        }

        let seededCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < students.length; i++) {
          const student = students[i];
          setSeedingProgress(
            `Processing ${i + 1}/${students.length}: ${student.fullName}...`
          );

          const existingSnap = await getDocs(
            query(
              collection(db, 'studentFees'),
              where('studentId', '==', student.id),
              where('academicYear', '==', '2083-2084')
            )
          );

          if (!existingSnap.empty) {
            console.log('Skipping (already has data):', student.fullName);
            skippedCount++;
            continue;
          }

          const rawClass = String(student.class || '').trim();
          const classKey = rawClass
            .replace(/^class\s*/i, '')
            .trim();

          const fees = FEE_STRUCTURE_BY_CLASS[classKey] || 
                       FEE_STRUCTURE_BY_CLASS['5'];
          
          const roll = Number(student.studentId || student.rollNo || 1);
          
          const isGoodPayer    = roll % 3 === 1;
          const isMediumPayer  = roll % 3 === 2;
          const isDefaulter    = roll % 3 === 0;

          const feeRecords: any[] = [
            {
              feeType: 'Admission Fee',
              amount: fees.admission,
              status: 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Baishak 2082',
              paidDate: '2082-01-05',
            },
            {
              feeType: 'Monthly Tuition Fee',
              amount: fees.tuition * 3,
              status: 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Ashad 2082',
              paidDate: '2082-03-30',
            },
            {
              feeType: 'Monthly Tuition Fee',
              amount: fees.tuition * 4,
              status: isDefaulter ? 'due' : 'paid',
              month: 'Shrawan',
              fromMonth: 'Shrawan 2082',
              toMonth: 'Kartik 2082',
              ...((!isDefaulter) && { paidDate: '2082-07-15' }),
            },
            {
              feeType: 'Monthly Tuition Fee',
              amount: fees.tuition * 4,
              status: isGoodPayer ? 'paid' : 'due',
              month: 'Mangsir',
              fromMonth: 'Mangsir 2082',
              toMonth: 'Chaitra 2082',
              ...(isGoodPayer && { paidDate: '2082-11-10' }),
            },
            {
              feeType: 'Annual Charges',
              amount: fees.annual,
              status: isDefaulter ? 'due' : 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Chaitra 2082',
              ...((!isDefaulter) && { paidDate: '2082-01-10' }),
            },
            {
              feeType: 'Exam Fee - First Term',
              amount: 800,
              status: isDefaulter ? 'due' : 'paid',
              month: 'Ashoj',
              fromMonth: 'Ashoj 2082',
              toMonth: 'Ashoj 2082',
              ...((!isDefaulter) && { paidDate: '2082-06-20' }),
            },
            {
              feeType: 'Exam Fee - Second Term',
              amount: 800,
              status: isGoodPayer ? 'paid' : 'due',
              month: 'Falgun',
              fromMonth: 'Falgun 2082',
              toMonth: 'Falgun 2082',
            },
            {
              feeType: 'Diary Fee',
              amount: 150,
              status: 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Baishak 2082',
              paidDate: '2082-01-05',
            },
            {
              feeType: 'ID Card Fee',
              amount: 100,
              status: 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Baishak 2082',
              paidDate: '2082-01-05',
            },
            {
              feeType: 'Sports Fee',
              amount: 500,
              status: roll % 2 === 0 ? 'due' : 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Chaitra 2082',
            },
            {
              feeType: 'Transportation Fee',
              amount: 1000,
              status: roll % 4 === 0 ? 'due' : 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Chaitra 2082',
            },
          ];

          if (fees.computer > 0) {
            feeRecords.push({
              feeType: 'Computer Lab Fee',
              amount: fees.computer,
              status: isDefaulter ? 'due' : 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Chaitra 2082',
              ...((!isDefaulter) && { paidDate: '2082-01-15' }),
            });
          }

          if (fees.science > 0) {
            feeRecords.push({
              feeType: 'Science Lab Fee',
              amount: fees.science,
              status: roll % 2 === 0 ? 'due' : 'paid',
              month: 'Baishak',
              fromMonth: 'Baishak 2082',
              toMonth: 'Chaitra 2082',
            });
          }

          const batch = writeBatch(db);
          feeRecords.forEach(record => {
            const ref = doc(collection(db, 'studentFees'));
            batch.set(ref, {
              ...record,
              studentId: student.id,
              academicYear: '2083-2084',
              class: rawClass,
            });
          });

          await batch.commit();
          console.log('✅ Seeded:', student.fullName, '|', 
                      feeRecords.length, 'records');
          seededCount++;
        }

        setSeedingProgress('');
        setIsSeeding(false);
        alert(
          `✅ Seeding Complete!\n` +
          `✔ Added fee data for: ${seededCount} students\n` +
          `⏭ Skipped (already had data): ${skippedCount} students`
        );

      } catch (err: any) {
        console.error('❌ Seeding error:', err);
        setSeedingProgress('');
        setIsSeeding(false);
        alert('❌ Error: ' + (err.message || 'Check console for details'));
      }
    };

    const handleClassFeeSearch = async () => {
        setLoadingReport(true);
        setClassFeeReport([]);
        try {
            const q = query(collection(db, 'users'), where('class', '==', reportClass), where('role', '==', 'student'));
            const querySnapshot = await getDocs(q);
            let students = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => Number(a.studentId) - Number(b.studentId));

            const reportData = await Promise.all(students.map(async (student) => {
                const feesQ = query(collection(db, 'studentFees'), where('studentId', '==', student.id), where('academicYear', '==', reportYear));
                const feesSnap = await getDocs(feesQ);
                const fees = feesSnap.docs.map(doc => doc.data());
                
                const totalFee = fees.reduce((acc, f) => acc + (f.amount || 0), 0);
                const paid = fees.filter(f => f.status === 'paid').reduce((acc, f) => acc + (f.amount || 0), 0);
                const due = totalFee - paid;

                return {
                    id: student.id,
                    rollNo: student.studentId || 'N/A',
                    name: student.fullName,
                    guardianName: student.guardianName || student.fatherName || student.parentName || "N/A",
                    phone: student.phone || student.guardianPhone || 'N/A',
                    totalFee, paid, due,
                    status: due > 0 ? 'DUE' : 'PAID'
                };
            }));
            setClassFeeReport(reportData);
        } catch (error) {
            console.error("Error fetching class fee report:", error);
        } finally {
            setLoadingReport(false);
        }
    };

    const processFeeData = (fees: any[]) => {
        const grouped: { [key: string]: { fees: any[], subtotal: any } } = {};
        let grandTotal = { totalFee: 0, totalPaid: 0, totalDue: 0 };

        fees.forEach(fee => {
            const year = fee.academicYear || 'Uncategorized';
            if (!grouped[year]) {
                grouped[year] = { fees: [], subtotal: { totalFee: 0, totalPaid: 0, totalDue: 0 } };
            }
            grouped[year].fees.push(fee);
        });

        Object.keys(grouped).sort().forEach(year => {
            grouped[year].fees.sort((a, b) => getMonthRank(a) - getMonthRank(b));

            const yearFees = grouped[year].fees;
            const totalFee = yearFees.reduce((acc, f) => acc + f.amount, 0);
            const totalPaid = yearFees.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
            const totalDue = totalFee - totalPaid;
            grouped[year].subtotal = { totalFee, totalPaid, totalDue };
            grandTotal.totalFee += totalFee;
            grandTotal.totalPaid += totalPaid;
            grandTotal.totalDue += totalDue;
        });

        return { grouped, grandTotal };
    };

    const handleIndividualSearch = async () => {
        setLoadingIndividual(true);
        setIndividualStudent(null);
        setGroupedFees({});
        setGrandTotal({ totalFee: 0, totalPaid: 0, totalDue: 0 });
        setIndividualSearchError('');

        try {
            if (!indRoll.trim() && !indName.trim()) {
                setIndividualSearchError("Please enter a student name or roll number.");
                setLoadingIndividual(false);
                return;
            }

            const usersRef = collection(db, 'users');
            const classQuery = query(usersRef, where('class', '==', indClass), where('role', '==', 'student'));
            const querySnapshot = await getDocs(classQuery);
            const allClassStudents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const searchName = indName.trim().toLowerCase();
            const searchRoll = indRoll.trim();

            const matchedStudent = allClassStudents.find(s => 
                (searchName ? (s.fullName && s.fullName.trim().toLowerCase() === searchName) : true) &&
                (searchRoll ? (s.studentId && String(s.studentId).trim() === searchRoll) : true)
            );

            if (matchedStudent) {
                setIndividualStudent(matchedStudent);
                
                const feesBaseQuery = collection(db, 'studentFees');
                const feesQuery = indYear === 'All Years'
                    ? query(feesBaseQuery, where('studentId', '==', matchedStudent.id))
                    : query(feesBaseQuery, where('studentId', '==', matchedStudent.id), where('academicYear', '==', indYear));

                const feesSnap = await getDocs(feesQuery);
                const fees = feesSnap.docs.map(doc => doc.data());

                const { grouped, grandTotal } = processFeeData(fees);
                setGroupedFees(grouped);
                setGrandTotal(grandTotal);

            } else {
                setIndividualSearchError("No student found. Please check the details and try again.");
            }
        } catch (error) {
            console.error("Error fetching individual student fees:", error);
            setIndividualSearchError("An error occurred during search.");
        } finally {
            setLoadingIndividual(false);
        }
    };
    
    const generateYearSectionsHTML = () => {
        return Object.keys(groupedFees).sort().map(year => {
            const yearData = groupedFees[year];
            const feeRows = yearData.fees.map((fee:any) => `
                <tr>
                    <td>${fee.month || fee.fromMonth || ''}</td>
                    <td>${fee.feeType}</td>
                    <td>${fee.fromMonth || fee.month}</td>
                    <td>${fee.toMonth || fee.month}</td>
                    <td style="text-align:right;">${fee.amount.toLocaleString()}</td>
                    <td style="text-align:center;"><span class="${fee.status === 'paid' ? 'badge-paid' : 'badge-due'}">${fee.status.toUpperCase()}</span></td>
                </tr>
            `).join('');

            return `
                <div class="year-section">
                    <h3 class="year-title">Academic Year: ${year}</h3>
                    <table>
                        <thead><tr><th>Month</th><th>Fee Type</th><th>From</th><th>To</th><th style="text-align:right;">Amount</th><th style="text-align:center;">Status</th></tr></thead>
                        <tbody>${feeRows}</tbody>
                    </table>
                    <div class="year-summary">
                        <div><strong>Year Total:</strong> NRs. ${yearData.subtotal.totalFee.toLocaleString()}</div>
                        <div class="paid"><strong>Paid:</strong> NRs. ${yearData.subtotal.totalPaid.toLocaleString()}</div>
                        <div class="due"><strong>Due:</strong> NRs. ${yearData.subtotal.totalDue.toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    };

    const handlePrintComplete = () => {
        if (!individualStudent) return;
        const { totalFee: grandTotalFee, totalPaid: grandTotalPaid, totalDue: grandTotalDue } = grandTotal;
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Fee History - ${individualStudent.fullName}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                .school-header { text-align: center; border-bottom: 3px solid #1E3A5F; padding-bottom: 15px; margin-bottom: 20px; }
                .school-name { font-size: 24px; font-weight: bold; color: #1E3A5F; }
                .school-sub { font-size: 13px; color: #555; }
                .report-title { font-size: 18px; font-weight: bold; text-align: center; margin: 10px 0; letter-spacing: 2px; }
                .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 20px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
                .student-info p { margin: 3px 0; }
                .year-section { margin-bottom: 25px; }
                .year-title { background: #1E3A5F; color: white; padding: 8px 12px; font-weight: bold; font-size: 14px; margin-bottom: 0; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #f0f4f8; padding: 8px 6px; text-align: left; border: 1px solid #ccc; font-weight: bold; }
                td { padding: 7px 6px; border: 1px solid #ddd; }
                tr:nth-child(even) { background: #f9f9f9; }
                .paid { color: #16a34a; font-weight: bold; }
                .due { color: #dc2626; font-weight: bold; }
                .badge-paid { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
                .badge-due { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
                .year-summary { text-align: right; padding: 10px 12px; border: 1px solid #ddd; border-top: none; font-size: 13px; background: #f9f9f9; }
                .year-summary div { padding: 2px 0; }
                .grand-total { margin-top: 20px; border: 2px solid #1E3A5F; padding: 15px; border-radius: 6px; }
                .grand-total h3 { color: #1E3A5F; margin: 0 0 10px 0; font-size: 16px; text-align:center; }
                .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; font-weight: bold; }
                .footer-note { text-align: center; margin-top: 20px; padding: 10px; background: #fff8e1; border: 1px solid #f59e0b; border-radius: 6px; font-size: 13px; color: #92400e; }
                @media print { @page { size: A4; margin: 15mm; } body{-webkit-print-color-adjust: exact;} }
              </style>
            </head>
            <body>
              <div class="school-header">
                <div class="school-name">SHIKSHANTAR ACADEMY</div>
                <div class="school-sub">Karjanha Municipality, Ward No. 05, Siraha, Madhesh Province, Nepal</div>
                <div class="school-sub">Phone: 034-XXXXXX | Est. 2065 B.S.</div>
              </div>
              <div class="report-title">★ FEE PAYMENT HISTORY ★</div>
              <div class="student-info">
                <p><strong>Student Name:</strong> ${individualStudent.fullName}</p>
                <p><strong>Roll No:</strong> ${individualStudent.studentId}</p>
                <p><strong>Class:</strong> ${individualStudent.class}</p>
                <p><strong>Guardian:</strong> ${individualStudent.guardianName || individualStudent.fatherName || 'N/A'}</p>
                <p><strong>Phone:</strong> ${individualStudent.phone || individualStudent.guardianPhone || 'N/A'}</p>
                <p><strong>Print Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              ${generateYearSectionsHTML()}
              <div class="grand-total">
                <h3>GRAND TOTAL SUMMARY</h3>
                <div class="total-row"><span>Total Fee:</span><span>NRs. ${grandTotalFee.toLocaleString()}</span></div>
                <div class="total-row paid"><span>Total Paid:</span><span>NRs. ${grandTotalPaid.toLocaleString()}</span></div>
                <div class="total-row due"><span>Total Due:</span><span>NRs. ${grandTotalDue.toLocaleString()}</span></div>
              </div>
              <div class="footer-note">
                ⚠️ Please pay all outstanding dues as soon as possible.<br>
                Thank you for your cooperation. — Shikshantar Academy Administration
              </div>
            </body>
            </html>
        `;
        printHTML(printContent);
    };

    const handlePrintClassReport = () => {
        const rows = classFeeReport.map(s => `
            <tr>
              <td>${s.rollNo}</td>
              <td><strong>${s.name}</strong></td>
              <td>${s.guardianName || 'N/A'}</td>
              <td>${s.phone || 'N/A'}</td>
              <td style="text-align:right">NRs. ${s.totalFee.toLocaleString()}</td>
              <td style="text-align:right" class="paid">NRs. ${s.paid.toLocaleString()}</td>
              <td style="text-align:right" class="due">NRs. ${s.due.toLocaleString()}</td>
              <td style="text-align:center"><span class="${s.status === 'PAID' ? 'badge-paid' : 'badge-due'}">${s.status}</span></td>
            </tr>
        `).join('');
        
        const content = `<!DOCTYPE html><html><head><title>Class Fee Report</title>
          <style>
            body{font-family:Arial,sans-serif;padding:20px;}
            .header{text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:15px;margin-bottom:20px;}
            .school-name{font-size:22px;font-weight:bold;color:#1E3A5F;}
            table{width:100%;border-collapse:collapse;font-size:12px;}
            th{background:#1E3A5F;color:white;padding:8px;text-align:left;border:1px solid #ccc;}
            td{padding:7px;border:1px solid #ddd;}
            tr:nth-child(even){background:#f9f9f9;}
            .paid{color:#16a34a;font-weight:bold;}
            .due{color:#dc2626;font-weight:bold;}
            .badge-paid{background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;}
            .badge-due{background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;}
            @media print{@page{size:A4 landscape;margin:10mm;} body{-webkit-print-color-adjust: exact;}}
          </style></head><body>
          <div class="header">
            <div class="school-name">SHIKSHANTAR ACADEMY</div>
            <div>Siraha, Madhesh Province, Nepal</div>
            <div style="margin-top:8px;font-weight:bold;">CLASS FEE REPORT — Class ${reportClass} | Academic Year: ${reportYear}</div>
          </div>
          <table>
            <thead><tr>
              <th>Roll No</th><th>Name</th><th>Guardian</th><th>Phone</th>
              <th>Total Fee</th><th>Paid</th><th>Due</th><th>Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          </body></html>`;
        
        printHTML(content);
    };
    
    const handlePrintBill = async (studentDocId: string, year: string) => {
        try {
            const studentSnap = await getDoc(doc(db, 'users', studentDocId));
            if (!studentSnap.exists()) return;
            const student = { id: studentSnap.id, ...studentSnap.data() } as any;

            const feesSnap = await getDocs(
              query(collection(db, 'studentFees'),
                where('studentId', '==', studentDocId),
                where('academicYear', '==', year)
              )
            );
            let fees = feesSnap.docs.map(d => d.data() as any);
            
            fees.sort((a, b) => getMonthRank(a) - getMonthRank(b));

            const totalFee = fees.reduce((s, f) => s + (f.amount || 0), 0);
            const totalPaid = fees.filter(f => f.status === 'paid')
                                  .reduce((s, f) => s + (f.amount || 0), 0);
            const totalDue = totalFee - totalPaid;

            const rows = fees.map(f => `
              <tr>
                <td>${f.month || f.fromMonth || ''}</td>
                <td><strong>${f.feeType || 'Tuition'}</strong></td>
                <td>${f.fromMonth || ''}</td>
                <td>${f.toMonth || ''}</td>
                <td style="text-align:right">NRs. ${(f.amount||0).toLocaleString()}</td>
                <td style="text-align:right;color:#16a34a">
                  NRs. ${f.status==='paid'?(f.amount||0).toLocaleString():'0'}</td>
                <td style="text-align:right;color:#dc2626">
                  NRs. ${f.status==='due'?(f.amount||0).toLocaleString():'0'}</td>
                <td style="text-align:center">
                  <span style="padding:2px 8px;border-radius:10px;font-size:11px;
                    font-weight:bold;background:${f.status==='paid'?'#dcfce7':'#fee2e2'};
                    color:${f.status==='paid'?'#16a34a':'#dc2626'}">
                    ${f.status?.toUpperCase()}
                  </span>
                </td>
              </tr>
            `).join('');

            const html = `<!DOCTYPE html><html><head>
              <title>Fee Bill - ${student.fullName}</title>
              <style>
                body{font-family:Arial,sans-serif;padding:25px;color:#000;}
                .header{text-align:center;border-bottom:3px solid #1E3A5F;
                  padding-bottom:15px;margin-bottom:20px;}
                .school-name{font-size:22px;font-weight:bold;color:#1E3A5F;}
                .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;
                  margin-bottom:20px;padding:12px;border:1px solid #ddd;
                  border-radius:6px;font-size:13px;}
                table{width:100%;border-collapse:collapse;font-size:12px;}
                th{background:#1E3A5F;color:white;padding:8px;
                  text-align:left;border:1px solid #ccc;}
                td{padding:7px;border:1px solid #ddd;}
                tr:nth-child(even){background:#f9f9f9;}
                .summary{margin-top:15px;text-align:right;font-size:13px;}
                .footer{text-align:center;margin-top:20px;padding:10px;
                  background:#fff8e1;border:1px solid #f59e0b;
                  border-radius:6px;font-size:12px;color:#92400e;}
                @media print{@page{size:A4;margin:12mm;} body{-webkit-print-color-adjust: exact;}}
              </style>
            </head><body>
              <div class="header">
                <div class="school-name">SHIKSHANTAR ACADEMY</div>
                <div style="font-size:12px;color:#555">
                  Karjanha Municipality, Ward No. 05, Siraha, Madhesh Province, Nepal
                </div>
                <div style="margin-top:6px;font-weight:bold;font-size:14px">
                  FEE BILL — Academic Year: ${year}
                </div>
              </div>
              <div class="info-grid">
                <p><strong>Student Name:</strong> ${student.fullName}</p>
                <p><strong>Roll No:</strong> ${student.studentId}</p>
                <p><strong>Class:</strong> ${student.class}</p>
                <p><strong>Guardian:</strong> 
                  ${student.guardianName||student.fatherName||'N/A'}</p>
                <p><strong>Phone:</strong> 
                  ${student.phone||student.guardianPhone||'N/A'}</p>
                <p><strong>Print Date:</strong> 
                  ${new Date().toLocaleDateString('en-NP')}</p>
              </div>
              <table>
                <thead><tr>
                  <th>Month</th><th>Fee Type</th><th>From</th><th>To</th>
                  <th>Amount</th><th>Paid</th><th>Due</th><th>Status</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="summary">
                <p><strong>Total Fee:</strong> NRs. ${totalFee.toLocaleString()}</p>
                <p style="color:#16a34a"><strong>Total Paid:</strong> 
                  NRs. ${totalPaid.toLocaleString()}</p>
                <p style="color:#dc2626"><strong>Total Due:</strong> 
                  NRs. ${totalDue.toLocaleString()}</p>
              </div>
              <div class="footer">
                ⚠️ Please pay all outstanding dues as soon as possible.<br>
                Thank you for your cooperation. — Shikshantar Academy Administration
              </div>
            </body></html>`;

            printHTML(html);
        } catch (err) {
            console.error('Print bill error:', err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[#1E3A5F]">Class Fee Report</h3>
                    {classFeeReport.length > 0 && 
                        <button onClick={handlePrintClassReport} className="bg-gray-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm">
                            <Printer size={16} /> Print Class Report
                        </button>}
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                    <select value={reportYear} onChange={e => setReportYear(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none w-full md:w-auto">
                        {ACADEMIC_YEARS_BS_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select value={reportClass} onChange={e => setReportClass(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none w-full md:w-auto">
                         {ALL_CLASSES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                    <button onClick={handleClassFeeSearch} disabled={loadingReport} className="bg-[#1E3A5F] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition-colors w-full md:w-auto">
                        {loadingReport ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {classFeeReport.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#1E3A5F] text-white">
                                <tr>
                                    <th className="p-3">Roll No</th><th className="p-3">Name</th><th className="p-3">Guardian</th><th className="p-3">Phone</th>
                                    <th className="p-3 text-right">Total Fee</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Due</th>
                                    <th className="p-3 text-center">Status</th><th className="p-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {classFeeReport.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-xs">{s.rollNo}</td>
                                        <td className="p-3 font-bold">{s.name}</td>
                                        <td className="p-3">{s.guardianName}</td>
                                        <td className="p-3">{s.phone}</td>
                                        <td className="p-3 text-right">{s.totalFee.toLocaleString()}</td>
                                        <td className="p-3 text-right text-green-600">{s.paid.toLocaleString()}</td>
                                        <td className="p-3 text-right text-red-600 font-bold">{s.due.toLocaleString()}</td>
                                        <td className="p-3 text-center"><span className={`px-2 py-1 text-xs font-bold rounded-full ${s.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                                        <td className="p-3 text-center"><button onClick={() => handlePrintBill(s.id, reportYear)} className="p-1 text-gray-500 hover:text-blue-600"><Printer size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between mt-4">
              <div>
                <p className="font-bold text-orange-700">🧪 Test Data Seeder</p>
                <p className="text-sm text-orange-600">Add sample fee data for all students (skips existing data).</p>
                {seedingProgress && (
                  <p className="text-xs text-orange-500 mt-1 animate-pulse">
                    ⏳ {seedingProgress}
                  </p>
                )}
              </div>
              <button
                onClick={seedAllStudentFees}
                disabled={isSeeding}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all"
              >
                {isSeeding ? '⏳ Seeding...' : '🌱 Seed All Student Fees'}
              </button>
            </div>

            {/* SECTION 2 — Individual Student Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mt-8">
                <h3 className="text-lg font-bold text-[#1E3A5F] mb-4">Individual Student Fee Ledger</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center mb-4">
                    <input type="text" placeholder="Student Name" value={indName} onChange={e => setIndName(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
                    <input type="text" placeholder="Roll Number" value={indRoll} onChange={e => setIndRoll(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
                    <select value={indClass} onChange={e => setIndClass(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none">
                        {ALL_CLASSES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                    <select value={indYear} onChange={e => setIndYear(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none">
                        {ACADEMIC_YEARS_BS_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <button onClick={handleIndividualSearch} disabled={loadingIndividual} className="bg-[#1E3A5F] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition-colors w-full lg:col-span-1">
                        <Search size={16} className="inline mr-2"/> {loadingIndividual ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {individualSearchError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {individualSearchError}
                    </div>
                )}

                {individualStudent && (
                    <div className="mt-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                                <p className="text-sm"><span className="font-bold text-gray-600">Name:</span> {individualStudent.fullName}</p>
                                <p className="text-sm"><span className="font-bold text-gray-600">Roll No:</span> {individualStudent.studentId}</p>
                                <p className="text-sm"><span className="font-bold text-gray-600">Class:</span> {individualStudent.class}</p>
                                <p className="text-sm"><span className="font-bold text-gray-600">Guardian:</span> {individualStudent.guardianName || individualStudent.fatherName || individualStudent.parentName || "N/A"}</p>
                                <p className="text-sm"><span className="font-bold text-gray-600">Phone:</span> {individualStudent.phone || individualStudent.guardianPhone || 'N/A'}</p>
                                {individualStudent.admissionDate && <p className="text-sm"><span className="font-bold text-gray-600">Admission:</span> {individualStudent.admissionDate}</p>}
                           </div>
                        </div>

                        {Object.keys(groupedFees).length > 0 ? (
                            Object.keys(groupedFees).sort().map(year => (
                                <div key={year} className="mb-6 p-4 border rounded-lg shadow-sm">
                                    <h4 className="text-md font-bold text-gray-800 border-b pb-2 mb-3">Academic Year: {year}</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-600">
                                                <tr>
                                                    <th className="p-2">Month</th><th className="p-2">Fee Type</th><th className="p-2">From</th><th className="p-2">To</th>
                                                    <th className="p-2 text-right">Amount</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Due</th><th className="p-2 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {groupedFees[year].fees.map((fee:any, i:number) => (
                                                    <tr key={i} className="hover:bg-gray-50/50">
                                                        <td className="p-2">{fee.month}</td>
                                                        <td className="p-2 font-semibold">{fee.feeType}</td>
                                                        <td className="p-2 text-xs">{fee.fromMonth || fee.month}</td>
                                                        <td className="p-2 text-xs">{fee.toMonth || fee.month}</td>
                                                        <td className="p-2 text-right">{fee.amount.toLocaleString()}</td>
                                                        <td className="p-2 text-right text-green-600">{fee.status === 'paid' ? fee.amount.toLocaleString() : 0}</td>
                                                        <td className="p-2 text-right text-red-600">{fee.status === 'due' ? fee.amount.toLocaleString() : 0}</td>
                                                        <td className="p-2 text-center"><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${fee.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{fee.status.toUpperCase()}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <div className="w-full md:w-1/3 text-sm space-y-1 bg-gray-50 p-2 rounded-md">
                                            <div className="flex justify-between"><span>Year Total:</span><span>{groupedFees[year].subtotal.totalFee.toLocaleString()}</span></div>
                                            <div className="flex justify-between text-green-600"><span>Paid:</span><span>{groupedFees[year].subtotal.totalPaid.toLocaleString()}</span></div>
                                            <div className="flex justify-between font-bold text-red-600"><span>Due:</span><span>{groupedFees[year].subtotal.totalDue.toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">No fee records found for the selected criteria.</p>
                        )}
                        
                        {Object.keys(groupedFees).length > 0 && (
                            <div className="mt-6 pt-6 border-t-2 border-dashed">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="w-full md:w-auto">
                                        <button onClick={handlePrintComplete} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                                            <Printer size={18} /> Print Complete History
                                        </button>
                                    </div>
                                    <div className="w-full md:w-1/2 lg:w-1/3 text-right font-bold text-base space-y-2 bg-gray-100 p-4 rounded-lg">
                                        <div className="flex justify-between"><span>Grand Total Fee:</span><span>NRs. {grandTotal.totalFee.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-green-700"><span>Grand Total Paid:</span><span>NRs. {grandTotal.totalPaid.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-red-700 text-lg"><span>Grand Total Due:</span><span>NRs. {grandTotal.totalDue.toLocaleString()}</span></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
