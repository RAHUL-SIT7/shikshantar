import React, { useState, useEffect } from 'react';
import { CheckCircle2, Save, Loader2, AlertCircle } from 'lucide-react';
import { StudentResult } from '../../data/resultsState';
import { doc, writeBatch, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const CLASS_SUBJECTS: any = {
  'PG': ['English', 'Nepali', 'Math', 'Drawing', 'Rhymes'],
  'Nursery': ['English', 'Nepali', 'Math', 'Drawing', 'Rhymes'],
  'LKG': ['English', 'Nepali', 'Math', 'Drawing', 'Rhymes'],
  'UKG': ['English', 'Nepali', 'Math', 'Drawing', 'Rhymes'],
  '1': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK'],
  '2': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK'],
  '3': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK'],
  '4': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK', 'Moral Science'],
  '5': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK', 'Moral Science'],
  '6': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK', 'Moral Science', 'Opt Math'],
  '7': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK', 'Moral Science', 'Opt Math'],
  '8': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Computer', 'GK', 'Moral Science', 'Opt Math'],
  '9': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Opt Math', 'Opt II'],
  '10': ['English', 'Nepali', 'Math', 'Science', 'Social', 'Opt Math', 'Opt II']
};

export function ManualEntryTab({ EXAM_TYPES, allClasses, allSubjects, data, setStatus, userRole, assignedClasses, assignedSubjects }: any) {
  const [examCategory, setExamCategory] = useState<'Test' | 'Terminal'>('Test');
  const [examType, setExamType] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, {fullMarks: number, passMarks: number}>>({});
  
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const allowedClasses = userRole === 'admin' ? allClasses : assignedClasses;
  const dynamicSubjects = selectedClass ? (CLASS_SUBJECTS[selectedClass] || allSubjects) : [];
  const allowedSubjects = userRole === 'admin' ? dynamicSubjects : assignedSubjects.filter((s: string) => dynamicSubjects.includes(s));
  const allowedSubjectsWithAll = ["All Subjects", ...allowedSubjects];


  const getNepalGPA = (pct: number) => {
      if (pct >= 90) return 4.0;
      if (pct >= 80) return 3.6;
      if (pct >= 70) return 3.2;
      if (pct >= 60) return 2.8;
      if (pct >= 50) return 2.4;
      if (pct >= 40) return 2.0;
      if (pct >= 35) return 1.6;
      return 0.0;
  };

  const getGrade = (marks: number | 'AB', fm: number, pm?: number) => {
    if (marks === 'AB') return 'NG';
    if (pm !== undefined && marks < pm) return 'NG';
    const pct = (marks / fm) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C+';
    if (pct >= 40) return 'C';
    if (pct >= 30) return 'D';
    return 'NG';
  };

  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
          // Get all students in this class from the users collection
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('class', '==', selectedClass)));
          
          let classStudents = usersSnap.docs.map(d => {
             const usr = d.data();
             return {
                 studentId: d.id,
                 studentName: usr.firstName && usr.lastName ? `${usr.firstName} ${usr.lastName}` : (usr.email || 'Unknown')
             };
          });

          // Fallback if no students in users col: try the current results to prefill
          if (classStudents.length === 0) {
              const classResults = (data as StudentResult[]).filter(r => String(r.class) === selectedClass);
              const uniqueStudentsMap = new Map<string, {studentId: string, studentName: string}>();
              classResults.forEach(r => uniqueStudentsMap.set(r.studentId, {studentId: r.studentId, studentName: r.studentName}));
              classStudents = Array.from(uniqueStudentsMap.values());
          }
          
          const classResults = (data as StudentResult[]).filter(r => String(r.class) === selectedClass);

          const mapped = classStudents.map(s => {
              const existingRec = classResults.find(r => r.studentId === s.studentId && r.examType === examType);
              
              const subjectMarks: Record<string, string> = {};
              const subjectAbsents: Record<string, boolean> = {};

              dynamicSubjects.forEach((subj: string) => {
                  const m = existingRec?.subjects?.[subj]?.obtained;
                  if (m !== undefined) {
                     if (m === 'AB') {
                         subjectAbsents[subj] = true;
                         subjectMarks[subj] = '';
                     } else {
                         subjectMarks[subj] = String(m);
                         subjectAbsents[subj] = false;
                     }
                  } else {
                     subjectMarks[subj] = '';
                     subjectAbsents[subj] = false;
                  }
              });

              // for single subject
              const existingMarks = selectedSubject !== 'All Subjects' ? existingRec?.subjects?.[selectedSubject]?.obtained : undefined;
              return {
                  ...s,
                  Class: selectedClass,
                  tempMark: existingMarks !== undefined && existingMarks !== 'AB' ? String(existingMarks) : '',
                  isAbsent: existingMarks === 'AB',
                  subjectMarks,
                  subjectAbsents,
              };
          });

          setStudents(mapped);
      } catch (err) {
          console.error("Error loading students config:", err);
      } finally {
          setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedClass, selectedSubject, examType, data]);

  const handleMarkChange = (idx: number, val: string, subj?: string) => {
      const v = Number(val);
      const subjConfig = subjectConfigs[subj || selectedSubject] || { fullMarks: 100, passMarks: 40 };
      if (val !== '' && (v > subjConfig.fullMarks || v < 0)) return; // prevent invalid
      const newS = [...students];
      if (subj) {
          newS[idx].subjectMarks[subj] = val;
      } else {
          newS[idx].tempMark = val;
      }
      setStudents(newS);
  };

  const handleAbsentChange = (idx: number, checked: boolean, subj?: string) => {
      const newS = [...students];
      if (subj) {
          newS[idx].subjectAbsents[subj] = checked;
      } else {
          newS[idx].isAbsent = checked;
      }
      setStudents(newS);
  };

  const handleStudentChange = (idx: number, field: string, val: string) => {
      const newS = [...students];
      newS[idx][field] = val;
      setStudents(newS);
  };

  const addStudentRow = () => {
      const subjectMarks: Record<string, string> = {};
      const subjectAbsents: Record<string, boolean> = {};
      dynamicSubjects.forEach((subj: string) => {
          subjectMarks[subj] = '';
          subjectAbsents[subj] = false;
      });
      setStudents([...students, { 
          studentId: `S${Date.now().toString().slice(-6)}`, 
          studentName: '', 
          Class: selectedClass,
          tempMark: '', 
          isAbsent: false,
          subjectMarks,
          subjectAbsents
      }]);
  };

  const markAllPresent = () => {
      const newS = students.map(s => {
          const newSbjAbs = {...s.subjectAbsents};
          Object.keys(newSbjAbs).forEach(k => newSbjAbs[k] = false);
          return {...s, isAbsent: false, subjectAbsents: newSbjAbs};
      });
      setStudents(newS);
  };

  const saveMarks = async () => {
      try {
          const examId = `${examType.replace(/\s+/g, '_')}_${selectedClass}`;

          setStatus({type: 'info', message: 'Saving marks to Firebase...'});

          try {
              await setDoc(doc(db, "exams", examId), {
                  name: examType,
                  type: examType,
                  class: selectedClass,
                  academicYear: new Date().getFullYear().toString(),
                  published: false
              }, { merge: true });
          } catch (e: any) {
              console.error("Error creating exam document:", e);
              throw new Error("Failed to create Exam document: " + e.message);
          }

          let batch = writeBatch(db);
          let opCount = 0;

          for (const std of students) {
              let finalMarksParams: Record<string, number | 'AB'> = {};

              if (selectedSubject === 'All Subjects') {
                  dynamicSubjects.forEach((subj: string) => {
                      const smark = std.subjectAbsents[subj] ? 'AB' : (std.subjectMarks[subj] === '' ? '' : Number(std.subjectMarks[subj]));
                      if (smark !== '') {
                          finalMarksParams[subj] = smark;
                      }
                  });
              } else {
                  const finalVal = std.isAbsent ? 'AB' : (std.tempMark === '' ? '' : Number(std.tempMark));
                  if (finalVal !== '') {
                      finalMarksParams[selectedSubject] = finalVal;
                  }
              }

              if (Object.keys(finalMarksParams).length === 0) continue; // Skip empty

              const existingIdx = (data as StudentResult[]).findIndex(r => r.studentId === std.studentId && r.examType === examType);
              
              if (existingIdx >= 0) {
                  const rec = { ...data[existingIdx] };
                  let updatedSubjects = { ...rec.subjects };
                  
                  Object.entries(finalMarksParams).forEach(([subj, val]) => {
                      const subjConfig = subjectConfigs[subj] || { fullMarks: 100, passMarks: 40 };
                      updatedSubjects[subj] = { fullMarks: subjConfig.fullMarks, passMarks: subjConfig.passMarks, obtained: val };
                      const subjectDocId = `${examId}_${std.studentId}_${subj.replace(/\s+/g, '')}`;
                      batch.set(doc(db, 'results', subjectDocId), {
                          studentId: std.studentId,
                          examId: examId,
                          subject: subj,
                          marks: val,
                          fullMarks: subjConfig.fullMarks,
                          passMarks: subjConfig.passMarks
                      });
                      opCount++;
                  });
                  rec.subjects = updatedSubjects;
                  
                  // Recalculate totals
                  let t = 0; let ft = 0;
                  Object.values(rec.subjects).forEach((s: any) => {
                      if (s.obtained !== 'AB') t += s.obtained;
                      ft += s.fullMarks;
                  });
                  rec.total = t;
                  rec.fullTotal = ft;
                  rec.percentage = ft > 0 ? (t / ft) * 100 : 0;
                  rec.grade = getGrade(t, ft); // Note: Simple sum grade
                  rec.gpa = getNepalGPA(rec.percentage);
                  rec.studentName = std.studentName || rec.studentName;

                  const summaryDocId = `${examId}_${std.studentId}`;
                  batch.set(doc(db, 'resultSummary', summaryDocId), {
                      studentId: std.studentId,
                      studentName: rec.studentName,
                      class: String(rec.class),
                      examId: examId,
                      examType: examType,
                      total: rec.total,
                      fullTotal: rec.fullTotal,
                      percentage: rec.percentage,
                      grade: rec.grade,
                      rank: rec.rank || 0,
                      gpa: rec.gpa
                  });
                  opCount++;

              } else {
                  // Creating a new result for this student + exam
                  
                  let newSubjects: any = {};
                  Object.entries(finalMarksParams).forEach(([subj, val]) => {
                      const subjConfig = subjectConfigs[subj] || { fullMarks: 100, passMarks: 40 };
                      newSubjects[subj] = { fullMarks: subjConfig.fullMarks, passMarks: subjConfig.passMarks, obtained: val };
                      const subjectDocId = `${examId}_${std.studentId}_${subj.replace(/\s+/g, '')}`;
                      batch.set(doc(db, 'results', subjectDocId), {
                          studentId: std.studentId,
                          examId: examId,
                          subject: subj,
                          marks: val,
                          fullMarks: subjConfig.fullMarks,
                          passMarks: subjConfig.passMarks
                      });
                      opCount++;
                  });

                  // Calculate totals for new
                  let t = 0; let ft = 0;
                  Object.values(newSubjects).forEach((s: any) => {
                      if (s.obtained !== 'AB') t += s.obtained;
                      ft += s.fullMarks;
                  });

                  const newRec: StudentResult = {
                      studentId: std.studentId,
                      studentName: std.studentName,
                      class: std.Class || selectedClass,
                      rollNo: '00',
                      examType: examType,
                      subjects: newSubjects,
                      total: t,
                      fullTotal: ft,
                      percentage: ft > 0 ? (t / ft) * 100 : 0,
                      grade: getGrade(t, ft),
                      gpa: getNepalGPA(ft > 0 ? (t / ft) * 100 : 0),
                      rank: 0,
                      published: false,
                      classTeacherRemark: '' // added
                  };
                  
                  const summaryDocId = `${examId}_${std.studentId}`;
                  batch.set(doc(db, 'resultSummary', summaryDocId), {
                      studentId: newRec.studentId,
                      studentName: newRec.studentName,
                      class: String(newRec.class),
                      examId: examId,
                      examType: examType,
                      total: newRec.total,
                      fullTotal: newRec.fullTotal,
                      percentage: newRec.percentage,
                      grade: newRec.grade,
                      rank: newRec.rank,
                      gpa: newRec.gpa
                  });
                  opCount++;
              }

              if (opCount > 400) {
                  try {
                      await batch.commit();
                  } catch (e: any) {
                      throw new Error("Batch commit failed (>400): " + e.message);
                  }
                  batch = writeBatch(db);
                  opCount = 0;
              }
          }
          if (opCount > 0) {
              try {
                  await batch.commit();
              } catch (e: any) {
                  throw new Error("Final batch commit failed: " + e.message);
              }
          }

          setStatus({type: 'success', message: `Class ${selectedClass} ${selectedSubject} - ${examType} marks saved successfully!` });
      } catch (err: any) {
          console.error("Manual save error", err);
          setStatus({type: 'error', message: 'Failed to save marks: ' + err.message});
      }
  };

  const publishResults = async () => {
    if (!selectedClass || !examType) return;
    setStatus({type: 'info', message: 'Calculating ranks and publishing results...'});
    try {
        const examId = `${examType.replace(/\s+/g, '_')}_${selectedClass}`;
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
             
             // Keep batch limits safe
        });
        
        batch.update(doc(db, 'exams', examId), { published: true });
        
        await batch.commit();
        setStatus({type: 'success', message: `Results and Ranks Published successfully for Class ${selectedClass}.`});
    } catch(err: any) {
        setStatus({type: 'error', message: 'Publish failed: ' + err.message});
    }
  };

  const isDataComplete = () => {
      if (students.length === 0) return false;
      for (const std of students) {
          if (!std.studentId?.trim() || !std.studentName?.trim()) return false;
          if (selectedSubject === 'All Subjects') {
              for (const subj of dynamicSubjects) {
                  if (!std.subjectAbsents[subj] && (std.subjectMarks[subj] === '' || std.subjectMarks[subj] === undefined)) {
                      return false;
                  }
              }
          } else {
              if (!std.isAbsent && (std.tempMark === '' || std.tempMark === undefined)) {
                  return false;
              }
          }
      }
      return true;
  };

  const isAnyDataEntered = () => {
      if (students.length === 0) return false;
      for (const std of students) {
          if (selectedSubject === 'All Subjects') {
              for (const subj of dynamicSubjects) {
                  if (std.subjectAbsents[subj] || (std.subjectMarks[subj] !== '' && std.subjectMarks[subj] !== undefined)) {
                      return true;
                  }
              }
          } else {
              if (std.isAbsent || (std.tempMark !== '' && std.tempMark !== undefined)) {
                  return true;
              }
          }
      }
      return false;
  };

  return (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="flex flex-col justify-end">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
               <div className="flex gap-4 items-center h-[42px]">
                   <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" value="Terminal" checked={examCategory === 'Terminal'} onChange={() => { setExamCategory('Terminal'); setExamType(''); }} className="w-4 h-4 text-[#1e3a8a] focus:ring-[#1e3a8a] outline-none" />
                       <span className="text-sm font-bold">Terminal</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" value="Test" checked={examCategory === 'Test'} onChange={() => { setExamCategory('Test'); setExamType(''); }} className="w-4 h-4 text-[#1e3a8a] focus:ring-[#1e3a8a] outline-none" />
                       <span className="text-sm font-bold">Test</span>
                   </label>
               </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Exam Name</label>
               {examCategory === 'Terminal' ? (
                 <select 
                   value={examType} 
                   onChange={e=>setExamType(e.target.value)} 
                   className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium h-[42px]"
                 >
                     <option value="">-- Select Terminal --</option>
                     {EXAM_TYPES.map((ex:string) => <option key={ex} value={ex}>{ex}</option>)}
                 </select>
               ) : (
                 <input 
                   type="text" 
                   value={examType} 
                   onChange={e=>setExamType(e.target.value)} 
                   className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium h-[42px]"
                   placeholder="e.g. Unit Test 1"
                 />
               )}
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Class</label>
               <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium">
                   <option value="">-- Select Class --</option>
                   {allowedClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
               <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium">
                   <option value="">-- Subject --</option>
                   {allowedSubjectsWithAll.map((s: string) => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
            
            {selectedSubject === 'All Subjects' ? (
               <div className="col-span-1 md:col-span-6 mt-2">
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subject Full Marks & Pass Marks</label>
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                       {dynamicSubjects.map((subj: string) => (
                           <div key={subj} className="bg-gray-50 p-2 rounded-lg border flex flex-col gap-2">
                               <div className="text-xs font-bold text-gray-700 truncate">{subj}</div>
                               <div className="flex gap-2">
                                   <div className="flex-1">
                                       <label className="text-[10px] text-gray-400">Full</label>
                                       <input type="number" value={subjectConfigs[subj]?.fullMarks ?? 100} onChange={e => setSubjectConfigs({...subjectConfigs, [subj]: {...(subjectConfigs[subj] || {passMarks:40}), fullMarks: Number(e.target.value)||0}})} className="w-full px-1 py-1 text-sm border rounded text-center focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] bg-white font-bold" />
                                   </div>
                                   <div className="flex-1">
                                       <label className="text-[10px] text-gray-400">Pass</label>
                                       <input type="number" value={subjectConfigs[subj]?.passMarks ?? 40} onChange={e => setSubjectConfigs({...subjectConfigs, [subj]: {...(subjectConfigs[subj] || {fullMarks:100}), passMarks: Number(e.target.value)||0}})} className="w-full px-1 py-1 text-sm border rounded text-center focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] bg-white font-bold" />
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
            ) : (
                selectedSubject && (
                   <div className="col-span-1 md:col-span-6 flex gap-4 mt-2">
                      <div className="flex-1">
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Marks</label>
                         <input type="number" value={subjectConfigs[selectedSubject]?.fullMarks ?? 100} onChange={e=>setSubjectConfigs({...subjectConfigs, [selectedSubject]: {...(subjectConfigs[selectedSubject] || {passMarks:40}), fullMarks: Number(e.target.value)||0}})} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-bold text-[#1e3a8a]" />
                      </div>
                      <div className="flex-1">
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pass Marks</label>
                         <input type="number" value={subjectConfigs[selectedSubject]?.passMarks ?? 40} onChange={e=>setSubjectConfigs({...subjectConfigs, [selectedSubject]: {...(subjectConfigs[selectedSubject] || {fullMarks:100}), passMarks: Number(e.target.value)||0}})} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-bold text-[#1e3a8a]" />
                      </div>
                   </div>
                )
            )}
        </div>

        {!selectedClass || !selectedSubject ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
               <AlertCircle className="mx-auto w-10 h-10 text-gray-400 mb-2" />
               <p className="font-bold text-gray-600">Select Class and Subject to start entering marks.</p>
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 p-3 px-4 border-b flex justify-between items-center whitespace-nowrap overflow-x-auto">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        Student List ({students.length})
                        {loadingStudents && <Loader2 className="w-4 h-4 animate-spin text-[#1e3a8a]" />}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={addStudentRow} className="bg-white border border-[#1e3a8a] py-1 px-3 rounded-md font-bold text-sm text-[#1e3a8a] hover:bg-blue-50 active:scale-95 transition-all">+ Add Student Row</button>
                        <button onClick={markAllPresent} className="bg-white border rounded-md px-3 py-1 font-bold text-sm text-gray-600 hover:bg-gray-50 active:scale-95 transition-all">Mark All Present</button>
                    </div>
                </div>
                
                {/* Desktop view */}
                <div className="hidden md:block overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead>
                           <tr className="bg-gray-50 border-b">
                               <th className="p-3">Roll / ID</th>
                               <th className="p-3">Student Name</th>
                               {selectedSubject === 'All Subjects' ? (
                                   dynamicSubjects.map((subj: string) => (
                                       <th key={subj} className="p-3 text-center">{subj}</th>
                                   ))
                               ) : (
                                   <>
                                      <th className="p-3">Absent?</th>
                                      <th className="p-3 w-48">Marks Obtained</th>
                                      <th className="p-3">Grade</th>
                                   </>
                               )}
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {students.map((std, i) => (
                               <tr key={i} className="hover:bg-gray-50">
                                   <td className="p-3">
                                       <input type="text" value={std.studentId} onChange={e => handleStudentChange(i, 'studentId', e.target.value)} className="w-full min-w-[80px] px-2 py-1.5 border rounded-md font-medium text-gray-600 focus:ring-1 focus:ring-[#1e3a8a] outline-none" placeholder="Roll/ID" />
                                   </td>
                                   <td className="p-3">
                                       <input type="text" value={std.studentName} onChange={e => handleStudentChange(i, 'studentName', e.target.value)} className="w-full min-w-[150px] px-2 py-1.5 border rounded-md font-bold text-gray-800 uppercase focus:ring-1 focus:ring-[#1e3a8a] outline-none" placeholder="Student Name" />
                                   </td>
                                   {selectedSubject === 'All Subjects' ? (
                                       dynamicSubjects.map((subj: string, sIndex: number) => (
                                           <td key={subj} className="p-3 min-w-[130px]">
                                               <div className="flex flex-col gap-1 items-center">
                                                   <input type="number" 
                                                      value={std.subjectMarks[subj] || ''} 
                                                      onChange={e => handleMarkChange(i, e.target.value, subj)} 
                                                      disabled={std.subjectAbsents[subj]}
                                                      className={`w-full px-2 py-1.5 border rounded-md font-black text-center focus:ring-2 focus:ring-[#1e3a8a] outline-none disabled:bg-gray-100 disabled:text-gray-400 ${std.subjectMarks[subj] !== '' && Number(std.subjectMarks[subj]) < (subjectConfigs[subj]?.passMarks ?? 40) ? 'text-red-600 border-red-300' : ''}`}
                                                      placeholder={`Max ${subjectConfigs[subj]?.fullMarks ?? 100}`}
                                                      tabIndex={i * dynamicSubjects.length + sIndex + 1}
                                                   />
                                                   <label className="text-[10px] flex items-center gap-1 font-bold text-gray-500 cursor-pointer">
                                                      <input type="checkbox" checked={std.subjectAbsents[subj] || false} onChange={e => handleAbsentChange(i, e.target.checked, subj)} className="w-3 h-3 text-red-600 rounded focus:ring-red-600 accent-red-600" />
                                                      Abs
                                                   </label>
                                               </div>
                                           </td>
                                       ))
                                   ) : (
                                       <>
                                           <td className="p-3">
                                               <input type="checkbox" checked={std.isAbsent} onChange={e => handleAbsentChange(i, e.target.checked)} className="w-4 h-4 text-[#1e3a8a] rounded focus:ring-[#1e3a8a] accent-[#1e3a8a] cursor-pointer" />
                                           </td>
                                           <td className="p-3">
                                               {std.isAbsent ? (
                                                   <span className="font-bold text-red-500 flex items-center h-10">AB (Absent)</span>
                                               ) : (
                                                   <input type="number" 
                                                      value={std.tempMark} 
                                                      onChange={e => handleMarkChange(i, e.target.value)} 
                                                      className={`w-full px-3 py-2 border rounded-md font-black text-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none ${std.tempMark !== '' && Number(std.tempMark) < (subjectConfigs[selectedSubject]?.passMarks ?? 40) ? 'text-red-600 border-red-300' : ''}`}
                                                      placeholder={`Max ${subjectConfigs[selectedSubject]?.fullMarks ?? 100}`}
                                                      tabIndex={i+1}
                                                   />
                                               )}
                                           </td>
                                           <td className="p-3 font-black text-gray-600">
                                               {std.isAbsent ? 'NG' : (std.tempMark ? getGrade(Number(std.tempMark), subjectConfigs[selectedSubject]?.fullMarks ?? 100, subjectConfigs[selectedSubject]?.passMarks ?? 40) : '-')}
                                           </td>
                                       </>
                                   )}
                               </tr>
                           ))}
                       </tbody>
                   </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50">
                   {students.map((std, i) => (
                       <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          <input type="text" value={std.studentName} onChange={e => handleStudentChange(i, 'studentName', e.target.value)} className="w-full mb-2 px-2 py-1.5 border rounded-md font-bold text-gray-900 uppercase text-lg focus:ring-1 focus:ring-[#1e3a8a] outline-none" placeholder="Student Name" />
                          <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-gray-500">ID:</span>
                              <input type="text" value={std.studentId} onChange={e => handleStudentChange(i, 'studentId', e.target.value)} className="flex-1 px-2 py-1 text-sm border rounded-md font-medium text-gray-600 focus:ring-1 focus:ring-[#1e3a8a] outline-none" placeholder="Roll/ID" />
                          </div>
                           {selectedSubject === 'All Subjects' ? (
                               <div className="grid grid-cols-2 gap-3 mt-4">
                                   {dynamicSubjects.map((subj: string) => (
                                       <div key={subj} className="bg-gray-50 p-2 rounded-lg border">
                                           <p className="text-xs font-bold text-gray-600 mb-1 truncate">{subj}</p>
                                           <div className="flex items-center gap-2">
                                              <input type="checkbox" checked={std.subjectAbsents[subj] || false} onChange={e => handleAbsentChange(i, e.target.checked, subj)} className="w-4 h-4 accent-red-600" />
                                              <input type="number" 
                                                  value={std.subjectMarks[subj] || ''} 
                                                  onChange={e => handleMarkChange(i, e.target.value, subj)} 
                                                  disabled={std.subjectAbsents[subj]}
                                                  className={`w-full px-2 py-1 border rounded-md font-black text-sm text-center focus:ring-1 focus:ring-[#1e3a8a] outline-none disabled:bg-gray-100 ${std.subjectMarks[subj] !== '' && Number(std.subjectMarks[subj]) < (subjectConfigs[subj]?.passMarks ?? 40) ? 'text-red-600 border-red-300' : ''}`}
                                                  placeholder="Marks" 
                                              />
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <div className="flex items-center gap-4">
                                  <div className="flex flex-col items-center gap-1">
                                     <label className="text-[10px] font-bold uppercase text-gray-400">Absent</label>
                                     <input type="checkbox" checked={std.isAbsent} onChange={e => handleAbsentChange(i, e.target.checked)} className="w-5 h-5 accent-[#1e3a8a]" />
                                  </div>
                                  <div className="flex-1">
                                     {std.isAbsent ? (
                                         <div className="h-12 flex items-center justify-center bg-red-50 border border-red-200 text-red-600 font-bold rounded-lg">AB (Absent)</div>
                                     ) : (
                                         <input type="number" 
                                           value={std.tempMark} 
                                           onChange={e => handleMarkChange(i, e.target.value)} 
                                           className={`w-full h-12 px-4 border rounded-lg font-black text-xl text-center focus:ring-2 focus:ring-[#1e3a8a] outline-none ${std.tempMark !== '' && Number(std.tempMark) < (subjectConfigs[selectedSubject]?.passMarks ?? 40) ? 'text-red-600 border-red-300' : ''}`}
                                           placeholder={`/ ${subjectConfigs[selectedSubject]?.fullMarks ?? 100}`} />
                                     )}
                                  </div>
                                  <div className="w-12 h-12 flex items-center justify-center font-black rounded-lg bg-gray-100 border text-lg">
                                     {std.isAbsent ? 'NG' : (std.tempMark ? getGrade(Number(std.tempMark), subjectConfigs[selectedSubject]?.fullMarks ?? 100, subjectConfigs[selectedSubject]?.passMarks ?? 40) : '-')}
                                  </div>
                               </div>
                           )}
                      </div>
                   ))}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-4 border-x">
                    <button 
                       onClick={publishResults} 
                       disabled={!isDataComplete()}
                       className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all ${isDataComplete() && isAnyDataEntered() ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                       <CheckCircle2 className="w-5 h-5" /> Calculate Rank & Publish
                    </button>
                    {isAnyDataEntered() && (
                        <button onClick={saveMarks} className="bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#1e40af] flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                           <Save className="w-5 h-5" /> Save Marks
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
