import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { BookOpen, Users, Folder, AlertCircle, FileSpreadsheet, Edit2, Search, Settings, Loader2, Upload, CheckCircle } from 'lucide-react';

import { UploadTab } from '../components/admin/UploadTab';
import { ManualEntryTab } from '../components/admin/ManualEntryTab';
import { ViewManageTab } from '../components/admin/ViewManageTab';
import { ReportCardsTab } from '../components/admin/ReportCardsTab';

import { StudentResult } from '../data/resultsState';

const EXAM_TYPES = ['First Terminal Examination', 'Second Terminal Examination', 'Third Terminal Examination', 'Final Examination'];
const DEFAULT_CLASSES = ['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Nepali', 'Social Studies', 'Computer', 'HPE', 'Opt. Math'];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('manual'); // 'upload', 'manual'
  const [data, setData] = useState<StudentResult[]>([]);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Role & Teacher restrictions
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student'>('admin');
  const [isTeacherSetupDone, setIsTeacherSetupDone] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  
  const dynamicExamTypes = useMemo(() => {
     const types = new Set(EXAM_TYPES);
     data.forEach(d => types.add(d.examType));
     return Array.from(types);
  }, [data]);

  useEffect(() => {
    // Determine role (simplified for demo, usually from Auth)
    const storedRole = localStorage.getItem('userRole') || 'admin';
    setUserRole(storedRole as any);

    if (storedRole === 'teacher') {
        const savedClasses = JSON.parse(localStorage.getItem('teacherClasses') || '[]');
        const savedSubs = JSON.parse(localStorage.getItem('teacherSubjects') || '[]');
        setAssignedClasses(savedClasses);
        setAssignedSubjects(savedSubs);
        if (savedClasses.length > 0) setIsTeacherSetupDone(true);
    } else {
        setIsTeacherSetupDone(true);
    }
  }, []);

  useEffect(() => {
     let unsubExams: any;
     let unsubSummary: any;
     let unsubResults: any;

     const subscribeToResults = () => {
         setLoading(true);
         let examsMap: Record<string, any> = {};
         let summaryList: any[] = [];
         let resultsList: any[] = [];

         const updateState = () => {
             const resultsBySummaryId: Record<string, any> = {};
             resultsList.forEach(sub => {
                 const mapId = `${sub.examId}_${sub.studentId}`;
                 if (!resultsBySummaryId[mapId]) resultsBySummaryId[mapId] = {};
                 resultsBySummaryId[mapId][sub.subject] = {
                     fullMarks: sub.fullMarks, obtained: sub.marks
                 };
             });

             const parsedData: StudentResult[] = summaryList.map(sum => {
                 const exm = examsMap[sum.examId];
                 return {
                    studentId: sum.studentId,
                    studentName: sum.studentName,
                    class: sum.class,
                    rollNo: sum.rollNo || '',
                    examType: sum.examType,
                    subjects: resultsBySummaryId[`${sum.examId}_${sum.studentId}`] || {},
                    total: sum.total,
                    fullTotal: sum.fullTotal,
                    percentage: sum.percentage,
                    grade: sum.grade,
                    gpa: sum.gpa || 0,
                    rank: sum.rank || 0,
                    published: exm ? exm.published : false,
                    classTeacherRemark: sum.classTeacherRemark || ''
                 }
             });
             setData(parsedData);
             setLoading(false);
         };

         try {
             unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
                 examsMap = {};
                 snap.forEach(doc => examsMap[doc.id] = doc.data());
                 updateState();
             }, (e) => { 
                console.error("Snapshot error:", e); 
                setLoading(false); 
                handleFirestoreError(e, OperationType.LIST, 'exams');
             });

             unsubSummary = onSnapshot(collection(db, 'resultSummary'), (snap) => {
                 summaryList = [];
                 snap.forEach(doc => summaryList.push({ id: doc.id, ...doc.data() }));
                 updateState();
             }, (e) => { 
                console.error("Snapshot error:", e); 
                setLoading(false);
                handleFirestoreError(e, OperationType.LIST, 'resultSummary');
             });

             unsubResults = onSnapshot(collection(db, 'results'), (snap) => {
                 resultsList = [];
                 snap.forEach(doc => resultsList.push({ id: doc.id, ...doc.data() }));
                 updateState();
             }, (e) => { 
                console.error("Snapshot error:", e); 
                setLoading(false);
                handleFirestoreError(e, OperationType.LIST, 'results');
             });
         } catch (err: any) {
             setLoading(false);
         }
     };

     const unsubAuth = onAuthStateChanged(auth, (user) => {
         if (user) {
             subscribeToResults();
         } else {
             if (unsubExams) unsubExams();
             if (unsubSummary) unsubSummary();
             if (unsubResults) unsubResults();
             setLoading(false);
         }
     });

     return () => {
         unsubAuth();
         if (unsubExams) unsubExams();
         if (unsubSummary) unsubSummary();
         if (unsubResults) unsubResults();
     };
  }, []);

  useEffect(() => {
    if (status) {
        // Data is auto-updated via onSnapshot, so we don't need a manual fetch command
        const timer = setTimeout(() => setStatus(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [status]);

  const teacherSetupSave = () => {
      localStorage.setItem('teacherClasses', JSON.stringify(assignedClasses));
      localStorage.setItem('teacherSubjects', JSON.stringify(assignedSubjects));
      setIsTeacherSetupDone(true);
      setStatus({type: 'success', message: 'Teacher profile configured.'});
  };

  const handleTeacherClassToggle = (c: string) => {
      setAssignedClasses(prev => prev.includes(c) ? prev.filter(x => x!==c) : [...prev, c]);
  };
  const handleTeacherSubjectToggle = (s: string) => {
      setAssignedSubjects(prev => prev.includes(s) ? prev.filter(x => x!==s) : [...prev, s]);
  };

  const allowedClasses = userRole === 'admin' ? DEFAULT_CLASSES : assignedClasses;

  // Derive Summary Card Stats
  const stats = useMemo(() => {
      const studentIds = new Set(data.map(r => r.studentId));
      const exams = new Set(data.map(r => r.examType));
      const activeClasses = new Set(data.map(r => String(r.class)));
      
      const pendingClasses = DEFAULT_CLASSES.length - activeClasses.size;

      return {
          totalStudents: studentIds.size,
          examsUploaded: exams.size,
          classesWithResults: activeClasses.size,
          pendingClasses: pendingClasses > 0 ? pendingClasses : 0
      };
  }, [data]);

  if (userRole === 'teacher' && !isTeacherSetupDone) {
      return (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-10">
              <h2 className="text-2xl font-black text-primary mb-2 text-center">Teacher Initial Setup</h2>
              <p className="text-gray-500 text-center mb-8">Please configure your assigned classes and subjects. You will only be able to manage results for these selections.</p>
              
              <div className="mb-6">
                 <label className="font-bold block mb-3 text-gray-700 uppercase tracking-widest text-sm">Assigned Classes</label>
                 <div className="flex flex-wrap gap-2">
                    {DEFAULT_CLASSES.map(c => (
                        <button key={c} onClick={() => handleTeacherClassToggle(c)} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${assignedClasses.includes(c) ? 'bg-[var(--primary)] text-white' : 'bg-white text-gray-600 hover:opacity-90'}`}>Class {c}</button>
                    ))}
                 </div>
              </div>
              <div className="mb-8">
                 <label className="font-bold block mb-3 text-gray-700 uppercase tracking-widest text-sm">Assigned Subjects</label>
                 <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map(s => (
                        <button key={s} onClick={() => handleTeacherSubjectToggle(s)} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${assignedSubjects.includes(s) ? 'bg-[#10b981] text-white border-[#10b981]' : 'bg-white text-gray-600 hover:opacity-90'}`}>{s}</button>
                    ))}
                 </div>
              </div>

              <button onClick={teacherSetupSave} disabled={assignedClasses.length === 0 || assignedSubjects.length === 0} className={`w-full py-4 rounded-xl font-black text-lg transition-transform active:scale-95 shadow-md ${assignedClasses.length > 0 && assignedSubjects.length > 0 ? '- text-white hover:opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  Save Configuration
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
       
       {status && (
           <div className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold shadow-sm ${status.type === 'success' ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' : 'bg-red-50 text-red-700 border border-red-200'}`}>
               <div className="flex items-center gap-2">
                   {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                   {status.message}
               </div>
           </div>
       )}

       {/* Top Summary Cards Row */}
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
               <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2"><Users className="w-5 h-5"/></div>
               <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Total Students</p>
               <h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
               <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2"><FileSpreadsheet className="w-5 h-5"/></div>
               <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Exams Uploaded</p>
               <h3 className="text-3xl font-black text-gray-800">{stats.examsUploaded}</h3>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
               <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2"><Folder className="w-5 h-5"/></div>
               <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Classes Configured</p>
               <h3 className="text-3xl font-black text-gray-800">{stats.classesWithResults}</h3>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
               <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-2"><AlertCircle className="w-5 h-5"/></div>
               <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Pending Classes</p>
               <h3 className="text-3xl font-black text-gray-800">{stats.pendingClasses}</h3>
           </div>
       </div>

       {/* Tabs Header */}
       <div className="flex overflow-x-auto bg-white rounded-xl border border-gray-200 p-2 gap-2 shadow-sm font-bold scrollbar-hide">
           <button onClick={()=>setActiveTab('manual')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'manual' ? '- text-white shadow-md' : 'text-gray-600 hover:opacity-90'}`}>
               <Edit2 className="w-4 h-4"/> Manual Entry
           </button>
           <button onClick={()=>setActiveTab('upload')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'upload' ? '- text-white shadow-md' : 'text-gray-600 hover:opacity-90'}`}>
               <Upload className="w-4 h-4"/> Excel Upload
           </button>
           <button onClick={()=>setActiveTab('history')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'history' ? '- text-white shadow-md' : 'text-gray-600 hover:opacity-90'}`}>
               <BookOpen className="w-4 h-4"/> History
           </button>
           <button onClick={()=>setActiveTab('reportcards')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'reportcards' ? '- text-white shadow-md' : 'text-gray-600 hover:opacity-90'}`}>
               <FileSpreadsheet className="w-4 h-4"/> Report Cards
           </button>
       </div>

       {/* Tab Contents */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
           {loading ? (
              <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                  <p className="font-bold">Loading Academic Data...</p>
              </div>
           ) : (
               <>
                   {activeTab === 'upload' && (
                       <UploadTab 
                           EXAM_TYPES={EXAM_TYPES} 
                           allClasses={DEFAULT_CLASSES} 
                           data={data} 
                           setStatus={setStatus} 
                           userRole={userRole} 
                           assignedClasses={assignedClasses} 
                           assignedSubjects={assignedSubjects} 
                       />
                   )}
                   {activeTab === 'manual' && (
                       <ManualEntryTab 
                           EXAM_TYPES={EXAM_TYPES} 
                           allClasses={DEFAULT_CLASSES} 
                           allSubjects={SUBJECTS}
                           data={data} 
                           setStatus={setStatus} 
                           userRole={userRole} 
                           assignedClasses={assignedClasses} 
                           assignedSubjects={assignedSubjects} 
                       />
                   )}
                   {activeTab === 'history' && (
                       <ViewManageTab 
                           EXAM_TYPES={dynamicExamTypes} 
                           allClasses={DEFAULT_CLASSES} 
                           data={data} 
                           setStatus={setStatus} 
                           userRole={userRole} 
                           assignedClasses={assignedClasses} 
                       />
                   )}
                   {activeTab === 'reportcards' && (
                       <ReportCardsTab 
                           EXAM_TYPES={dynamicExamTypes} 
                           allClasses={DEFAULT_CLASSES} 
                           data={data} 
                           setStatus={setStatus} 
                           userRole={userRole} 
                           assignedClasses={assignedClasses} 

                       />
                   )}
               </>
           )}
       </div>
    </div>
  );
}
