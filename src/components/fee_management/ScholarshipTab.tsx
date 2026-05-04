import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function ScholarshipTab({ studentsData }: { studentsData: any[] }) {
  const [search, setSearch] = useState('');

  // Filter only scholarship students
  const scholarshipStudents = studentsData.filter(s => s.scholarshipStatus === 'Provided');
  
  const totalDiscount = scholarshipStudents.reduce((sum, s) => sum + (Number(s.scholarshipAmount) || 0), 0);

  // Group by class
  const groupedByClass = scholarshipStudents.reduce((acc, student) => {
    const className = student.class || 'Unassigned';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {} as Record<string, any[]>);

  // Filter based on search (either student name or class)
  const matchesSearch = (student: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
       (student.name && student.name.toLowerCase().includes(s)) ||
       (student.id && student.id.toLowerCase().includes(s)) || 
       (student.class && student.class.toLowerCase().includes(s))
    );
  };

  const sortedClasses = Object.keys(groupedByClass).sort((a, b) => {
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex flex-col justify-center">
            <p className="text-xs font-bold text-purple-800 uppercase tracking-widest mb-1">Total Discount / Month</p>
            <p className="text-3xl font-black text-purple-900">NRs. {totalDiscount.toLocaleString()}</p>
         </div>
         <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex flex-col justify-center">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">Total Sponsored Students</p>
            <p className="text-3xl font-black text-emerald-900">{scholarshipStudents.length} <span className="text-sm font-bold text-emerald-700">Availed</span></p>
         </div>
       </div>

       <div className="flex justify-between items-center gap-4">
         <div className="relative flex-1 max-w-sm">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID or class..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-sm"
            />
         </div>
       </div>

       {scholarshipStudents.length === 0 ? (
         <div className="p-10 text-center text-gray-500 font-bold bg-gray-50 rounded-lg">
           No students are currently enrolled with a scholarship.
         </div>
       ) : (
         <div className="space-y-8">
           {sortedClasses.map(className => {
             const studentsInClass = groupedByClass[className].filter(matchesSearch);
             if (studentsInClass.length === 0) return null;

             return (
               <div key={className} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex justify-between items-center">
                   <h3 className="font-black text-purple-900 uppercase tracking-wider text-sm">Class {className}</h3>
                   <span className="bg-purple-200 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      {studentsInClass.length} Students
                   </span>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left whitespace-nowrap">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-black border-b border-gray-100">
                       <tr>
                         <th className="p-4 pl-6">Student ID</th>
                         <th className="p-4">Name</th>
                         <th className="p-4">Monthly Base Fee</th>
                         <th className="p-4">Discount Amount</th>
                         <th className="p-4">Final Fee (After Discount)</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {studentsInClass.map(student => (
                         <tr key={student.id} className="hover:bg-purple-50/30 transition-colors">
                           <td className="p-4 pl-6 font-mono text-xs font-bold text-gray-600">{student.id}</td>
                           <td className="p-4 font-bold text-gray-900">{student.name}</td>
                           <td className="p-4 text-gray-500 line-through">NRs. {student.monthlyFee + (student.scholarshipAmount ? Number(student.scholarshipAmount) : 0)}</td>
                           <td className="p-4 font-black text-purple-600">NRs. {student.scholarshipAmount ? Number(student.scholarshipAmount) : 0}</td>
                           <td className="p-4 font-black text-emerald-600">NRs. {student.monthlyFee}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             );
           })}
           {sortedClasses.every(className => groupedByClass[className].filter(matchesSearch).length === 0) && search && (
              <div className="p-10 text-center text-gray-500 font-bold bg-gray-50 rounded-lg">
                No scholarship students found matching "{search}".
              </div>
           )}
         </div>
       )}
    </div>
  );
}
