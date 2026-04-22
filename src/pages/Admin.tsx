import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Folder, ChevronRight, Users, ArrowLeft, Edit2, Save, X, Plus, Search, Download, Shield } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, updateDoc } from 'firebase/firestore';

export default function Admin() {
  // Results State
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  
  // Folder View State
  const [showFolders, setShowFolders] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // To handle manual entry addition
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [exportSelection, setExportSelection] = useState<string>('ALL');

  useEffect(() => {
      // Real-time listener for Results from Firestore
      const unsub = onSnapshot(doc(db, 'school_data', 'results'), (docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data().records || []);
        } else {
          setData([]);
        }
      }, (error) => {
        console.error("Firebase read error:", error);
      });
  
      return () => unsub();
    }, []);
  
    const classes = useMemo(() => {
    const clsSet = new Set<string>();
    data.forEach(row => {
      const classVal = row['Class'] || row['class'] || 'Unknown';
      clsSet.add(String(classVal).trim());
    });
    // Custom sort to handle "PG", "Nursery", "LKG", "UKG", "1", "2"...
    return Array.from(clsSet).sort((a, b) => {
      const isNumA = !isNaN(Number(a));
      const isNumB = !isNaN(Number(b));
      if (isNumA && isNumB) return Number(a) - Number(b);
      if (isNumA) return 1;
      if (isNumB) return -1;
      return a.localeCompare(b);
    });
  }, [data]);

  // --- CSV Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Are you sure you want to upload "${file.name}"? This will update the results database.`)) {
      e.target.value = ''; // reset
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        let parsedData = XLSX.utils.sheet_to_json(ws);
        
        // Accept either StudentId or Roll no.
        if (parsedData.length > 0 && !('StudentId' in (parsedData[0] as object)) && !('Roll no.' in (parsedData[0] as object))) {
          setStatus({ type: 'error', message: 'Invalid format. Excel must have a "StudentId" or "Roll no." column.' });
          return;
        }

        // Map 'Roll no.' to 'StudentId' to maintain app logic compatibility
        parsedData = parsedData.map((row: any) => {
          if ('Roll no.' in row && !('StudentId' in row)) {
            row['StudentId'] = row['Roll no.'];
          }
          return row;
        });

        const syncToFirebase = async (records: any[]) => {
          try {
            await setDoc(doc(db, 'school_data', 'results'), { records: records });
            setStatus({ type: 'success', message: `Successfully synced ${records.length} student records to Live Cloud Database.` });
          } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: 'Failed to sync to cloud. Check Firebase Rules.' });
          }
        };

        syncToFirebase(parsedData);
        setShowFolders(true); // Auto expand folders on upload
      } catch (error) {
        setStatus({ type: 'error', message: 'Error parsing Excel file. Please ensure it is a valid .xlsx or .csv file.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearData = async () => {
    if (window.confirm('Are you sure you want to clear all result data from the cloud?')) {
      try {
        await setDoc(doc(db, 'school_data', 'results'), { records: [] });
        setData([]);
        setStatus({ type: 'success', message: 'All result cloud data cleared.' });
        setShowFolders(false);
        setSelectedClass(null);
      } catch (e) {
        console.error(e);
        setStatus({ type: 'error', message: 'Failed to clear cloud data.' });
      }
    }
  };

  const getStudentsByClass = (className: string) => {
    return data.filter(row => {
      const cls = row['Class'] || row['class'] || 'Unknown';
      return String(cls).trim() === className;
    });
  };

  const getFilteredStudents = (className: string) => {
    const students = getStudentsByClass(className);
    if (!searchQuery) return students;
    return students.filter(s => {
      const nameMatch = String(s.Name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const idMatch = String(s.StudentId || s['Roll no.'] || '').toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || idMatch;
    });
  };

  const exportToExcel = (className: string | null = null) => {
    const exportData = className ? getStudentsByClass(className) : data;
    if (exportData.length === 0) return;
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    
    // Download
    const fileName = className ? `Class_${className}_Results.xlsx` : `All_Results_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    setEditingData({ ...editingData, [key]: e.target.value });
  };

  const saveEdit = async () => {
    let newData = [...data];
    if (isAddingNew) {
      if (!editingData.StudentId || !editingData.Name) {
         setStatus({ type: 'error', message: 'Student ID and Name are required.' });
         return;
      }
      editingData.Class = selectedClass; // Ensure it matches current folder
      newData.push(editingData);
    } else {
      const index = newData.findIndex(r => String(r.StudentId) === String(editingStudentId));
      if (index !== -1) {
        newData[index] = editingData;
      }
    }
    
    setData(newData);
    try {
      await setDoc(doc(db, 'school_data', 'results'), { records: newData });
      setStatus({ type: 'success', message: 'Record saved successfully to cloud.' });
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Failed to save to cloud.' });
    }
    
    setEditingStudentId(null);
    setIsAddingNew(false);
    setEditingData({});
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  const deleteRecord = async (studentId: string) => {
    if (!window.confirm(`Are you sure you want to delete the result for Student ID: ${studentId}?`)) return;
    const newData = data.filter(r => String(r.StudentId) !== String(studentId));
    setData(newData);
    try {
      await setDoc(doc(db, 'school_data', 'results'), { records: newData });
      setStatus({ type: 'success', message: 'Record deleted from cloud.' });
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Failed to delete from cloud.' });
    }
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-5">
            <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center border-b border-[#e5e7eb] pb-3">
          <span className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /> Result Management (Excel Upload)</span>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Upload Section */}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#1f2937] mb-2">Upload Results (Excel/CSV)</h3>
            <p className="text-xs text-[#6b7280] mb-4">
              Upload an Excel file containing student marks. The file must have columns like: 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1 text-[#1e3a8a] border border-[#e5e7eb]">StudentId<span className="text-xs opacity-70"> (or)</span> Roll no.</code>, 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1 text-[#1e3a8a] border border-[#e5e7eb]">Name</code>, 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1 text-[#1e3a8a] border border-[#e5e7eb]">Class</code>, 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1 text-[#1e3a8a] border border-[#e5e7eb]">Mathematics</code>, etc.
            </p>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#e5e7eb] border-dashed rounded-lg cursor-pointer bg-[#f9fafb] hover:bg-[#f3f4f6] transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-[#6b7280] mb-2" />
                <p className="text-sm text-[#6b7280]"><span className="font-semibold text-[#1e3a8a]">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-[#6b7280] mt-1">.XLSX, .XLS, or .CSV</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>

            {status.type && (
              <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                status.type === 'success' ? 'bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]' : 'bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]'
              }`}>
                {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.message}
              </div>
            )}
          </div>

          {/* Status / Output Section */}
          <div className="flex-1 bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-bold text-[#1f2937] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" />
                Database Status
              </h3>
              {data.length > 0 && (
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 bg-[#ecfdf5] rounded border border-[#a7f3d0] overflow-hidden">
                    <select
                      value={exportSelection}
                      onChange={(e) => setExportSelection(e.target.value)}
                      className="text-xs bg-transparent text-[#065f46] px-2 py-1 outline-none font-semibold cursor-pointer border-r border-[#a7f3d0]/50"
                    >
                      <option value="ALL">All Classes</option>
                      {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                    <button onClick={() => exportToExcel(exportSelection === 'ALL' ? null : exportSelection)} className="text-xs font-bold text-[#10b981] hover:text-[#059669] hover:bg-[#d1fae5] transition-colors flex items-center gap-1 px-2 py-1">
                      <Download className="w-3 h-3" /> Export
                    </button>
                  </div>
                  <button onClick={clearData} className="text-xs font-bold text-[#ef4444] hover:text-[#b91c1c] flex items-center gap-1 bg-[#fef2f2] px-2 py-1 rounded border border-[#fecaca] transition-colors">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-[0.8rem] opacity-70">Total Records</span>
              <span className="text-[0.8rem] font-semibold">{data.length} Students</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-[0.8rem] opacity-70">Classes Found</span>
              <span className="text-[0.8rem] font-semibold">{classes.length} Classes</span>
            </div>

            {data.length > 0 && !showFolders && (
               <button onClick={() => setShowFolders(true)} className="w-full mt-auto bg-[#1e3a8a] text-white py-2 rounded-lg text-sm font-bold hover:bg-[#1e40af] transition-colors">
                  Generate / View Results
               </button>
            )}
            {data.length > 0 && showFolders && (
               <button onClick={() => { setShowFolders(false); setSelectedClass(null); }} className="w-full mt-auto bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] py-2 rounded-lg text-sm font-bold hover:bg-[#e2e8f0] transition-colors">
                 Hide Results
               </button>
            )}
          </div>
        </div>
      </section>

      {/* Folders View Section */}
      {showFolders && !selectedClass && (
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center border-b border-[#e5e7eb] pb-3">
            <span className="flex items-center gap-2"><Folder className="w-4 h-4 text-[#1e3a8a]" /> Results Folders by Class</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {classes.map(cls => (
               <button 
                 key={cls} 
                 onClick={() => setSelectedClass(cls)}
                 className="flex flex-col items-center justify-center p-6 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl hover:bg-[#f1f5f9] hover:border-[#cbd5e1] transition-all group"
               >
                 <Folder className="w-12 h-12 text-[#3b82f6] group-hover:text-[#2563eb] mb-3 fill-[#3b82f6]/20" />
                 <span className="font-bold text-[#1f2937] text-sm mb-1">Class {cls}</span>
                 <span className="text-xs text-[#64748b] flex items-center gap-1">
                   <Users className="w-3 h-3" /> {getStudentsByClass(cls).length} Students
                 </span>
               </button>
            ))}
          </div>
        </section>
      )}

      {/* Detailed Class View */}
      {showFolders && selectedClass && (
         <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] animate-in fade-in zoom-in-95 duration-300">
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#e5e7eb] pb-4 mb-4 gap-3">
              <div className="flex items-center gap-3">
                 <button onClick={() => { setSelectedClass(null); setIsAddingNew(false); setEditingStudentId(null); setSearchQuery(''); }} className="p-1.5 hover:bg-[#f1f5f9] rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-[#64748b]" />
                 </button>
                 <span className="font-bold text-[#1f2937] flex items-center gap-2">
                   <Folder className="w-5 h-5 text-[#3b82f6] fill-[#3b82f6]/20" /> 
                   Class {selectedClass} Results
                 </span>
                 <span className="bg-[#e0f2fe] text-[#0284c7] px-3 py-1 rounded-full text-xs font-bold">
                    {getStudentsByClass(selectedClass).length} Total
                 </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-64">
                   <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                   <input 
                     type="text" 
                     placeholder="Search Name or ID..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#cbd5e1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] bg-[#f8fafc]"
                   />
                 </div>
                 <button 
                   onClick={() => exportToExcel(selectedClass)} 
                   className="text-[#64748b] bg-[#f8fafc] border border-[#cbd5e1] px-2.5 py-1.5 rounded-md hover:bg-[#f1f5f9] transition-colors"
                   title="Download Class Data"
                 >
                   <Download className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => {
                     setIsAddingNew(true);
                     setEditingStudentId('new');
                     // Pre-populate keys based on existing records structure (if any)
                     const sample = getStudentsByClass(selectedClass)[0] || { StudentId: '', Name: '', Mathematics: '', Science: '', English: '' };
                     const emptyData = Object.keys(sample).reduce((acc, key) => ({ ...acc, [key]: '' }), {});
                     setEditingData({...emptyData, Class: selectedClass});
                   }} 
                   className="bg-[#10b981] text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 hover:bg-[#059669] transition-colors shadow-sm"
                 >
                   <Plus className="w-3 h-3" /> Add
                 </button>
              </div>
           </div>

           <div className="overflow-x-auto border border-[#e5e7eb] rounded-lg">
             <table className="w-full text-left text-[0.8rem] border-collapse bg-white whitespace-nowrap">
               <thead>
                 <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                   <th className="p-3 font-bold text-[#475569] w-20">Actions</th>
                   {Object.keys(getStudentsByClass(selectedClass)[0] || editingData).filter(k => k !== 'Class').map((key, i) => (
                     <th key={key} className={`p-3 font-bold text-[#475569]`}>{key}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#f1f5f9]">
                 {isAddingNew && (
                   <tr className="bg-[#ecfdf5]">
                     <td className="p-3 flex items-center gap-2">
                       <button onClick={saveEdit} className="text-[#10b981] hover:bg-[#d1fae5] p-1.5 rounded transition-colors"><Save className="w-4 h-4" /></button>
                       <button onClick={() => { setIsAddingNew(false); setEditingStudentId(null); }} className="text-[#ef4444] hover:bg-[#fee2e2] p-1.5 rounded transition-colors"><X className="w-4 h-4" /></button>
                     </td>
                     {Object.keys(editingData).filter(k => k !== 'Class').map((key, j) => (
                       <td key={j} className="p-2 min-w-[120px]">
                         <input 
                           type="text" 
                           value={editingData[key] || ''} 
                           onChange={(e) => handleEditChange(e, key)}
                           placeholder={key}
                           className="w-full px-2 py-1.5 text-xs border border-[#cbd5e1] rounded focus:outline-none focus:ring-1 focus:ring-[#10b981] bg-white"
                         />
                       </td>
                     ))}
                   </tr>
                 )}
                 {getFilteredStudents(selectedClass).length === 0 && !isAddingNew && (
                   <tr>
                     <td colSpan={100} className="p-8 text-center text-[#64748b] text-xs">
                       <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                       No students match your search.
                     </td>
                   </tr>
                 )}
                 {getFilteredStudents(selectedClass).map((row, i) => (
                   <tr key={i} className={`transition-colors ${editingStudentId === row.StudentId ? 'bg-[#f0f9ff]' : 'hover:bg-[#f8fafc]'}`}>
                     <td className="p-3 flex items-center gap-2 border-r border-[#f1f5f9]">
                       {editingStudentId === row.StudentId && !isAddingNew ? (
                         <>
                           <button onClick={saveEdit} className="text-[#3b82f6] hover:bg-[#dbeafe] p-1.5 rounded transition-colors" title="Save"><Save className="w-4 h-4" /></button>
                           <button onClick={() => setEditingStudentId(null)} className="text-[#64748b] hover:bg-[#e2e8f0] p-1.5 rounded transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                         </>
                       ) : (
                         <>
                           <button 
                             onClick={() => { setEditingStudentId(row.StudentId); setEditingData({...row}); setIsAddingNew(false); }} 
                             className="text-[#64748b] hover:text-[#3b82f6] hover:bg-[#eff6ff] p-1.5 rounded transition-colors" title="Edit"
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => deleteRecord(row.StudentId)} 
                             className="text-[#64748b] hover:text-[#ef4444] hover:bg-[#fef2f2] p-1.5 rounded transition-colors" title="Delete"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </>
                       )}
                     </td>
                     {Object.keys(row).filter(k => k !== 'Class').map((key, j) => (
                       <td key={j} className="p-3 text-[#334155] min-w-[100px]">
                         {editingStudentId === row.StudentId && !isAddingNew ? (
                           <input 
                             type="text" 
                             value={editingData[key] || ''} 
                             onChange={(e) => handleEditChange(e, key)}
                             className="w-full px-2 py-1 text-xs border border-[#cbd5e1] rounded focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                           />
                         ) : (
                           row[key]
                         )}
                       </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </section>
      )}
      </div>
    </div>
  );
}
