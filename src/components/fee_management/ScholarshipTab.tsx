import React, { useState } from 'react';
import { Search, Edit2, Trash2, X, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ScholarshipTab({ studentsData, onRefresh }: { studentsData: any[], onRefresh?: () => void }) {
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [editModalStudent, setEditModalStudent] = useState<any | null>(null);
  const [newDiscount, setNewDiscount] = useState('');

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
    if (filterClass !== 'All' && student.class !== filterClass) return false;
    
    if (!search) return true;
    const s = search.toLowerCase();
    return (
       (student.name && student.name.toLowerCase().includes(s)) ||
       (student.id && student.id.toLowerCase().includes(s))
    );
  };

  const sortedClasses = Object.keys(groupedByClass).sort((a, b) => {
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });

  const handleUpdateScholarship = async () => {
     if (!editModalStudent) return;
     try {
        const studentRef = doc(db, 'users', editModalStudent.id);
        const amount = Number(newDiscount);
        
        let updateData: any;
        if (amount <= 0) {
           updateData = {
              scholarshipStatus: 'None',
              scholarshipAmount: 0
           };
        } else {
           updateData = {
              scholarshipStatus: 'Provided',
              scholarshipAmount: amount
           };
        }

        await updateDoc(studentRef, updateData);
        setEditModalStudent(null);
        if (onRefresh) onRefresh();
     } catch (err) {
        console.error("Failed to update scholarship", err);
        alert("Failed to update scholarship");
     }
  };

  const handleRemoveScholarship = async (student: any) => {
     if (window.confirm(`Are you sure you want to remove the scholarship for ${student.name}?`)) {
        try {
           const studentRef = doc(db, 'users', student.id);
           await updateDoc(studentRef, {
               scholarshipStatus: 'None',
               scholarshipAmount: 0
           });
           if (onRefresh) onRefresh();
        } catch (err) {
           console.error("Failed to remove scholarship", err);
           alert("Failed to remove scholarship");
        }
     }
  };

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

       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
         <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-sm"
            />
         </div>
         <select 
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="bg-white border w-full sm:w-auto border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-600 focus:outline-none shrink-0 min-h-[40px]"
            >
              <option value="All">Class: All</option>
              {['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
         </select>
       </div>

       {scholarshipStudents.length === 0 ? (
         <div className="p-10 text-center text-gray-500 font-bold text-primary rounded-lg">
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
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left whitespace-nowrap">
                     <thead className="text-primary text-gray-500 text-xs uppercase tracking-widest font-black border-b border-gray-100">
                         <tr>
                         <th className="p-4 pl-6">Student ID</th>
                         <th className="p-4">Name</th>
                         <th className="p-4">Monthly Base Fee</th>
                         <th className="p-4 text-center">Discount Amount</th>
                         <th className="p-4 text-center">Final Fee </th>
                         <th className="p-4 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {studentsInClass.map(student => (
                         <tr key={student.id} className="hover:bg-purple-50/30 transition-colors">
                           <td className="p-4 pl-6 font-mono text-xs font-bold text-gray-600">{student.id}</td>
                           <td className="p-4 font-bold text-gray-900">{student.name}</td>
                           <td className="p-4 text-gray-500 line-through">NRs. {student.monthlyFee + (student.scholarshipAmount ? Number(student.scholarshipAmount) : 0)}</td>
                           <td className="p-4 font-black text-purple-600 text-center">NRs. {student.scholarshipAmount ? Number(student.scholarshipAmount) : 0}</td>
                           <td className="p-4 font-black text-emerald-600 text-center">NRs. {student.monthlyFee}</td>
                           <td className="p-4 text-right">
                               <div className="flex justify-end gap-1">
                                   <button onClick={() => { setEditModalStudent(student); setNewDiscount(String(student.scholarshipAmount || 0)); }} className="p-2 bg-transparent text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200" title="Edit Discount"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={() => handleRemoveScholarship(student)} className="p-2 bg-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Revoke Scholarship"><Trash2 className="w-4 h-4"/></button>
                               </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             );
           })}
           {sortedClasses.every(className => groupedByClass[className].filter(matchesSearch).length === 0) && search && (
              <div className="p-10 text-center text-gray-500 font-bold text-primary rounded-lg">
                No scholarship students found matching "{search}".
              </div>
           )}
         </div>
       )}

       {/* Edit Modal */}
       {editModalStudent && (
         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl">
               <h3 className="text-lg font-black text-purple-900 mb-4 uppercase tracking-widest border-b border-purple-100 pb-2">Edit Discount</h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Student</label>
                     <p className="text-sm font-bold text-gray-800">{editModalStudent.name}</p>
                     <p className="text-[10px] font-mono text-gray-400">{editModalStudent.id}</p>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Monthly Discount (NRs.)</label>
                     <input type="number" min="0" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-purple-800 bg-purple-50" />
                     <p className="text-[10px] text-gray-400 mt-1">Set to 0 to remove the scholarship entirely.</p>
                  </div>
               </div>
               <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditModalStudent(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={handleUpdateScholarship} className="flex-1 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-sm hover:bg-purple-700 transition-colors shadow-md">Update</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
