import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Result() {
  const [showNotification, setShowNotification] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;

    const unsub = onSnapshot(doc(db, 'school_data', 'results'), (docSnap) => {
      if (docSnap.exists()) {
        const parsedResults = docSnap.data().records || [];
        // Find student by StudentId (case-insensitive)
        const found = parsedResults.find((r: any) => 
          String(r.StudentId).toLowerCase() === String(studentId).toLowerCase()
        );
        if (found) {
          setStudentData(found);
        } else {
          setStudentData(null);
        }
      } else {
        setStudentData(null);
      }
    }, (error) => {
      console.error("Firebase read error:", error);
    });

    return () => unsub();
  }, []);

  const handleNotify = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  // Helper to calculate grade
  const getGrade = (marks: number, fullMarks: number) => {
    const percentage = (marks / fullMarks) * 100;
    if (percentage >= 90) return { grade: 'A+', remark: 'Outstanding' };
    if (percentage >= 80) return { grade: 'A', remark: 'Excellent' };
    if (percentage >= 70) return { grade: 'B+', remark: 'Very Good' };
    if (percentage >= 60) return { grade: 'B', remark: 'Good' };
    if (percentage >= 50) return { grade: 'C+', remark: 'Satisfactory' };
    if (percentage >= 40) return { grade: 'C', remark: 'Acceptable' };
    return { grade: 'D', remark: 'Needs Improvement' };
  };

  // Default subjects if not specified in Excel
  const subjectsList = ['Mathematics', 'Science', 'Nepali', 'English', 'Social Studies'];

  return (
    <div className="grid grid-cols-1 gap-5">
      {showNotification && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-3 rounded-lg text-sm flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4" />
          Notification sent to guardian successfully.
        </div>
      )}

      <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] print:shadow-none print:border-none print:p-0">
        {/* Printable Header (Hidden on screen, visible on print) */}
        <div className="hidden print:block text-center mb-8 border-b-2 border-[#1e3a8a] pb-4">
          <h1 className="text-3xl font-bold text-[#1e3a8a] uppercase tracking-wider">Shikshantar Academy</h1>
          <p className="text-sm text-gray-600 mt-1">Bastipur-5, Siraha, Madhesh Province, Nepal</p>
          <p className="text-sm text-gray-600">Estd: 2072 B.S.</p>
          <h2 className="text-xl font-bold mt-4 underline">Academic Marksheet</h2>
          <p className="text-md mt-1 font-semibold">Second Terminal Examination 2081</p>
        </div>

        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center print:hidden">
          <span>Latest Exam: Second Terminal 2081</span>
          {studentData && <span className="text-[#10b981]">Rank: {studentData.Rank || 'N/A'}</span>}
        </div>
        
        {!studentData ? (
          <div className="text-center py-10 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] print:hidden">
            <AlertCircle className="w-8 h-8 text-[#6b7280] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#1f2937]">No Results Found</h3>
            <p className="text-xs text-[#6b7280] mt-1">
              Results have not been published yet for your Student ID, or the school admin has not uploaded them.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-x-8 gap-y-2 text-sm border p-4 rounded-lg bg-[#f9fafb] print:bg-transparent print:border-none print:p-0">
              <div className="w-full sm:w-auto"><span className="text-[#6b7280] print:text-black">Student Name:</span> <span className="font-bold text-lg uppercase ml-2">{studentData.Name}</span></div>
              <div className="w-full sm:w-auto"><span className="text-[#6b7280] print:text-black">Class:</span> <span className="font-bold ml-2">{studentData.Class}</span></div>
              <div className="w-full sm:w-auto"><span className="text-[#6b7280] print:text-black">Student ID:</span> <span className="font-bold ml-2">{studentData.StudentId}</span></div>
              <div className="w-full sm:w-auto hidden print:block"><span className="text-[#6b7280] print:text-black">Rank:</span> <span className="font-bold ml-2">{studentData.Rank || 'N/A'}</span></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.85rem] print:text-sm">
                <thead>
                  <tr className="bg-[#f3f4f6] print:bg-gray-200">
                    <th className="text-left p-3 border border-[#e5e7eb] print:border-gray-400 text-[#1f2937] font-bold">Subject</th>
                    <th className="text-center p-3 border border-[#e5e7eb] print:border-gray-400 text-[#1f2937] font-bold">Full Marks</th>
                    <th className="text-center p-3 border border-[#e5e7eb] print:border-gray-400 text-[#1f2937] font-bold">Obtained Marks</th>
                    <th className="text-center p-3 border border-[#e5e7eb] print:border-gray-400 text-[#1f2937] font-bold">Grade</th>
                    <th className="text-left p-3 border border-[#e5e7eb] print:border-gray-400 text-[#1f2937] font-bold">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsList.map((subject) => {
                    const marks = studentData[subject];
                    if (marks === undefined) return null;
                    
                    const numMarks = Number(marks);
                    const { grade, remark } = getGrade(numMarks, 100);
                    
                    return (
                      <tr key={subject}>
                        <td className="p-3 border border-[#e5e7eb] print:border-gray-400 font-medium">{subject}</td>
                        <td className="p-3 border border-[#e5e7eb] print:border-gray-400 text-center">100</td>
                        <td className="p-3 border border-[#e5e7eb] print:border-gray-400 text-center font-bold">{marks}</td>
                        <td className={`p-3 border border-[#e5e7eb] print:border-gray-400 text-center font-bold ${grade.includes('A') ? 'text-[#10b981] print:text-black' : 'text-[#0369a1] print:text-black'}`}>
                          {grade}
                        </td>
                        <td className="p-3 border border-[#e5e7eb] print:border-gray-400">{remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Printable Footer (Signatures) */}
            <div className="hidden print:flex justify-between mt-24 px-10">
              <div className="text-center">
                <div className="w-40 border-b border-black mb-2"></div>
                <p className="font-bold">Class Teacher</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-black mb-2 flex justify-center items-end h-12">
                  {/* Simulated Signature */}
                  <span className="font-[cursive] text-2xl text-blue-800 -mb-2">Pappu Jha</span>
                </div>
                <p className="font-bold">Principal</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 print:hidden">
              <button 
                onClick={handleNotify}
                className="bg-[#f3f4f6] text-[#1f2937] border border-[#e5e7eb] px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Notify Guardian
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-[#1e3a8a] text-white border-none px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:bg-[#1e3a8a]/90 transition-colors"
              >
                Download Official Marksheet
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
