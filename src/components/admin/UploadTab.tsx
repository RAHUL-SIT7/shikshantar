import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2, AlertCircle, Download, FileEdit } from 'lucide-react';

import { doc, writeBatch, collection, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export function UploadTab({ EXAM_TYPES, allClasses, setStatus, userRole, assignedClasses, assignedSubjects }: any) {
  const [examCategory, setExamCategory] = useState<'Test' | 'Terminal'>('Test');
  const [uploadExamType, setUploadExamType] = useState('');
  const [uploadClass, setUploadClass] = useState('');
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const allowedClasses = userRole === 'admin' ? allClasses : assignedClasses;

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'StudentId': 'S101', 'Name': 'John Doe', 'Class': uploadClass || '10', 'Mathematics': 85, 'Science': 90
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Template_Class_${uploadClass || 'X'}_${uploadExamType}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadClass) {
      if(!uploadClass) setStatus({type: 'error', message: 'Select a class before uploading.'});
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        let parsedData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        
        if (parsedData.length > 0 && !('StudentId' in parsedData[0]) && !('Roll no.' in parsedData[0])) {
          setStatus({ type: 'error', message: 'Excel must have "StudentId" or "Roll no." column.' });
          return;
        }

        parsedData = parsedData.map(row => {
          if ('Roll no.' in row && !('StudentId' in row)) row['StudentId'] = row['Roll no.'];
          row['ExamType'] = uploadExamType; 
          row['Class'] = String(row['Class'] || uploadClass);
          return row;
        });

        if (userRole === 'teacher') {
          parsedData = parsedData.filter(row => assignedClasses.includes(String(row['Class'])));
          parsedData = parsedData.map(row => {
            const cleanRow: any = { StudentId: row.StudentId, Name: row.Name, Class: row.Class, ExamType: row.ExamType };
            assignedSubjects.forEach((sub: string) => { if (row[sub] !== undefined) cleanRow[sub] = row[sub]; });
            return cleanRow;
          });
        }
        
        parsedData = parsedData.map(r => {
           let errs = [];
           if (!r.Name) errs.push('Missing Name');
           Object.keys(r).forEach(k => {
               const lowerK = k.toLowerCase().replace(/[^a-z]/g, '');
               if(!['studentid', 'rollno', 'roll', 'id', 'name', 'class', 'examtype', 'fullmarksdata', 'rank', '_errors'].includes(lowerK)) {
                   if (r[k] !== 'AB' && r[k] !== 'ab' && !isNaN(Number(r[k])) && Number(r[k]) > 100) {
                       errs.push(`${k} marks > 100`);
                   }
               }
           });
           return {...r, _errors: errs};
        });

        setPreviewData(parsedData);
      } catch (error) {
        setStatus({ type: 'error', message: 'Error parsing Excel file.' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const confirmAndSave = async () => {
      if (!previewData) return;
      setStatus({ type: 'info', message: 'Saving to Firebase...' });

      const validData = previewData.map(r => {
          const m = {...r}; delete m._errors; return m;
      });

      try {
          const examId = `${uploadExamType.replace(/\s+/g, '_')}_${uploadClass}`;
          
          await setDoc(doc(db, "exams", examId), {
              name: uploadExamType,
              type: uploadExamType,
              class: uploadClass,
              academicYear: new Date().getFullYear().toString(),
              published: false
          });

          // We will use batches
          let batch = writeBatch(db);
          let operationCount = 0;
          let resultsCount = 0;

          for (const newRow of validData) {
              const studentId = String(newRow.StudentId || newRow['Roll no.']);
              let total = 0;
              let fullTotal = 0;

              // Write individual subject results
              for (const k of Object.keys(newRow)) {
                  if (['StudentId', 'Name', 'Class', 'ExamType', 'Roll no.', 'Roll'].includes(k)) continue;
                  
                  const val = newRow[k] === 'AB' || newRow[k] === 'ab' ? 'AB' : Number(newRow[k]);
                  const subjectDocId = `${examId}_${studentId}_${k.replace(/\s+/g, '')}`;
                  
                  batch.set(doc(db, 'results', subjectDocId), {
                      studentId: studentId,
                      examId: examId,
                      subject: k,
                      marks: val,
                      fullMarks: 100
                  });
                  operationCount++;
                  
                  if (val !== 'AB') total += typeof val === 'number' ? val : 0;
                  fullTotal += 100;
                  
                  if (operationCount > 400) {
                      await batch.commit();
                      batch = writeBatch(db);
                      operationCount = 0;
                  }
              }

              const pct = fullTotal > 0 ? (total / fullTotal) * 100 : 0;
              const getGrade = (marks: number, fm: number) => {
                if(isNaN(marks)) return '';
                const p = (marks / fm) * 100;
                if (p >= 90) return 'A+';
                if (p >= 80) return 'A';
                if (p >= 70) return 'B+';
                if (p >= 60) return 'B';
                if (p >= 50) return 'C+';
                if (p >= 40) return 'C';
                if (p >= 30) return 'D';
                return 'NG';
              };

              const summaryDocId = `${examId}_${studentId}`;
              batch.set(doc(db, 'resultSummary', summaryDocId), {
                  studentId: studentId,
                  studentName: newRow.Name,
                  class: String(newRow.Class),
                  examId: examId,
                  examType: uploadExamType,
                  total: total,
                  fullTotal: fullTotal,
                  percentage: pct,
                  grade: getGrade(total, fullTotal),
                  rank: 0, // rank will be calculated later or left as 0
                  gpa: Number((pct/25).toFixed(1))
              });
              operationCount++;
              resultsCount++;

              if (operationCount > 400) {
                  await batch.commit();
                  batch = writeBatch(db);
                  operationCount = 0;
              }
          }
          await batch.commit();

          setStatus({ type: 'success', message: `Results for Class ${uploadClass} - ${uploadExamType} saved successfully. ${resultsCount} students updated.` });
          setPreviewData(null);
      } catch (error: any) {
          console.error("Firebase save error:", error);
          setStatus({ type: 'error', message: 'Failed to write to Firebase: ' + error.message });
      }
  };

  const publishResults = async () => {
    if (!uploadClass || !uploadExamType) return;
    setStatus({type: 'info', message: 'Calculating ranks and publishing results...'});
    try {
        const examId = `${uploadExamType.replace(/\s+/g, '_')}_${uploadClass}`;
        const summaryDocs = await getDocs(query(collection(db, 'resultSummary'), where('examId', '==', examId)));
        
        let allStudents = summaryDocs.docs.map(d => ({ id: d.id, ...d.data() } as any));
        allStudents.sort((a, b) => b.total - a.total);
        
        let batch = writeBatch(db);
        let opCount = 0;
        let currentRank = 1;
        let prevTotal = -1;
        let sameRankCount = 0;
        
        allStudents.forEach((std, idx) => {
             if (std.total === prevTotal) {
                 std.rank = currentRank;
                 sameRankCount++;
             } else {
                 currentRank += sameRankCount;
                 if (idx === 0) currentRank = 1;
                 std.rank = currentRank;
                 sameRankCount = 1;
                 prevTotal = std.total;
             }
             
             batch.update(doc(db, 'resultSummary', std.id), {
                 rank: std.rank,
                 published: true
             });
             opCount++;
        });
        
        batch.update(doc(db, 'exams', examId), { published: true });
        
        await batch.commit();
        setStatus({type: 'success', message: `Results and Ranks Published successfully for Class ${uploadClass}.`});
    } catch(err: any) {
        setStatus({type: 'error', message: 'Publish failed: ' + err.message});
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <label className="block text-sm font-bold text-gray-700 mb-2">1. Select Type</label>
        <div className="flex gap-4 items-center mb-4 h-[42px]">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="Terminal" checked={examCategory === 'Terminal'} onChange={() => { setExamCategory('Terminal'); setUploadExamType(''); }} className="w-4 h-4 text-[#1e3a8a] focus:ring-[#1e3a8a] outline-none" />
                <span className="text-sm font-bold">Terminal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="Test" checked={examCategory === 'Test'} onChange={() => { setExamCategory('Test'); setUploadExamType(''); }} className="w-4 h-4 text-[#1e3a8a] focus:ring-[#1e3a8a] outline-none" />
                <span className="text-sm font-bold">Test</span>
            </label>
        </div>

        <label className="block text-sm font-bold text-gray-700 mb-2">2. Select Exam Name</label>
        {examCategory === 'Terminal' ? (
            <select 
                value={uploadExamType} 
                onChange={e => setUploadExamType(e.target.value)} 
                className="w-full px-4 py-2 border rounded-lg mb-4 bg-gray-50 focus:ring-2 focus:ring-[#1e3a8a] outline-none h-[42px]"
            >
                <option value="">-- Select Terminal --</option>
                {EXAM_TYPES.map((ex:string) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
        ) : (
            <input 
                type="text"
                value={uploadExamType} 
                onChange={e => setUploadExamType(e.target.value)} 
                className="w-full px-4 py-2 border rounded-lg mb-4 bg-gray-50 focus:ring-2 focus:ring-[#1e3a8a] outline-none h-[42px]"
                placeholder="e.g. Unit Test 1"
            />
        )}

        <label className="block text-sm font-bold text-gray-700 mb-2">3. Select Class</label>
        <select value={uploadClass} onChange={e => setUploadClass(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-4 bg-gray-50 focus:ring-2 focus:ring-[#1e3a8a] outline-none">
            <option value="">-- Select Class --</option>
            {allowedClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
            {allowedClasses.length === 0 && <option value="1">Class 1 (Default)</option>}
        </select>

        <label className="block text-sm font-bold text-gray-700 mb-2">4. Upload File</label>
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${!uploadClass ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' : 'bg-[#f9fafb] border-[#e5e7eb] cursor-pointer hover:bg-[#f3f4f6]'}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 text-[#6b7280] mb-2" />
            <p className="text-sm text-[#6b7280]"><span className="font-semibold text-[#1e3a8a]">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-[#6b7280] mt-1">.XLSX, .XLS, or .CSV</p>
          </div>
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={!uploadClass} />
        </label>
        
        <div className="mt-8 pt-4 border-t border-gray-200">
           <button onClick={publishResults} disabled={!uploadClass || !uploadExamType} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${(!uploadClass || !uploadExamType) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              <CheckCircle2 className="w-5 h-5" /> Calculate Rank & Publish Results
           </button>
           <p className="text-xs text-gray-500 mt-2 text-center">Calculates ranks based on saved marks and publishes to students.</p>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><FileEdit className="w-5 h-5"/> Upload Requirements</h3>
          <button onClick={downloadTemplate} className="mb-4 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors w-full justify-center">
             <Download className="w-4 h-4" /> Download Sample Template
          </button>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4 mb-4">
            <li>Must include a <code className="bg-white px-1 border rounded">StudentId</code> or <code className="bg-white px-1 border rounded">Roll no.</code></li>
            <li>Must include a <code className="bg-white px-1 border rounded">Name</code> column.</li>
            <li>Subject columns should contain absolute numbers or "AB" for absent.</li>
          </ul>
          <div className="bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-200 text-sm flex gap-2">
             <AlertCircle className="w-5 h-5 flex-shrink-0" />
             <p><strong>Warning:</strong> Uploading again for the same class and exam type will OVERWRITE existing data. <br/><br/><strong>Notification:</strong> Parents will automatically receive a notice on their dashboard when these results are published.</p>
          </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                     <h3 className="font-bold text-lg">Preview Data Form ({previewData.length} students)</h3>
                     <div className="flex gap-2">
                         <button onClick={() => setPreviewData(null)} className="px-4 py-2 rounded-lg bg-gray-100 font-bold text-gray-600 hover:bg-gray-200">Cancel</button>
                         <button onClick={confirmAndSave} className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-white font-bold hover:bg-[#1e40af] flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4" /> Confirm & Save
                         </button>
                     </div>
                  </div>
                  <div className="p-4 overflow-auto flex-1">
                      <table className="w-full text-left text-sm border-collapse">
                          <thead>
                              <tr className="bg-gray-100">
                                  <th className="p-2 border">Student ID</th>
                                  <th className="p-2 border">Name</th>
                                  {Object.keys(previewData[0] || {}).filter(k=>!['StudentId','Roll no.','Name','Class','ExamType','_errors'].includes(k)).map(k => (
                                      <th key={k} className="p-2 border">{k}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody>
                              {previewData.map((row, i) => (
                                  <tr key={i} className={row._errors.length > 0 ? "bg-red-50" : "hover:bg-gray-50"}>
                                      <td className="p-2 border">{row.StudentId || row['Roll no.']}</td>
                                      <td className="p-2 border font-bold flex items-center gap-2">
                                          {row.Name}
                                          {row._errors.length > 0 && <span title={row._errors.join(', ')} className="text-red-500 cursor-help"><AlertCircle className="w-4 h-4"/></span>}
                                      </td>
                                      {Object.keys(row).filter(k=>!['StudentId','Roll no.','Name','Class','ExamType','_errors'].includes(k)).map(k => (
                                          <td key={k} className="p-2 border">{row[k]}</td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
