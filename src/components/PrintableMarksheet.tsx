import React from 'react';
import { StudentResult } from '../types/result';

interface PrintableMarksheetProps {
  result: StudentResult;
}

export const PrintableMarksheet = React.forwardRef<HTMLDivElement, PrintableMarksheetProps>(({ result }, ref) => {

  const getGradeInfo = (obtained: number | "AB", full: number) => {
     if (obtained === "AB") return { grade: "NG", pass: false };
     const pct = (obtained / full) * 100;
     if (pct >= 90) return { grade: "A+", pass: true };
     if (pct >= 80) return { grade: "A", pass: true };
     if (pct >= 70) return { grade: "B+", pass: true };
     if (pct >= 60) return { grade: "B", pass: true };
     if (pct >= 50) return { grade: "C+", pass: true };
     if (pct >= 40) return { grade: "C", pass: true };
     if (pct >= 35) return { grade: "D", pass: false };
     return { grade: "NG", pass: false };
  };

  return (
    <div id="printable-marksheet" ref={ref} className="bg-white p-8 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b-4 border-[#1E3A5F] pb-4">
            <div className="flex items-center">
                <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-sm text-gray-500">[School Logo]</div>
                <div className="ml-4">
                    <h1 className="text-4xl font-extrabold text-[#1E3A5F]">Shikshantar Academy</h1>
                    <p className="text-lg text-gray-600 font-semibold">Siraha, Nepal</p>
                </div>
            </div>
            <div className="text-right">
                 <p className="text-lg font-bold text-[#1E3A5F]">{result.examType}</p>
                 <p className="font-semibold text-gray-600">Academic Year: {result.academicYear}</p>
            </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 my-6 bg-gray-50 p-4 rounded-lg border">
            <p><span className="font-semibold text-gray-700">Student's Name:</span> <span className="font-bold text-lg">{result.name}</span></p>
            <p><span className="font-semibold text-gray-700">Class:</span> <span className="font-bold text-lg">{result.classId} {result.section}</span></p>
            <p><span className="font-semibold text-gray-700">Roll No:</span> <span className="font-bold text-lg">{result.rollNo}</span></p>
            <p><span className="font-semibold text-gray-700">Father's Name:</span> <span className="font-bold text-lg">[Father's Name Placeholder]</span></p>
        </div>

        {/* Marks Table */}
        <table className="w-full text-left border-collapse mb-6">
            <thead>
                <tr className="bg-[#1E3A5F] text-white">
                    <th className="p-3 font-bold uppercase">Subject</th>
                    <th className="p-3 font-bold uppercase text-center">Full Marks</th>
                    <th className="p-3 font-bold uppercase text-center">Pass Marks</th>
                    <th className="p-3 font-bold uppercase text-center">Marks Obtained</th>
                    <th className="p-3 font-bold uppercase text-center">Grade</th>
                    <th className="p-3 font-bold uppercase text-center">Status</th>
                </tr>
            </thead>
            <tbody>
                {result.subjects.map((subject, index) => {
                    const { grade, pass } = getGradeInfo(subject.obtained, subject.fullMarks);
                    return (
                        <tr key={index} className={`border ${pass ? 'bg-green-50' : 'bg-red-50'}`}>
                            <td className="p-2 border font-semibold">{subject.name}</td>
                            <td className="p-2 border text-center font-medium">{subject.fullMarks}</td>
                            <td className="p-2 border text-center font-medium">{subject.passMarks}</td>
                            <td className="p-2 border text-center font-bold text-lg">{subject.obtained}</td>
                            <td className="p-2 border text-center font-bold">{grade}</td>
                            <td className={`p-2 border text-center font-bold ${pass ? 'text-green-700' : 'text-red-700'}`}>{pass ? 'Pass' : 'Fail'}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>

        {/* Summary */}
        <div className="grid grid-cols-5 gap-4 text-center mb-8">
            <div className="bg-gray-100 p-3 rounded-lg"><p className="font-bold text-gray-600">Total Marks</p><p className="text-xl font-extrabold text-[#1E3A5F]">{result.total} / {result.maxMarks}</p></div>
            <div className="bg-gray-100 p-3 rounded-lg"><p className="font-bold text-gray-600">Percentage</p><p className="text-xl font-extrabold text-[#1E3A5F]">{result.percentage.toFixed(2)}%</p></div>
            <div className="bg-gray-100 p-3 rounded-lg"><p className="font-bold text-gray-600">Grade</p><p className="text-xl font-extrabold text-[#1E3A5F]">{result.grade}</p></div>
            <div className="bg-gray-100 p-3 rounded-lg"><p className="font-bold text-gray-600">Division</p><p className="text-xl font-extrabold text-[#1E3A5F]">{result.division}</p></div>
            <div className="bg-gray-100 p-3 rounded-lg"><p className="font-bold text-gray-600">Rank</p><p className="text-xl font-extrabold text-[#1E3A5F]">{result.rank}</p></div>
        </div>
        
        {/* Remarks */}
        <div className="mb-16">
            <h3 className="font-bold text-lg text-gray-800">Remarks:</h3>
            <p className="p-2 border-b-2 border-dotted h-8">{result.remarks}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-8 text-center">
            <div>
                <p className="border-t-2 border-gray-400 pt-2 px-8 font-bold">Class Teacher's Signature</p>
            </div>
            <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-sm text-gray-500 border-4 border-double border-gray-400">[School Stamp]</div>
            <div>
                <p className="border-t-2 border-gray-400 pt-2 px-8 font-bold">Principal's Signature</p>
            </div>
        </div>

    </div>
  );
});
