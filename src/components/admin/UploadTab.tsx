import React, { useState, useEffect, useMemo } from 'react';
import { Upload, CheckCircle2, AlertCircle, Download, FileEdit, Loader2, Trash2, Send } from 'lucide-react';
import { parseResultExcel } from '../../lib/excelParser';
import { saveResults, publishResults, calculateRanks } from '../../lib/resultService';
import { StudentResult, ExamConfig } from '../../types/result';
import { collection, getDocs, query, where, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';


// Mock functions for now - replace with actual toast implementation
const showToast = (message: string, type: 'success' | 'error') => {
  // In a real app, you'd use a library like react-toastify
  console.log(`Toast (${type}): ${message}`);
  // For this example, we'll just use a simple state to display the message
};

export function UploadTab({ EXAM_TYPES, allClasses, setStatus, userRole, assignedClasses }: any) {
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

  const [file, setFile] = useState<File | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [previousExams, setPreviousExams] = useState<ExamConfig[]>([]);

  const allowedClasses = userRole === 'admin' ? allClasses : assignedClasses;

  useEffect(() => {
    if (selectedClass) {
      fetchPreviousExams();
    }
  }, [selectedClass]);
  
  const fetchPreviousExams = async () => {
    if (!selectedClass) return;
    try {
      const q = query(
        collection(db, "examConfigs"), 
        where("classId", "==", selectedClass),
        where("academicYear", "==", academicYear)
      );
      const querySnapshot = await getDocs(q);
      const exams = querySnapshot.docs.map(doc => doc.data() as ExamConfig);
      setPreviousExams(exams);
    } catch (err) {
      console.error("Failed to fetch previous exams:", err);
      setError("Failed to load past exam data.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !selectedClass) {
      setError('Please select a class before uploading a file.');
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
        setError('Invalid file type. Please upload a .xlsx or .xls file.');
        return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const config: ExamConfig = { examType, classId: selectedClass, section: 'A', academicYear, totalStudents: 0, isPublished: false };
      const results = await parseResultExcel(selectedFile, config);
      setStudentResults(results);
    } catch (err: any) {
      setError(`Error parsing file: ${err.message}`);
      setFile(null);
      setStudentResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const processResults = async (publish: boolean) => {
    if (!studentResults || studentResults.length === 0) {
      setError('No student data to process.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Calculate Ranks
      const rankedResults = calculateRanks(studentResults);

      // 2. Save to Firestore
      await saveResults(rankedResults, examType, selectedClass, academicYear);

      // 3. (Optional) Publish Results
      if (publish) {
        await publishResults(examType, selectedClass, academicYear);
        setSuccess(`Results published! ${rankedResults.length} students can now see their results.`);
      } else {
        setSuccess(`Results saved as draft. ${rankedResults.length} students updated.`);
      }
      
      // Reset state on success
      setFile(null);
      setStudentResults(null);
      fetchPreviousExams();

    } catch (err: any) {
      setError(`Operation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepublish = async (exam: ExamConfig) => {
    if (!confirm(`Are you sure you want to republish results for ${exam.examType} - Class ${exam.classId}?`)) return;
    
    setIsLoading(true);
    try {
      await publishResults(exam.examType, exam.classId, exam.academicYear);
      setSuccess("Results have been republished successfully.");
      fetchPreviousExams(); // Refresh list
    } catch (err: any) {
      setError(`Republish failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (exam: ExamConfig) => {
    if (!confirm(`DANGER: This will delete all results for ${exam.examType} - Class ${exam.classId}. This cannot be undone. Proceed?`)) return;

    setIsLoading(true);
    try {
        // This is a simplified delete. A robust implementation would use a Cloud Function to recursively delete subcollections.
        const path = `results/${exam.academicYear}/${exam.examType}/${exam.classId}`;
        const querySnapshot = await getDocs(collection(db, path));
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Also delete the config doc
        const configDocId = `${exam.examType}_${exam.classId}_${exam.academicYear}`;
        await deleteDoc(doc(db, "examConfigs", configDocId));
        
        setSuccess("Exam and all associated results have been deleted.");
        fetchPreviousExams(); // Refresh list
    } catch (err: any) {
        console.error(err);
        setError(`Deletion failed: ${err.message}. Manual cleanup may be required.`);
    } finally {
        setIsLoading(false);
    }
  };
  
  const previewRows = useMemo(() => studentResults?.slice(0, 5) || [], [studentResults]);

  return (
    <div className="space-y-8">
      {/* --- Toasts/Alerts --- */}
      {isLoading && <div className="fixed top-4 right-4 bg-[#1E3A5F] text-white p-3 rounded-lg flex items-center gap-2 z-50"><Loader2 className="animate-spin" /> Processing...</div>}
      {success && <div className="fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg flex items-center gap-2 z-50"><CheckCircle2 /> {success}</div>}
      {error && <div className="fixed top-4 right-4 bg-red-600 text-white p-3 rounded-lg flex items-center gap-2 z-50"><AlertCircle /> {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- Left Column: Uploader --- */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Upload New Results</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Exam Type</label>
              <input list="upload-exam-types" value={examType} onChange={e => setExamType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] outline-none" />
              <datalist id="upload-exam-types">
                  {EXAM_TYPES.map((ex: string) => <option key={ex} value={ex} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
              <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setFile(null); setStudentResults(null); }} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] outline-none">
                  <option value="">-- Select Class --</option>
                  {allowedClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Upload File (.xlsx, .xls)</label>
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${!selectedClass ? 'bg-gray-100 cursor-not-allowed' : 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100'}`}>
                <Upload className="w-8 h-8 text-[#1E3A5F]" />
                <p className="font-semibold text-[#1E3A5F]">Click to upload</p>
                <p className="text-xs text-gray-500">{file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Select a file'}</p>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} disabled={!selectedClass} />
              </label>
            </div>
          </div>
        </div>

        {/* --- Right Column: Preview & Actions --- */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
           <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Preview & Actions</h2>
           {studentResults ? (
             <div className="space-y-4">
                <p className="font-semibold">Found {studentResults.length} students in the file.</p>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 text-left">Roll</th>
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-left">Total</th>
                                <th className="p-2 text-left">%</th>
                                <th className="p-2 text-left">Grade</th>
                                <th className="p-2 text-left">Division</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewRows.map(r => (
                                <tr key={r.rollNo} className="border-t">
                                    <td className="p-2">{r.rollNo}</td>
                                    <td className="p-2 font-medium">{r.name}</td>
                                    <td className="p-2">{r.total}</td>
                                    <td className="p-2">{r.percentage.toFixed(2)}</td>
                                    <td className="p-2">{r.grade}</td>
                                    <td className="p-2">{r.division}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {studentResults.length > 5 && <p className="text-sm text-gray-600 text-center">...and {studentResults.length - 5} more students.</p>}
                
                <div className="flex gap-4 pt-4">
                    <button onClick={() => processResults(false)} disabled={isLoading} className="flex-1 text-center px-4 py-2 border border-[#1E3A5F] text-[#1E3A5F] font-bold rounded-lg hover:bg-blue-50 disabled:bg-gray-200 disabled:cursor-wait">
                        {isLoading ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button onClick={() => processResults(true)} disabled={isLoading} className="flex-1 text-center px-4 py-2 bg-[#1E3A5F] text-white font-bold rounded-lg hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-wait">
                        {isLoading ? 'Publishing...' : 'Publish Results'}
                    </button>
                </div>
             </div>
           ) : (
             <div className="flex items-center justify-center h-full text-gray-500">
                <p>Upload a file to see a preview.</p>
             </div>
           )}
        </div>
      </div>

      {/* --- Bottom Section: Previous Uploads --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-8">
        <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Previously Uploaded for Class {selectedClass} ({academicYear})</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 text-left">Exam Type</th>
                        <th className="p-2 text-left">Students</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {previousExams.length > 0 ? previousExams.map(exam => (
                        <tr key={exam.examType} className="border-t">
                            <td className="p-2 font-medium">{exam.examType}</td>
                            <td className="p-2">{exam.totalStudents}</td>
                            <td className="p-2">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {exam.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </td>
                            <td className="p-2 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => handleRepublish(exam)} title="Republish" className="text-green-600 hover:text-green-800 disabled:text-gray-400" disabled={isLoading}>
                                        <Send size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(exam)} title="Delete" className="text-red-600 hover:text-red-800 disabled:text-gray-400" disabled={isLoading}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="text-center p-4 text-gray-500">No previous uploads found for this class and year.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
