import React, { forwardRef } from 'react';
import { formatBSDate } from '../../lib/nepaliDate';

interface ReportCardProps {
  student: any;
}

export const ReportCardTemplate = forwardRef<HTMLDivElement, ReportCardProps>(
  ({ student }, ref) => {
    
    const percentage = student.percentage || 0;
    
    let behaviorGrade = "B";
    let autoRemark = "";

    if (percentage >= 90) {
       behaviorGrade = "A+";
       autoRemark = "Outstanding performance. Keep it up!";
    } else if (percentage >= 80) {
       behaviorGrade = "A";
       autoRemark = "Excellent effort. Keep up the good work.";
    } else if (percentage >= 70) {
       behaviorGrade = "B+";
       autoRemark = "Very good. You are capable of achieving even more.";
    } else if (percentage >= 60) {
       behaviorGrade = "B";
       autoRemark = "Good. Try to focus more and improve your grades.";
    } else if (percentage >= 50) {
       behaviorGrade = "C+";
       autoRemark = "Above satisfactory, but needs more focus and hard work.";
    } else if (percentage >= 40) {
       behaviorGrade = "C";
       autoRemark = "Acceptable. Need significant improvement in studies. Try your best.";
    } else {
       behaviorGrade = "D";
       autoRemark = "Poor performance. Requires special attention and hard work. Do well.";
    }

    const behaviorTraits = [
       { name: 'i. CONDUCT', grade: behaviorGrade },
       { name: 'ii. DISCIPLINE & MANNERISM', grade: behaviorGrade },
       { name: 'iii. NEATNESS', grade: behaviorGrade },
       { name: 'iv. APPLICATION IN STUDIES', grade: percentage >= 70 ? 'A' : (percentage >= 50 ? 'B' : 'C') },
       { name: 'v. GAMES & SPORTS', grade: 'B+' },
       { name: 'vi. HAND WRITING', grade: percentage >= 60 ? 'A' : 'B' },
       { name: 'vii. SPEAKING', grade: behaviorGrade },
    ];

    return (
      <div ref={ref} className="bg-white p-4 w-[210mm] min-h-[297mm] mx-auto text-gray-900 font-sans relative flex flex-col shadow-lg" style={{boxSizing: 'border-box'}}>
         {/* Decorative Border Layer */}
         <div className="border-[3px] border-[#1e3a8a] rounded-sm flex-1 flex flex-col p-1 relative z-0">
            <div className="border border-[#1e3a8a]/40 rounded-sm flex-1 flex flex-col relative z-0 overflow-hidden">
               
               {/* Background Watermark Logo */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Watermark" className="w-[450px] h-[450px] object-contain opacity-[0.03]" />
               </div>

               <div className="relative z-10 flex flex-col h-full p-6 flex-1">
            
            {/* Header */}
            <div className="flex flex-row justify-between items-center mb-6 pb-4 border-b-2 border-[#1e3a8a]">
                <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Shikshantar Academy Logo" className="w-24 h-24 object-contain" />
                <div className="text-center flex-1 pr-10">
                   <h1 className="text-4xl font-black text-[#1e3a8a] uppercase tracking-wider mb-1">
                     Shikshantar Academy
                   </h1>
                   <h2 className="text-sm font-bold text-gray-600 tracking-widest uppercase mb-1">
                     Karjanha-5, Bastipur, (Siraha)
                   </h2>
                   <div className="inline-block mt-2 bg-[#1e3a8a] text-white px-6 py-1.5 rounded-full shadow-sm">
                      <span className="text-xs uppercase tracking-[0.2em] font-bold">
                        Academic Progress Report
                      </span>
                   </div>
                </div>
            </div>

            <div className="text-center font-black text-xl mb-6 text-gray-800 uppercase tracking-widest bg-gray-50 py-2 border border-blue-100 rounded">
               {student.examType} - 2082
            </div>

            {/* Student Info Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-y-3 text-sm font-bold uppercase tracking-wide">
                <div className="col-span-2 md:col-span-1">Name: <span className="font-medium text-[#1e3a8a] ml-2 text-base normal-case">{student.studentName}</span></div>
                <div className="col-span-2 md:col-span-1 text-right">Class: <span className="font-medium text-[#1e3a8a] ml-2">{student.class}</span></div>
                <div className="col-span-2 md:col-span-1">Regd No: <span className="font-medium text-[#1e3a8a] ml-2">{student.studentId || student.rollNo}</span></div>
                <div className="col-span-2 md:col-span-1 text-right">Roll No: <span className="font-medium text-[#1e3a8a] ml-2">{student.rollNo || '-'}</span></div>
            </div>

            {/* Marks Table */}
            <div className="rounded-lg overflow-hidden border border-gray-300 mb-6 flex-none">
               <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#1e3a8a] text-white">
                     <tr>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-2 w-12 text-center font-bold" rowSpan={2}>S.N.</th>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-2 text-left font-bold" rowSpan={2}>Subject</th>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-2 w-24 text-center font-bold" colSpan={2}>Full / Pass</th>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-2 text-center font-bold" colSpan={2}>Marks Obtained</th>
                        <th className="p-2 w-20 text-center font-bold" rowSpan={2}>Total</th>
                     </tr>
                     <tr className="bg-blue-900 border-t border-blue-800">
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-1 w-12 text-center text-xs">FM</th>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-1 w-12 text-center text-xs">PM</th>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-1 w-16 text-center text-xs">TH</th>
                        <th className="border-r border-[#1e3a8a] border-opacity-20 p-1 w-16 text-center text-xs">PR</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                     {Object.entries(student.subjects).map(([sub, rawMarks], i) => {
                         const marks: any = rawMarks;
                         const fm = marks.fullMarks;
                         const displayOm = marks.obtained;
                         const pm = marks.passMarks || Math.round(fm * 0.4);

                         return (
                            <tr key={sub} className="hover:bg-gray-50 transition-colors">
                               <td className="border-r border-gray-200 p-2 text-center text-gray-500 font-bold">{i+1}</td>
                               <td className="border-r border-gray-200 p-2 font-bold text-gray-800">{sub}</td>
                               <td className="border-r border-gray-200 p-2 text-center text-gray-600">{fm}</td>
                               <td className="border-r border-gray-200 p-2 text-center text-gray-600">{pm}</td>
                               <td className="border-r border-gray-200 p-2 text-center font-black text-[#1e3a8a]">{displayOm}</td>
                               <td className="border-r border-gray-200 p-2 text-center text-gray-400">-</td>
                               <td className="p-2 text-center font-bold text-[#1e3a8a] bg-blue-50/30">{displayOm}</td>
                            </tr>
                         );
                     })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-black">
                     <tr>
                        <td colSpan={2} className="p-3 text-right text-gray-600 uppercase tracking-widest">Grand Total</td>
                        <td className="p-3 text-center border-r border-gray-200">{student.fullTotal || '-'}</td>
                        <td colSpan={3} className="p-3 text-right border-r border-gray-200 text-gray-600 uppercase tracking-widest">Marks Secured</td>
                        <td className="p-3 text-center text-xl text-[#1e3a8a] bg-blue-50/50">{student.total}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>

            {/* Aggregate Row Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Marks</div>
                  <div className="text-xl font-black text-[#1e3a8a]">{student.total}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Percentage</div>
                  <div className="text-xl font-black text-[#1e3a8a]">{student.percentage?.toFixed(2)}%</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rank</div>
                  <div className="text-xl font-black text-[#1e3a8a]">{student.rank || '-'}</div>
               </div>
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Final Grade</div>
                  <div className="text-xl font-black text-[#1e3a8a]">{student.grade}</div>
               </div>
            </div>

            {/* Two Side-by-side Tables */}
            <div className="flex gap-4 w-full mb-8 font-sans">
              <div className="flex-1 bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-[11px] h-full">
                      <thead className="bg-gray-50">
                         <tr><th className="border-b border-gray-200 p-2 text-left text-gray-500 uppercase tracking-widest font-bold">Traits & Behavioral</th></tr>
                      </thead>
                      <tbody className="font-bold text-gray-700 divide-y divide-gray-100">
                         {behaviorTraits.map((trait, idx) => (
                           <tr key={idx}>
                              <td className="p-2 w-3/4">{trait.name}</td>
                              <td className="p-2 w-1/4 text-center text-[#1e3a8a] text-xs">{trait.grade}</td>
                           </tr>
                         ))}
                         <tr>
                            <td colSpan={2} className="p-2 align-top h-[60px] text-gray-500 font-medium">
                               Remarks: <span className="font-bold text-gray-800 italic">{student.classTeacherRemark || autoRemark}</span>
                            </td>
                         </tr>
                      </tbody>
                  </table>
              </div>

              <div className="flex-[1.2] bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-[10px] h-full text-center divide-y divide-gray-200">
                      <thead className="bg-[#1e3a8a] text-white">
                         <tr className="font-bold uppercase tracking-widest">
                             <th className="p-2 text-left">Performance</th>
                             <th className="p-2">Grade</th>
                             <th className="p-2">Percentage</th>
                         </tr>
                      </thead>
                      <tbody className="font-bold text-gray-700 divide-y divide-gray-100 bg-white">
                         {[
                           ['Outstanding', 'A+', '90% & above'],
                           ['Excellent', 'A', '80% to 89%'],
                           ['Very good', 'B+', '70% to 79%'],
                           ['Good', 'B', '60% to 69%'],
                           ['Satisfactory', 'C+', '50% to 59%'],
                           ['Acceptable', 'C', '40% to 49%'],
                           ['Partially acceptable', 'D+', '30% to 39%'],
                           ['Insufficient', 'D', '20% to 29%'],
                           ['Very insufficient', 'E', '19% and below'],
                         ].map((row, i) => (
                           <tr key={i} className="hover:bg-gray-50">
                             <td className="py-1 px-3 text-left">{row[0]}</td>
                             <td className="py-1 px-3 text-[#1e3a8a] font-black">{row[1]}</td>
                             <td className="py-1 px-3 text-gray-500">{row[2]}</td>
                           </tr>
                         ))}
                      </tbody>
                  </table>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="flex justify-between items-end mt-auto px-4 pb-4">
               <div className="flex flex-col items-start justify-end w-32 border-t-2 border-gray-300 pt-2">
                  <p className="font-bold text-xs text-gray-800 uppercase tracking-widest text-center w-full">Date</p>
                  <p className="font-medium text-sm text-[#1e3a8a] text-center w-full mt-1 bg-gray-50 py-1 rounded">{formatBSDate(new Date())}</p>
               </div>
               <div className="flex flex-col items-center justify-end w-40 text-center border-t-2 border-gray-300 pt-2">
                  <p className="font-bold text-xs text-gray-800 uppercase tracking-widest w-full">Class Teacher</p>
               </div>
               <div className="flex flex-col items-center justify-end w-32 text-center border-t-2 border-gray-300 pt-2 relative">
                  <span className="font-[cursive] text-3xl text-gray-600 absolute -top-8 ml-4 mb-[-5px]">Prin</span>
                  <p className="font-bold text-xs text-gray-800 uppercase tracking-widest w-full">Principal</p>
               </div>
            </div>
         </div>
         </div>
         </div>
      </div>
    );
  }
);

