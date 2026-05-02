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
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [fullMarks, setFullMarks] = useState(100);
  
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const allowedClasses = userRole === 'admin' ? allClasses : assignedClasses;
  const dynamicSubjects = selectedClass ? (CLASS_SUBJECTS[selectedClass] || allSubjects) : [];
  const allowedSubjects = userRole === 'admin' ? dynamicSubjects : assignedSubjects.filter((s: string) => dynamicSubjects.includes(s));


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

  const getGrade = (marks: number | 'AB', fm: number) => {
    if (marks === 'AB') return 'NG';
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
              const existingMarks = existingRec?.subjects[selectedSubject]?.obtained;
              return {
                  ...s,
                  Class: selectedClass,
                  tempMark: existingMarks !== undefined && existingMarks !== 'AB' ? String(existingMarks) : '',
                  isAbsent: existingMarks === 'AB',
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

  const handleMarkChange = (idx: number, val: string) => {
      const v = Number(val);
      if (val !== '' && (v > fullMarks || v < 0)) return; // prevent invalid
      const newS = [...students];
      newS[idx].tempMark = val;
      setStudents(newS);
  };

  const handleAbsentChange = (idx: number, checked: boolean) => {
      const newS = [...students];
      newS[idx].isAbsent = checked;
      setStudents(newS);
  };

  const handleStudentChange = (idx: number, field: string, val: string) => {
      const newS = [...students];
      newS[idx][field] = val;
      setStudents(newS);
  };

  const addStudentRow = () => {
      setStudents([...students, { 
          studentId: `S${Date.now().toString().slice(-6)}`, 
          studentName: '', 
          Class: selectedClass,
          tempMark: '', 
          isAbsent: false 
      }]);
  };

  const markAllPresent = () => {
      const newS = students.map(s => ({...s, isAbsent: false}));
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
              const finalVal = std.isAbsent ? 'AB' : (std.tempMark === '' ? '' : Number(std.tempMark));
              if (finalVal === '') continue; // Skip empty

              const existingIdx = (data as StudentResult[]).findIndex(r => r.studentId === std.studentId && r.examType === examType);
              
              if (existingIdx >= 0) {
                  const rec = { ...data[existingIdx] };
                  rec.subjects = {
                      ...rec.subjects,
                      [selectedSubject]: { fullMarks: fullMarks, obtained: finalVal }
                  };
                  
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

                  const subjectDocId = `${examId}_${std.studentId}_${selectedSubject.replace(/\s+/g, '')}`;
                  batch.set(doc(db, 'results', subjectDocId), {
                      studentId: std.studentId,
                      examId: examId,
                      subject: selectedSubject,
                      marks: finalVal,
                      fullMarks: fullMarks
                  });
                  opCount++;

              } else {
                  // Creating a new result for this student + exam
                  const newRec: StudentResult = {
                      studentId: std.studentId,
                      studentName: std.studentName,
                      class: std.Class || selectedClass,
                      rollNo: '00',
                      examType: examType,
                      subjects: {
                          [selectedSubject]: { fullMarks: fullMarks, obtained: finalVal }
                      },
                      total: finalVal === 'AB' ? 0 : finalVal as number,
                      fullTotal: fullMarks,
                      percentage: finalVal === 'AB' ? 0 : ((finalVal as number) / fullMarks) * 100,
                      grade: finalVal === 'AB' ? 'NG' : getGrade((finalVal as number), fullMarks),
                      gpa: finalVal === 'AB' ? 0 : getNepalGPA(((finalVal as number) / fullMarks) * 100),
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

                  const subjectDocId = `${examId}_${std.studentId}_${selectedSubject.replace(/\s+/g, '')}`;
                  batch.set(doc(db, 'results', subjectDocId), {
                      studentId: std.studentId,
                      examId: examId,
                      subject: selectedSubject,
                      marks: finalVal,
                      fullMarks: fullMarks
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

  return (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Exam Type</label>
               <input 
                 list="exam-types" 
                 value={examType} 
                 onChange={e=>setExamType(e.target.value)} 
                 className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium"
                 placeholder="Type or select exam..."
               />
               <datalist id="exam-types">
                   {EXAM_TYPES.map((ex: string) => <option key={ex} value={ex} />)}
               </datalist>
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
                   {allowedSubjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Marks</label>
               <input type="number" readOnly value={fullMarks} onChange={e=>setFullMarks(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg pointer-events-none bg-gray-100 outline-none font-bold text-[#1e3a8a]" />
            </div>
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
                               <th className="p-3">Absent?</th>
                               <th className="p-3 w-48">Marks Obtained</th>
                               <th className="p-3">Grade</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {students.map((std, i) => (
                               <tr key={i} className="hover:bg-gray-50">
                                   <td className="p-3">
                                       <input type="text" value={std.studentId} onChange={e => handleStudentChange(i, 'studentId', e.target.value)} className="w-full px-2 py-1.5 border rounded-md font-medium text-gray-600 focus:ring-1 focus:ring-[#1e3a8a] outline-none" placeholder="Roll/ID" />
                                   </td>
                                   <td className="p-3">
                                       <input type="text" value={std.studentName} onChange={e => handleStudentChange(i, 'studentName', e.target.value)} className="w-full px-2 py-1.5 border rounded-md font-bold text-gray-800 uppercase focus:ring-1 focus:ring-[#1e3a8a] outline-none" placeholder="Student Name" />
                                   </td>
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
                                              className="w-full px-3 py-2 border rounded-md font-black text-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none" 
                                              placeholder={`Max ${fullMarks}`}
                                              tabIndex={i+1}
                                           />
                                       )}
                                   </td>
                                   <td className="p-3 font-black text-gray-600">
                                       {std.isAbsent ? 'NG' : (std.tempMark ? getGrade(Number(std.tempMark), fullMarks) : '-')}
                                   </td>
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
                                      className="w-full h-12 px-4 border rounded-lg font-black text-xl text-center focus:ring-2 focus:ring-[#1e3a8a] outline-none" 
                                      placeholder={`/ ${fullMarks}`} />
                                )}
                             </div>
                             <div className="w-12 h-12 flex items-center justify-center font-black rounded-lg bg-gray-100 border text-lg">
                                {std.isAbsent ? 'NG' : (std.tempMark ? getGrade(Number(std.tempMark), fullMarks) : '-')}
                             </div>
                          </div>
                      </div>
                   ))}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-4 border-x">
                    <button onClick={publishResults} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                       <CheckCircle2 className="w-5 h-5" /> Calculate Rank & Publish
                    </button>
                    <button onClick={saveMarks} className="bg-[#1e3a8a] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#1e40af] flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                       <Save className="w-5 h-5" /> Save marks for {students.length} students
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
