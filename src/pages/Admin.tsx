import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs } from 'firebase/firestore';
import { BookOpen, Users, Folder, AlertCircle, FileSpreadsheet, Edit2, Search, Settings, Loader2, Upload, CheckCircle } from 'lucide-react';

import { UploadTab } from '../components/admin/UploadTab';
import { ManualEntryTab } from '../components/admin/ManualEntryTab';
import { ViewManageTab } from '../components/admin/ViewManageTab';
import { ReportCardsTab } from '../components/admin/ReportCardsTab';

import { StudentResult } from '../data/resultsState';

const EXAM_TYPES = ['Terminal 1', 'Unit Test 1', 'Terminal 2', 'Final Exam'];
const DEFAULT_CLASSES = ['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Nepali', 'Social Studies', 'Computer', 'HPE', 'Opt. Math'];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('view'); // 'upload', 'manual', 'view', 'reports'
  const [data, setData] = useState<StudentResult[]>([]);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Role & Teacher restrictions
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student'>('admin');
  const [isTeacherSetupDone, setIsTeacherSetupDone] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);

  const fetchResults = async () => {
      setLoading(true);
      try {
         // Fetch all exams to know published status
         const examsSnap = await getDocs(collection(db, 'exams'));
         const examsMap: Record<string, any> = {};
         examsSnap.forEach(doc => {
            examsMap[doc.id] = doc.data();
         });

         // Fetch summaries
         const summarySnap = await getDocs(collection(db, 'resultSummary'));
         const summaryList: any[] = [];
         summarySnap.forEach(doc => summaryList.push({ id: doc.id, ...doc.data() }));

         // Fetch subjects
         const resultsSnap = await getDocs(collection(db, 'results'));
         const resultsBySummaryId: Record<string, any> = {};
         resultsSnap.forEach(doc => {
             const sub = doc.data();
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
      } catch (err: any) {
         if (err.message.includes("permission")) {
            setStatus({type: 'error', message: "Permission Denied: You must be an admin or assigned teacher to view all class results."});
         } else {
            console.error("Error loading results:", err);
            setStatus({type: 'error', message: "Could not load results: " + err.message});
         }
      } finally {
         setLoading(false);
      }
  };

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

    const unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchResults();
        } else {
            setLoading(false);
        }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (status) {
        if(status.message.includes('saved successfully')) {
             fetchResults();
        }
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
              <h2 className="text-2xl font-black text-[#1e3a8a] mb-2 text-center">Teacher Initial Setup</h2>
              <p className="text-gray-500 text-center mb-8">Please configure your assigned classes and subjects. You will only be able to manage results for these selections.</p>
              
              <div className="mb-6">
                 <label className="font-bold block mb-3 text-gray-700 uppercase tracking-widest text-sm">Assigned Classes</label>
                 <div className="flex flex-wrap gap-2">
                    {DEFAULT_CLASSES.map(c => (
                        <button key={c} onClick={() => handleTeacherClassToggle(c)} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${assignedClasses.includes(c) ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Class {c}</button>
                    ))}
                 </div>
              </div>
              <div className="mb-8">
                 <label className="font-bold block mb-3 text-gray-700 uppercase tracking-widest text-sm">Assigned Subjects</label>
                 <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map(s => (
                        <button key={s} onClick={() => handleTeacherSubjectToggle(s)} className={`px-4 py-2 rounded-lg font-bold border transition-colors ${assignedSubjects.includes(s) ? 'bg-[#10b981] text-white border-[#10b981]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{s}</button>
                    ))}
                 </div>
              </div>

              <button onClick={teacherSetupSave} disabled={assignedClasses.length === 0 || assignedSubjects.length === 0} className={`w-full py-4 rounded-xl font-black text-lg transition-transform active:scale-95 shadow-md ${assignedClasses.length > 0 && assignedSubjects.length > 0 ? 'bg-[#1e3a8a] text-white hover:bg-[#1e40af]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
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
           <button onClick={()=>setActiveTab('view')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'view' ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
               <Search className="w-4 h-4"/> View & Manage
           </button>
           <button onClick={()=>setActiveTab('manual')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'manual' ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
               <Edit2 className="w-4 h-4"/> Manual Entry
           </button>
           <button onClick={()=>setActiveTab('upload')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
               <Upload className="w-4 h-4"/> Excel Upload
           </button>
           {userRole === 'admin' && (
               <button onClick={()=>setActiveTab('reports')} className={`flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'reports' ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
                   <BookOpen className="w-4 h-4"/> Report Cards
               </button>
           )}
       </div>

       {/* Tab Contents */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
           {loading ? (
              <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#1e3a8a]" />
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
                   {activeTab === 'view' && (
                       <ViewManageTab 
                           EXAM_TYPES={EXAM_TYPES} 
                           allClasses={DEFAULT_CLASSES} 
                           data={data} 
                           setStatus={setStatus} 
                           userRole={userRole} 
                           assignedClasses={assignedClasses} 
                       />
                   )}
                   {activeTab === 'reports' && userRole === 'admin' && (
                       <ReportCardsTab 
                           EXAM_TYPES={EXAM_TYPES} 
                           allClasses={DEFAULT_CLASSES} 
                           data={data} 
                           setStatus={setStatus} 
                       />
                   )}
               </>
           )}
       </div>
    </div>
  );
}
