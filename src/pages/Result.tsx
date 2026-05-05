import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, Download, PieChart as PieChartIcon, Loader2, Search, User, ClipboardList } from 'lucide-react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import * as XLSX from 'xlsx';

import { ReportCardTemplate } from '../components/admin/ReportCardTemplate';
import { StudentResult } from '../data/resultsState';

const EXAM_TYPES = ['Terminal 1', 'Unit Test 1', 'Terminal 2', 'Final Exam'];

export default function Result() {
  const [studentId, setStudentId] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Terminal 1');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchStudentId, setSearchStudentId] = useState('');
  const [userRole, setUserRole] = useState('student');

  const pdfRef = useRef<HTMLDivElement>(null);

  const fetchResults = async (uid: string) => {
     setLoading(true);
     try {
         let examsSnap;
         try {
             examsSnap = await getDocs(query(collection(db, 'exams'), where('published', '==', true)));
         } catch (e: any) {
             console.error("1. Failed exams: ", e);
             throw new Error("fetching exams: " + e.message);
         }
         const publishedExamIds = new Set<string>();
         const examStats: Record<string, { highestMarks?: Record<string, number>, classAverages?: Record<string, number> }> = {};
         
         examsSnap.forEach(doc => {
            publishedExamIds.add(doc.id);
            const data = doc.data();
            examStats[doc.id] = {
               highestMarks: data.highestMarks || {},
               classAverages: data.classAverages || {}
            };
         });

         if (publishedExamIds.size === 0) {
             setResults([]);
             setLoading(false);
             return;
         }

         // 2. Fetch result summaries for user
         let summarySnap;
         try {
             summarySnap = await getDocs(query(collection(db, 'resultSummary'), where('studentId', '==', uid)));
         } catch (e: any) {
             console.error("2. Failed summarySnap: ", e);
             throw new Error("fetching summaries: " + e.message);
         }
         const summaryList: any[] = [];
         summarySnap.forEach(doc => {
             if (publishedExamIds.has(doc.data().examId)) {
                 summaryList.push({ id: doc.id, ...doc.data() });
             }
         });

         if (summaryList.length === 0) {
             setResults([]);
             setLoading(false);
             return;
         }

         // 3. Fetch subjects (results) for these summaries
         let resultsSnap;
         try {
             resultsSnap = await getDocs(query(collection(db, 'results'), where('studentId', '==', uid)));
         } catch (e: any) {
             console.error("3. Failed resultsSnap: ", e);
             throw new Error("fetching results: " + e.message);
         }
         const resultsByExamId: Record<string, any> = {};
         resultsSnap.forEach(doc => {
             const sub = doc.data();
             if (!resultsByExamId[sub.examId]) resultsByExamId[sub.examId] = {};
             resultsByExamId[sub.examId][sub.subject] = {
                 fullMarks: sub.fullMarks, obtained: sub.marks
             };
         });

         const parsedData: StudentResult[] = summaryList.map(sum => ({
              studentId: sum.studentId,
              studentName: sum.studentName,
              class: sum.class,
              rollNo: sum.rollNo || '',
              examType: sum.examType,
              examId: sum.examId,
              subjects: resultsByExamId[sum.examId] || {},
              highestMarks: examStats[sum.examId]?.highestMarks || {},
              classAverages: examStats[sum.examId]?.classAverages || {},
              total: sum.total,
              fullTotal: sum.fullTotal,
              percentage: sum.percentage,
              grade: sum.grade,
              gpa: sum.gpa || 0,
              rank: sum.rank || 0,
              published: true, // We filtered by published
              classTeacherRemark: sum.classTeacherRemark || ''
         }));

         setResults(parsedData);
         if (parsedData.length > 0) {
             setActiveTab(parsedData[parsedData.length - 1].examType);
         }
     } catch (err: any) {
         console.error("Error retrieving results:", err);
     } finally {
         setLoading(false);
     }
  };

  useEffect(() => {
    let unsubAuth = onAuthStateChanged(auth, async (user) => {
       const role = localStorage.getItem('userRole') || 'student';
       setUserRole(role);
       let uidToUse = null;
       
       if (role === 'student') {
           uidToUse = localStorage.getItem('studentId');
           if (!uidToUse && user) {
               uidToUse = user.uid; // fallback
           }
       } else {
           // Admin or teacher
           uidToUse = localStorage.getItem('adminSearchStudentId');
       }
       
       if (!uidToUse && (!user || role !== 'student')) {
            setLoading(false);
            return;
       }

       if (user && role === 'student') {
           // Ensure backfill of studentIds for the rule checks
           try {
               const uDoc = await getDoc(doc(db, 'users', user.uid));
               if (uDoc.exists()) {
                   const data = uDoc.data();
                   if (!data.studentIds && data.children && data.children.length > 0) {
                       const ids = data.children.map((c: any) => c.studentId);
                       await updateDoc(doc(db, 'users', user.uid), { studentIds: ids });
                   }
               }
           } catch {
               // ignore
           }
       }

       setStudentId(uidToUse || user?.uid || '');
       if (uidToUse) {
           await fetchResults(uidToUse);
       }
    });

    return () => {
       unsubAuth();
    };
  }, []);

  const handleAdminSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchStudentId.trim()) return;
      localStorage.setItem('adminSearchStudentId', searchStudentId.trim());
      setStudentId(searchStudentId.trim());
      fetchResults(searchStudentId.trim());
  };

  // Group results into dynamically available exam types to act as navigation
  const availableExams = useMemo(() => {
     return Array.from(new Set(results.map(r => r.examType)));
  }, [results]);

  const currentResult = results.find(r => r.examType === activeTab);

  const getGradeInfo = (obtained: number | "AB", full: number) => {
     if (obtained === "AB") return { grade: "NG", gpa: 0, pass: false, text: "Absent" };
     const pct = (obtained / full) * 100;
     if (pct >= 90) return { grade: "A+", gpa: 4.0, pass: true, text: "Outstanding" };
     if (pct >= 80) return { grade: "A", gpa: 3.6, pass: true, text: "Excellent" };
     if (pct >= 70) return { grade: "B+", gpa: 3.2, pass: true, text: "Very Good" };
     if (pct >= 60) return { grade: "B", gpa: 2.8, pass: true, text: "Good" };
     if (pct >= 50) return { grade: "C+", gpa: 2.4, pass: true, text: "Satisfactory" };
     if (pct >= 40) return { grade: "C", gpa: 2.0, pass: true, text: "Acceptable" };
     if (pct >= 35) return { grade: "D", gpa: 1.6, pass: true, text: "Basic" }; 
     return { grade: "NG", gpa: 0, pass: false, text: "Not Graded" };
  };

  const chartData = useMemo(() => {
     if (!currentResult) return [];
     return Object.entries(currentResult.subjects).map(([sub, rawMarks]) => {
         const marks: any = rawMarks;
         return {
            subject: sub,
            myMarks: marks.obtained === "AB" ? 0 : marks.obtained,
            highestMarks: currentResult.highestMarks?.[sub] || (marks.obtained === "AB" ? 0 : marks.obtained)
         };
     });
  }, [currentResult]);

  const downloadPDFReport = async () => {
      if (!pdfRef.current || !currentResult) return;
      setGeneratingPdf(true);
      
      try {
          await new Promise(r => setTimeout(r, 300));
          const canvas = await toCanvas(pdfRef.current, { pixelRatio: 2 });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${currentResult.studentName}_${currentResult.examType}_ReportCard.pdf`);
      } catch (err) {
          console.error("PDF generation failed:", err);
      } finally {
          setGeneratingPdf(false);
      }
  };

   const downloadClassResultExcel = async () => {
      if (!currentResult) return;
      try {
         const summariesSnap = await getDocs(query(collection(db, 'resultSummary'), where('examId', '==', currentResult.examId)));
         const resultsSnap = await getDocs(query(collection(db, 'results'), where('examId', '==', currentResult.examId)));
         
         const resultsByStudent: Record<string, any> = {};
         resultsSnap.forEach(doc => {
            const data = doc.data();
            if (!resultsByStudent[data.studentId]) resultsByStudent[data.studentId] = {};
            resultsByStudent[data.studentId][data.subject] = data.marks;
         });

         const excelData = summariesSnap.docs.map(doc => {
             const data = doc.data();
             return {
                 "Student ID": data.studentId,
                 "Student Name": data.studentName,
                 "Class": data.class,
                 "Total Marks": data.total,
                 "Percentage": data.percentage,
                 "GPA": data.gpa,
                 "Grade": data.grade,
                 "Rank": data.rank,
                 ...resultsByStudent[data.studentId]
             };
         });
         
         excelData.sort((a, b) => (a.Rank || 999) - (b.Rank || 999));

         const ws = XLSX.utils.json_to_sheet(excelData);
         const wb = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(wb, ws, "Class Result");
         XLSX.writeFile(wb, `${currentResult.class}_${currentResult.examType}_Results.xlsx`);
      } catch (err: any) {
         console.error("Error downloading excel", err);
         if (err.message.includes("permission")) {
             alert("Permission Denied: You must be an admin to download class results.");
         }
      }
   };

  return (
    <div className="flex flex-col gap-5 pb-20">
      {(userRole === 'admin' || userRole === 'teacher') && (
         <div className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1">
               <h3 className="font-bold text-gray-800 text-sm">Admin View: Search Result by Student ID</h3>
               <p className="text-xs text-gray-500">Student ID or Roll No is case-sensitive.</p>
            </div>
            <form onSubmit={handleAdminSearch} className="flex gap-2 w-full sm:w-auto">
               <input type="text" value={searchStudentId} onChange={(e) => setSearchStudentId(e.target.value)} placeholder="e.g. STU123" className="border border-gray-200 px-3 py-2 rounded-lg text-sm flex-1 outline-none focus:border-[#1e3a8a]" />
               <button type="submit" className="bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-800"><Search className="w-4 h-4"/> Search</button>
            </form>
         </div>
      )}
      <div className="flex flex-col gap-2 pb-2">
         {availableExams.length === 0 && !loading && (
             <span className="text-sm font-bold text-gray-400">No Exams to display</span>
         )}
         {availableExams.filter(e => e.toLowerCase().includes('terminal')).length > 0 && (
             <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase mr-2 whitespace-nowrap">Terminals:</span>
                {availableExams.filter(e => e.toLowerCase().includes('terminal')).map(exam => (
                    <button 
                      key={exam} 
                      onClick={() => setActiveTab(exam)}
                      className={`px-4 py-2 font-bold text-sm whitespace-nowrap rounded-t-lg border-b-2 transition-colors ${
                         activeTab === exam ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 
                         'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                       {exam} ✓
                    </button>
                ))}
             </div>
         )}
         {availableExams.filter(e => !e.toLowerCase().includes('terminal')).length > 0 && (
             <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase mr-2 whitespace-nowrap">Tests / Others:</span>
                {availableExams.filter(e => !e.toLowerCase().includes('terminal')).map(exam => (
                    <button 
                      key={exam} 
                      onClick={() => setActiveTab(exam)}
                      className={`px-4 py-2 font-bold text-sm whitespace-nowrap rounded-t-lg border-b-2 transition-colors ${
                         activeTab === exam ? 'border-purple-600 text-purple-600 bg-purple-50/50' : 
                         'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                       {exam} ✓
                    </button>
                ))}
             </div>
         )}
      </div>
      
      {loading ? (
           <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 max-w-2xl mx-auto mt-8 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="font-bold text-gray-500">Checking for results...</p>
           </div>
      ) : !currentResult ? (
          <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-sm border border-gray-100 max-w-2xl mx-auto mt-8">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <ClipboardList className="w-10 h-10 text-gray-400" />
             </div>
             <h3 className="text-xl font-black text-gray-900 mb-2">No results published yet.</h3>
             <p className="text-gray-500 max-w-md mx-auto">
                Check back after your exam results are announced. Admin must publish the results before they appear here.
             </p>
          </div>
      ) : (
          <>
            {/* RESULT SUMMARY CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
               <div className="flex-1 text-center md:text-left w-full">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{currentResult.examType} | Class {currentResult.class}</p>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">{currentResult.studentName}</h2>
                  <p className="text-sm font-bold text-gray-500 mt-2">Rank: 🏆 {currentResult.rank} </p>
               </div>
               
               <div className="flex flex-wrap justify-center gap-4 w-full md:w-auto">
                  <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 text-center flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Total</p>
                     <p className="text-2xl font-black text-blue-700">{currentResult.total}<span className="text-sm text-blue-400">/{currentResult.fullTotal}</span></p>
                  </div>
                  <div className="bg-purple-50 px-5 py-3 rounded-2xl border border-purple-100 text-center flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Percentage</p>
                     <p className="text-2xl font-black text-purple-700">{currentResult.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 text-center flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Grade</p>
                     <p className="text-2xl font-black text-emerald-600">{currentResult.grade}</p>
                  </div>
                  <div className="bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 text-center flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">GPA</p>
                     <p className="text-2xl font-black text-amber-600">
                        {(() => {
                             const subjects = Object.values(currentResult.subjects) as any[];
                             if (subjects.length === 0) return '0.0';
                             const totalGpa = subjects.reduce((acc, marks) => acc + getGradeInfo(marks.obtained, marks.fullMarks).gpa, 0);
                             return (totalGpa / subjects.length).toFixed(1);
                        })()}
                     </p>
                  </div>
               </div>
            </div>

            {/* SUBJECT TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-4 font-black text-gray-600">Subject</th>
                        <th className="p-4 font-black text-gray-600 text-center">Full Marks</th>
                        <th className="p-4 font-black text-gray-600 text-center">Obtained</th>
                        <th className="p-4 font-black text-gray-600 text-center">Grade</th>
                        <th className="p-4 font-black text-gray-600 text-center">GPA</th>
                        <th className="p-4 font-black text-gray-600">Pass/Fail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(currentResult.subjects).map(([subject, rawMarks]) => {
                         const marks: any = rawMarks;
                         const { grade, pass, gpa } = getGradeInfo(marks.obtained, marks.fullMarks);
                         return (
                            <tr key={subject} className="hover:bg-blue-50/20">
                              <td className="p-4 font-bold text-gray-800">{subject}</td>
                              <td className="p-4 text-center text-gray-500 font-medium">{marks.fullMarks}</td>
                              <td className="p-4 text-center font-black text-gray-900">{marks.obtained}</td>
                              <td className="p-4 text-center">
                                 <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    grade.includes('A') ? 'bg-green-100 text-green-700' :
                                    grade.includes('B') ? 'bg-blue-100 text-blue-700' :
                                    grade.includes('C') ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                 }`}>
                                    {grade}
                                 </span>
                              </td>
                              <td className="p-4 text-center font-bold text-gray-800">{gpa.toFixed(1)}</td>
                              <td className="p-4 font-bold">
                                 {pass ? <span className="text-green-600">✅ Pass</span> : <span className="text-red-600">❌ Fail</span>}
                              </td>
                            </tr>
                         );
                      })}
                      <tr className="bg-gray-50 font-black text-gray-900 border-t-2 border-gray-200">
                         <td className="p-4 uppercase">TOTAL</td>
                         <td className="p-4 text-center">{currentResult.fullTotal}</td>
                         <td className="p-4 text-center">{currentResult.total}</td>
                         <td className="p-4 text-center">{currentResult.grade}</td>
                         <td className="p-4 text-center text-[#1e3a8a]">{(() => {
                             const subjects = Object.values(currentResult.subjects) as any[];
                             if (subjects.length === 0) return '0.0';
                             const totalGpa = subjects.reduce((acc, marks) => acc + getGradeInfo(marks.obtained, marks.fullMarks).gpa, 0);
                             return (totalGpa / subjects.length).toFixed(1);
                         })()}</td>
                         <td className="p-4">{currentResult.percentage >= 40 ? 'PASSED ✅' : 'FAILED ❌'}</td>
                      </tr>
                    </tbody>
                  </table>
               </div>
            </div>

            {/* PERFORMANCE BAR CHART */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
               <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-indigo-500" /> 
                  My Performance
               </h3>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height={256}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="subject" tick={{fontSize: 10}} interval={0} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} />
                      <Legend wrapperStyle={{fontSize: '12px', fontWeight: 'bold', paddingTop: '10px'}} />
                      <Bar dataKey="myMarks" name="My Marks" fill="#3b82f6" radius={[4,4,0,0]} />
                      <Bar dataKey="highestMarks" name="Rank 1's Marks" fill="#cbd5e1" radius={[4,4,0,0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end mt-2 gap-3">
               {localStorage.getItem('userRole') !== 'student' && (
                 <button onClick={downloadClassResultExcel} className="text-gray-700 bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 hover:bg-gray-50">
                   <Download className="w-5 h-5 text-green-600" />
                   Download Class Result (Excel)
                 </button>
               )}
               <button onClick={downloadPDFReport} disabled={generatingPdf} className={`text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${generatingPdf ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                 {generatingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                 {generatingPdf ? 'Generating...' : '📄 Download My Report Card'}
               </button>
            </div>
          </>
      )}

      {/* Hidden Print Container for PDF */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
         {currentResult && (
            <ReportCardTemplate 
               ref={pdfRef} 
               student={currentResult} 
            />
         )}
      </div>
    </div>
  );
}
