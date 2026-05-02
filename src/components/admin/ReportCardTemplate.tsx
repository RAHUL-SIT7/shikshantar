import React, { forwardRef } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';

interface ReportCardProps {
  student: any;
}

export const ReportCardTemplate = forwardRef<HTMLDivElement, ReportCardProps>(
  ({ student }, ref) => {
    
    return (
      <div ref={ref} className="bg-white p-10 w-[210mm] h-[297mm] mx-auto text-black font-sans relative" style={{boxSizing: 'border-box'}}>
         {/* Border */}
         <div className="absolute inset-8 border-4 border-[#1e3a8a]"></div>
         <div className="absolute inset-9 border border-[#1e3a8a]"></div>

         <div className="relative z-10 p-6 flex flex-col h-full">
            {/* Header */}
            <div className="text-center mb-6">
                {/* Simulated Logo Space */}
                <div className="w-24 h-24 bg-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold tracking-widest border-4 border-yellow-500 shadow-md">
                   LOGO
                </div>
                <h1 className="text-4xl font-extrabold text-[#1e3a8a] uppercase tracking-wide">Shikshantar Academy</h1>
                <p className="text-sm font-semibold tracking-widest text-gray-700 mt-1">BASTIPUR-5, SIRAHA, MADHESH PROVINCE</p>
                <div className="mt-4 bg-[#1e3a8a] text-white py-1 px-8 inline-block rounded-full uppercase tracking-wider font-bold shadow-sm">
                   Academic Year: 2083-2084 B.S.
                </div>
                <h2 className="text-2xl font-bold mt-4 underline decoration-2 underline-offset-4 text-gray-800">{student.examType} Report Card</h2>
            </div>

            {/* Student Info */}
            <div className="flex justify-between items-end border-b-2 border-gray-300 pb-4 mb-6 px-4">
                <div className="space-y-2">
                   <p><span className="font-bold text-gray-600 uppercase text-sm">Student Name:</span> <span className="text-lg font-bold uppercase ml-2">{student.studentName}</span></p>
                   <p><span className="font-bold text-gray-600 uppercase text-sm">Class:</span> <span className="text-lg font-bold ml-2">{student.class}</span></p>
                </div>
                <div className="space-y-2 text-right">
                   <p><span className="font-bold text-gray-600 uppercase text-sm">Roll / ID:</span> <span className="text-lg font-bold ml-2">{student.rollNo} / {student.studentId}</span></p>
                   <p><span className="font-bold text-gray-600 uppercase text-sm">Attendance:</span> <span className="text-lg font-bold ml-2">95%</span></p>
                </div>
            </div>

            {/* Marks Table */}
            <table className="w-full border-collapse mb-8">
               <thead>
                  <tr className="bg-[#1e3a8a] text-white">
                     <th className="border border-gray-400 p-3 text-left uppercase text-sm">Subject</th>
                     <th className="border border-gray-400 p-3 text-center uppercase text-sm w-24">Full Marks</th>
                     <th className="border border-gray-400 p-3 text-center uppercase text-sm w-24">Obtained</th>
                     <th className="border border-gray-400 p-3 text-center uppercase text-sm w-24">Grade</th>
                     <th className="border border-gray-400 p-3 text-center uppercase text-sm w-24">GPA</th>
                  </tr>
               </thead>
               <tbody className="bg-white text-gray-800 font-medium">
                  {Object.entries(student.subjects).map(([sub, rawMarks]) => {
                      const marks: any = rawMarks;
                      const fm = marks.fullMarks;
                      const displayOm = marks.obtained;
                      let grade = 'AB';
                      let gpa = 0;
                      if (displayOm !== 'AB') {
                         const pct = (displayOm / fm) * 100;
                         if (pct >= 90) { grade = 'A+'; gpa = 4.0; }
                         else if (pct >= 80) { grade = 'A'; gpa = 3.6; }
                         else if (pct >= 70) { grade = 'B+'; gpa = 3.2; }
                         else if (pct >= 60) { grade = 'B'; gpa = 2.8; }
                         else if (pct >= 50) { grade = 'C+'; gpa = 2.4; }
                         else if (pct >= 40) { grade = 'C'; gpa = 2.0; }
                         else if (pct >= 35) { grade = 'D'; gpa = 1.6; }
                         else { grade = 'NG'; gpa = 0; }
                      }

                      return (
                         <tr key={sub}>
                            <td className="border border-gray-400 p-3 uppercase">{sub}</td>
                            <td className="border border-gray-400 p-3 text-center text-gray-600 font-bold">{fm}</td>
                            <td className="border border-gray-400 p-3 text-center font-bold text-lg">{displayOm}</td>
                            <td className="border border-gray-400 p-3 text-center font-bold text-lg">{grade}</td>
                            <td className="border border-gray-400 p-3 text-center font-bold text-lg">{gpa.toFixed(1)}</td>
                         </tr>
                      );
                  })}
                  <tr className="bg-gray-100 font-black">
                     <td className="border border-gray-400 p-3 uppercase">TOTAL</td>
                     <td className="border border-gray-400 p-3 text-center">{student.fullTotal}</td>
                     <td className="border border-gray-400 p-3 text-center">{student.total}</td>
                     <td className="border border-gray-400 p-3 text-center">{student.grade}</td>
                     <td className="border border-gray-400 p-3 text-center">
                        {(() => {
                           const subjects = Object.values(student.subjects) as any[];
                           if (subjects.length === 0) return '0.0';
                           const totalGpa = subjects.reduce((acc, marks) => {
                               const fm = marks.fullMarks;
                               const displayOm = marks.obtained;
                               let subGpa = 0;
                               if (displayOm !== 'AB') {
                                   const pct = (displayOm / fm) * 100;
                                   if (pct >= 90) { subGpa = 4.0; }
                                   else if (pct >= 80) { subGpa = 3.6; }
                                   else if (pct >= 70) { subGpa = 3.2; }
                                   else if (pct >= 60) { subGpa = 2.8; }
                                   else if (pct >= 50) { subGpa = 2.4; }
                                   else if (pct >= 40) { subGpa = 2.0; }
                                   else if (pct >= 35) { subGpa = 1.6; }
                               }
                               return acc + subGpa;
                           }, 0);
                           return (totalGpa / subjects.length).toFixed(1);
                        })()}
                     </td>
                  </tr>
               </tbody>
            </table>

            {/* Aggregates */}
            <div className="flex gap-4 mb-8">
               <div className="flex-1 bg-gray-100 p-4 border border-gray-300 flex items-center justify-between">
                  <span className="uppercase font-bold text-gray-600">Total Marks</span>
                  <span className="text-2xl font-black">{student.total} / {student.fullTotal}</span>
               </div>
               <div className="flex-1 bg-gray-100 p-4 border border-gray-300 flex items-center justify-between">
                  <span className="uppercase font-bold text-gray-600">Percentage</span>
                  <span className="text-2xl font-black">{student.percentage.toFixed(2)}%</span>
               </div>
               <div className="flex-1 bg-gray-100 p-4 border border-gray-300 flex items-center justify-between">
                  <span className="uppercase font-bold text-gray-600">Class Rank</span>
                  <span className="text-2xl font-black">{student.rank || 'TBD'}</span>
               </div>
            </div>

            <div className="mb-auto">
               <h3 className="font-bold text-gray-600 uppercase mb-2">Class Teacher Remarks</h3>
               <div className="border border-gray-400 p-4 min-h-[80px] bg-gray-50 italic text-gray-700">
                  {student.classTeacherRemark}
               </div>
            </div>

            {/* Footer Signatures */}
            <div className="flex justify-between items-end mt-12 px-8">
               <div className="text-center">
                  <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
                  <p className="font-bold uppercase text-sm tracking-widest text-gray-600">Class Teacher</p>
               </div>
               <div className="text-center">
                  <div className="w-48 border-b-2 border-gray-800 mb-2 relative flex justify-center items-end">
                     <span className="font-[cursive] text-3xl text-blue-900 absolute -bottom-1">S. Bhattarai</span>
                  </div>
                  <p className="font-bold uppercase text-sm tracking-widest text-gray-600">Principal</p>
               </div>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-8">Generated on {formatBSDate(new Date())}</p>
         </div>
      </div>
    );
  }
);
