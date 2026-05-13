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
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, {thFullMarks: number | '', thPassMarks: number | '', prFullMarks: number | '', prPassMarks: number | '', hasTh: boolean, hasPr: boolean}>>({});
  
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const allowedClasses = userRole === 'admin' ? allClasses : assignedClasses;
  const dynamicSubjects = selectedClass ? (CLASS_SUBJECTS[selectedClass] || allSubjects) : [];
  const allowedSubjects = dynamicSubjects;
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
             let fallbackRoll = '';
             let sId = usr.studentId || '';
             
             if (!usr.rollNumber && !usr.rollNo && !!sId) {
                 const match = sId.match(/^SA\d+([A-Z]*\d*)*$/i);
                 if (match) {
                     const numPart = sId.replace(/^SA/i, '');
                     let clsStr = usr.class || '';
                     if (numPart.startsWith(clsStr)) {
                         fallbackRoll = numPart.substring(clsStr.length);
                     } else if (numPart.startsWith('0' + clsStr)) {
                         fallbackRoll = numPart.substring(clsStr.length + 1);
                     } else {
                         fallbackRoll = numPart;
                     }
                 } else {
                     fallbackRoll = sId;
                 }
             }

             return {
                 studentId: d.id,
                 schoolId: usr.rollNumber || usr.rollNo || fallbackRoll || usr.studentId || '',
                 studentName: usr.fullName ? usr.fullName : (usr.firstName && usr.lastName ? `${usr.firstName} ${usr.lastName}` : (usr.email || 'Unknown'))
             };
          });

          // Fallback if no students in users col: try the current results to prefill
          if (classStudents.length === 0) {
              const classResults = (data as StudentResult[]).filter(r => String(r.class) === selectedClass);
              const uniqueStudentsMap = new Map<string, {studentId: string, schoolId: string, studentName: string}>();
              classResults.forEach(r => uniqueStudentsMap.set(r.studentId, {studentId: r.studentId, schoolId: '', studentName: r.studentName}));
              classStudents = Array.from(uniqueStudentsMap.values());
          }
          
          const classResults = (data as StudentResult[]).filter(r => String(r.class) === selectedClass);

          const mapped = classStudents.map(s => {
              const existingRec = classResults.find(r => r.studentId === s.studentId && r.examType === examType);
              
              const subjectMarksTH: Record<string, string> = {};
              const subjectMarksPR: Record<string, string> = {};
              const subjectAbsentsTH: Record<string, boolean> = {};
              const subjectAbsentsPR: Record<string, boolean> = {};

              dynamicSubjects.forEach((subj: string) => {
                  const sData = existingRec?.subjects?.[subj];
                  const thM = sData?.thMarks;
                  const prM = sData?.prMarks;
                  
                  if (thM !== undefined) {
                     if (thM === 'AB') { subjectAbsentsTH[subj] = true; subjectMarksTH[subj] = ''; } 
                     else { subjectMarksTH[subj] = String(thM); subjectAbsentsTH[subj] = false; }
                  } else {
                     subjectMarksTH[subj] = ''; subjectAbsentsTH[subj] = false;
                  }

                  if (prM !== undefined) {
                     if (prM === 'AB') { subjectAbsentsPR[subj] = true; subjectMarksPR[subj] = ''; } 
                     else { subjectMarksPR[subj] = String(prM); subjectAbsentsPR[subj] = false; }
                  } else {
                     subjectMarksPR[subj] = ''; subjectAbsentsPR[subj] = false;
                  }
              });

              // for single subject
              const exSData = selectedSubject !== 'All Subjects' ? existingRec?.subjects?.[selectedSubject] : undefined;
              return {
                  ...s,
                  Class: selectedClass,
                  tempMarkTH: exSData?.thMarks !== undefined && exSData?.thMarks !== 'AB' ? String(exSData.thMarks) : '',
                  tempMarkPR: exSData?.prMarks !== undefined && exSData?.prMarks !== 'AB' ? String(exSData.prMarks) : '',
                  isAbsentTH: exSData?.thMarks === 'AB',
                  isAbsentPR: exSData?.prMarks === 'AB',
                  subjectMarksTH,
                  subjectMarksPR,
                  subjectAbsentsTH,
                  subjectAbsentsPR,
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

  const handleConfigChange = (subj: string, field: 'thFullMarks' | 'prFullMarks', val: string) => {
      let numVal: number | '' = val === '' ? '' : Number(val);
      setSubjectConfigs(prev => {
          const prevConf = prev[subj] || { thFullMarks: 75, thPassMarks: 30, prFullMarks: 25, prPassMarks: 10, hasTh: true, hasPr: true };
          const newConf = { ...prevConf, [field]: numVal };
          if (field === 'thFullMarks' && typeof numVal === 'number') {
              newConf.thPassMarks = Math.round(numVal * 0.4);
          }
          if (field === 'prFullMarks' && typeof numVal === 'number') {
              newConf.prPassMarks = Math.round(numVal * 0.4);
          }
          return { ...prev, [subj]: newConf };
      });
  };

  const handleMarkChange = (idx: number, rawVal: string, type: 'TH'|'PR', subj?: string) => {
      let val = rawVal.replace(/[^0-9.]/g, '');
      val = val.replace(/^0+(?=\d)/, '');
      
      const v = Number(val);
      const subjConfig = subjectConfigs[subj || selectedSubject] || { thFullMarks: 75, thPassMarks: 30, prFullMarks: 25, prPassMarks: 10, hasTh: true, hasPr: true };
      
      const maxMarks = type === 'TH' ? (subjConfig.thFullMarks === '' ? Infinity : subjConfig.thFullMarks) : (subjConfig.prFullMarks === '' ? Infinity : subjConfig.prFullMarks);
      
      if (val !== '' && (v > maxMarks || v < 0)) return; // prevent invalid
      const newS = [...students];
      if (subj) {
          if(type === 'TH') newS[idx].subjectMarksTH[subj] = val;
          else newS[idx].subjectMarksPR[subj] = val;
      } else {
          if(type === 'TH') newS[idx].tempMarkTH = val;
          else newS[idx].tempMarkPR = val;
      }
      setStudents(newS);
  };

  const handleAbsentChange = (idx: number, type: 'TH'|'PR', checked: boolean, subj?: string) => {
      const newS = [...students];
      if (subj) {
          if(type === 'TH') {
              newS[idx].subjectAbsentsTH[subj] = checked;
              if (checked) newS[idx].subjectMarksTH[subj] = '';
          } else {
              newS[idx].subjectAbsentsPR[subj] = checked;
              if (checked) newS[idx].subjectMarksPR[subj] = '';
          }
      } else {
          if(type === 'TH') {
              newS[idx].isAbsentTH = checked;
              if (checked) newS[idx].tempMarkTH = '';
          } else {
              newS[idx].isAbsentPR = checked;
              if (checked) newS[idx].tempMarkPR = '';
          }
      }
      setStudents(newS);
  };

  const handleStudentChange = (idx: number, field: string, val: string) => {
      const newS = [...students];
      newS[idx][field] = val;
      setStudents(newS);
  };

  const addStudentRow = () => {
      const newId = 'TEMP' + Math.floor(Math.random()*10000);
      setStudents([...students, {
          studentId: newId,
          schoolId: '',
          studentName: 'New Student',
          Class: selectedClass,
          tempMarkTH: '',
          tempMarkPR: '',
          isAbsentTH: false,
          isAbsentPR: false,
          subjectMarksTH: {},
          subjectMarksPR: {},
          subjectAbsentsTH: {},
          subjectAbsentsPR: {}
      }]);
  };

  const markAllPresent = () => {
      const newS = students.map(s => ({
          ...s,
          isAbsentTH: false,
          isAbsentPR: false,
          subjectAbsentsTH: {},
          subjectAbsentsPR: {}
      }));
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
              let finalMarksParams: Record<string, {th: number | 'AB', pr: number | 'AB'}> = {};

              if (selectedSubject === 'All Subjects') {
                  dynamicSubjects.forEach((subj: string) => {
                      const thMark = std.subjectAbsentsTH[subj] ? 'AB' : (std.subjectMarksTH[subj] === '' ? null : Number(std.subjectMarksTH[subj]));
                      const prMark = std.subjectAbsentsPR[subj] ? 'AB' : (std.subjectMarksPR[subj] === '' ? null : Number(std.subjectMarksPR[subj]));
                      if (thMark !== null || prMark !== null) {
                          finalMarksParams[subj] = { th: thMark !== null ? thMark : 0, pr: prMark !== null ? prMark : 0 };
                      }
                  });
              } else {
                  const thVal = std.isAbsentTH ? 'AB' : (std.tempMarkTH === '' ? null : Number(std.tempMarkTH));
                  const prVal = std.isAbsentPR ? 'AB' : (std.tempMarkPR === '' ? null : Number(std.tempMarkPR));
                  if (thVal !== null || prVal !== null) {
                      finalMarksParams[selectedSubject] = { th: thVal !== null ? thVal : 0, pr: prVal !== null ? prVal : 0 };
                  }
              }

              if (Object.keys(finalMarksParams).length === 0) continue; // Skip empty

              const existingIdx = (data as StudentResult[]).findIndex(r => r.studentId === std.studentId && r.examType === examType);
              
              if (existingIdx >= 0) {
                  const rec = { ...data[existingIdx] };
                  let updatedSubjects = { ...rec.subjects };
                  
                  Object.entries(finalMarksParams).forEach(([subj, val]) => {
                      const subjConfig = subjectConfigs[subj] || { thFullMarks: 75, thPassMarks: 30, prFullMarks: 25, prPassMarks: 10, hasTh: true, hasPr: true };
                      const sumObtained = (val.th === 'AB' ? 0 : val.th) + (val.pr === 'AB' ? 0 : val.pr);
                      const isCompleteAB = val.th === 'AB' && val.pr === 'AB';
                      const obtainedTotal = isCompleteAB ? 'AB' : sumObtained;
                      
                      const tFM = subjConfig.hasTh ? Number(subjConfig.thFullMarks || 0) : 0;
                      const pFM = subjConfig.hasPr ? Number(subjConfig.prFullMarks || 0) : 0;
                      
                      const updateData = { 
                          fullMarks: tFM + pFM,
                          obtained: obtainedTotal,
                          thMarks: val.th, prMarks: val.pr,
                          thFull: tFM, prFull: pFM, 
                          thPass: Number(subjConfig.thPassMarks || 0), prPass: Number(subjConfig.prPassMarks || 0)
                      };
                      
                      updatedSubjects[subj] = updateData;
                      const subjectDocId = `${examId}_${std.studentId}_${subj.replace(/\s+/g, '')}`;
                      batch.set(doc(db, 'results', subjectDocId), {
                          studentId: std.studentId,
                          examId: examId,
                          subject: subj,
                          marks: obtainedTotal,
                          fullMarks: tFM + pFM,
                          thMarks: val.th, prMarks: val.pr,
                          thFull: tFM, prFull: pFM
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
                  rec.rollNo = std.schoolId || '00';

                  const summaryDocId = `${examId}_${std.studentId}`;
                  batch.set(doc(db, 'resultSummary', summaryDocId), {
                      studentId: std.studentId,
                      studentName: rec.studentName,
                      rollNo: rec.rollNo,
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
                      const subjConfig = subjectConfigs[subj] || { thFullMarks: 75, thPassMarks: 30, prFullMarks: 25, prPassMarks: 10, hasTh: true, hasPr: true };
                      const sumObtained = (val.th === 'AB' ? 0 : val.th) + (val.pr === 'AB' ? 0 : val.pr);
                      const isCompleteAB = val.th === 'AB' && val.pr === 'AB';
                      const obtainedTotal = isCompleteAB ? 'AB' : sumObtained;
                      
                      const tFM = subjConfig.hasTh ? Number(subjConfig.thFullMarks || 0) : 0;
                      const pFM = subjConfig.hasPr ? Number(subjConfig.prFullMarks || 0) : 0;
                      
                      newSubjects[subj] = { 
                          fullMarks: tFM + pFM,
                          obtained: obtainedTotal,
                          thMarks: val.th, prMarks: val.pr,
                          thFull: tFM, prFull: pFM, 
                          thPass: Number(subjConfig.thPassMarks || 0), prPass: Number(subjConfig.prPassMarks || 0)
                      };
                      const subjectDocId = `${examId}_${std.studentId}_${subj.replace(/\s+/g, '')}`;
                      batch.set(doc(db, 'results', subjectDocId), {
                          studentId: std.studentId,
                          examId: examId,
                          subject: subj,
                          marks: obtainedTotal,
                          fullMarks: tFM + pFM,
                          thMarks: val.th, prMarks: val.pr,
                          thFull: tFM, prFull: pFM
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
                      rollNo: std.schoolId || '00',
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
                      rollNo: newRec.rollNo,
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
                  const cnf = subjectConfigs[subj] || { hasTh: true, hasPr: true };
                  if (cnf.hasTh && !std.subjectAbsentsTH?.[subj] && (std.subjectMarksTH?.[subj] === '' || std.subjectMarksTH?.[subj] === undefined)) return false;
                  if (cnf.hasPr && !std.subjectAbsentsPR?.[subj] && (std.subjectMarksPR?.[subj] === '' || std.subjectMarksPR?.[subj] === undefined)) return false;
              }
          } else {
              const cnf = subjectConfigs[selectedSubject] || { hasTh: true, hasPr: true };
              if (cnf.hasTh && !std.isAbsentTH && (std.tempMarkTH === '' || std.tempMarkTH === undefined)) return false;
              if (cnf.hasPr && !std.isAbsentPR && (std.tempMarkPR === '' || std.tempMarkPR === undefined)) return false;
          }
      }
      return true;
  };

  const isAnyDataEntered = () => {
      if (students.length === 0) return false;
      for (const std of students) {
          if (selectedSubject === 'All Subjects') {
              for (const subj of dynamicSubjects) {
                  const cnf = subjectConfigs[subj] || { hasTh: true, hasPr: true };
                  if (cnf.hasTh && (std.subjectAbsentsTH?.[subj] || (std.subjectMarksTH?.[subj] !== '' && std.subjectMarksTH?.[subj] !== undefined))) return true;
                  if (cnf.hasPr && (std.subjectAbsentsPR?.[subj] || (std.subjectMarksPR?.[subj] !== '' && std.subjectMarksPR?.[subj] !== undefined))) return true;
              }
          } else {
              const cnf = subjectConfigs[selectedSubject] || { hasTh: true, hasPr: true };
              if (cnf.hasTh && (std.isAbsentTH || (std.tempMarkTH !== '' && std.tempMarkTH !== undefined))) return true;
              if (cnf.hasPr && (std.isAbsentPR || (std.tempMarkPR !== '' && std.tempMarkPR !== undefined))) return true;
          }
      }
      return false;
  };

  return (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex flex-col justify-end">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
               <div className="flex gap-4 items-center h-[42px] overflow-hidden">
                   <label className="flex items-center gap-2 cursor-pointer shrink-0">
                       <input type="radio" value="Terminal" checked={examCategory === 'Terminal'} onChange={() => { setExamCategory('Terminal'); setExamType(''); }} className="w-4 h-4 text-primary focus:ring-primary outline-none" />
                       <span className="text-sm font-bold">Terminal</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer shrink-0">
                       <input type="radio" value="Test" checked={examCategory === 'Test'} onChange={() => { setExamCategory('Test'); setExamType(''); }} className="w-4 h-4 text-primary focus:ring-primary outline-none" />
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
                   className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none font-medium h-[42px]"
                 >
                     <option value="">-- Select Terminal --</option>
                     {EXAM_TYPES.map((ex:string) => <option key={ex} value={ex}>{ex}</option>)}
                 </select>
               ) : (
                 <input 
                   type="text" 
                   value={examType} 
                   onChange={e=>setExamType(e.target.value)} 
                   className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none font-medium h-[42px]"
                   placeholder="e.g. Unit Test 1"
                 />
               )}
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Class</label>
               <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none font-medium">
                   <option value="">-- Select Class --</option>
                   {allowedClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
               <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none font-medium">
                   <option value="">-- Subject --</option>
                   {allowedSubjectsWithAll.map((s: string) => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
        </div>

        {!(selectedClass && selectedSubject && examType) ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center flex flex-col items-center justify-center mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-2">Ready to Enter Marks?</h3>
                <p className="text-sm font-medium text-gray-500 max-w-md">
                    Please select the <span className="text-gray-800 font-bold">Exam Name</span>, <span className="text-gray-800 font-bold">Class</span>, and <span className="text-gray-800 font-bold">Subject</span> from the dropdowns above to generate the result entry sheet.
                </p>
            </div>
        ) : (
            <>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 cursor-pointer flex items-center gap-2">
                        Mark Configuration
                    </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {selectedSubject === 'All Subjects' ? (
                        dynamicSubjects.map((subj: string) => (
                            <div key={subj} className="bg-white p-3 border rounded-lg shadow-sm">
                                <p className="text-xs font-bold text-primary mb-2 truncate">{subj}</p>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">TH Full</label>
                                        <input type="number" value={subjectConfigs[subj]?.thFullMarks ?? 75} onChange={e => handleConfigChange(subj, 'thFullMarks', e.target.value)} className="w-full px-2 py-1 border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">PR Full</label>
                                        <input type="number" value={subjectConfigs[subj]?.prFullMarks ?? 25} onChange={e => handleConfigChange(subj, 'prFullMarks', e.target.value)} className="w-full px-2 py-1 border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-3 border rounded-lg shadow-sm">
                            <p className="text-xs font-bold text-primary mb-2 truncate">{selectedSubject}</p>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">TH Full</label>
                                    <input type="number" value={subjectConfigs[selectedSubject]?.thFullMarks ?? 75} onChange={e => handleConfigChange(selectedSubject, 'thFullMarks', e.target.value)} className="w-full px-2 py-1 border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">PR Full</label>
                                    <input type="number" value={subjectConfigs[selectedSubject]?.prFullMarks ?? 25} onChange={e => handleConfigChange(selectedSubject, 'prFullMarks', e.target.value)} className="w-full px-2 py-1 border rounded text-sm outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        {students.length > 0 ? (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100/80 text-gray-700">
                            <tr>
                                <th className="p-3 font-bold uppercase tracking-wider w-24">Roll/ID</th>
                                <th className="p-3 font-bold uppercase tracking-wider">Student Name</th>
                                {selectedSubject === 'All Subjects' ? (
                                    dynamicSubjects.map((subj: string) => {
                                        const cnf = subjectConfigs[subj] || { hasTh: true, hasPr: true };
                                        return (
                                            <th key={subj} className="p-3 font-bold uppercase tracking-wider text-center border-l border-gray-200">
                                                <span className="block mb-1 text-primary">{subj}</span>
                                                <div className="flex justify-center gap-2 text-[10px] text-gray-500">
                                                    {cnf.hasTh && <span>TH</span>}
                                                    {cnf.hasPr && <span>PR</span>}
                                                </div>
                                            </th>
                                        );
                                    })
                                ) : (
                                    <>
                                        {(subjectConfigs[selectedSubject]?.hasTh ?? true) && (
                                            <th className="p-3 font-bold uppercase tracking-wider text-center">Theory (TH) Marks<br/><span className="text-xs font-medium text-gray-500">Max: {subjectConfigs[selectedSubject]?.thFullMarks ?? 75} | Pass: {subjectConfigs[selectedSubject]?.thPassMarks ?? 30}</span></th>
                                        )}
                                        {(subjectConfigs[selectedSubject]?.hasPr ?? true) && (
                                            <th className="p-3 font-bold uppercase tracking-wider text-center">Practical (PR) Marks<br/><span className="text-xs font-medium text-gray-500">Max: {subjectConfigs[selectedSubject]?.prFullMarks ?? 25} | Pass: {subjectConfigs[selectedSubject]?.prPassMarks ?? 10}</span></th>
                                        )}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map((std, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-3">
                                        <input type="text" value={std.schoolId} onChange={e => handleStudentChange(i, 'schoolId', e.target.value)} className="w-full min-w-[80px] px-2 py-1.5 border rounded-md font-medium text-gray-600 focus:ring-1 focus:ring-primary outline-none" placeholder="Roll/ID" />
                                    </td>
                                    <td className="p-3">
                                        <input type="text" value={std.studentName} onChange={e => handleStudentChange(i, 'studentName', e.target.value)} className="w-full min-w-[150px] px-2 py-1.5 border rounded-md font-bold text-gray-800 uppercase focus:ring-1 focus:ring-primary outline-none" placeholder="Student Name" />
                                    </td>
                                    {selectedSubject === 'All Subjects' ? (
                                        dynamicSubjects.map((subj: string, sIndex: number) => {
                                            const cnf = subjectConfigs[subj] || { hasTh: true, hasPr: true };
                                            return (
                                                <td key={subj} className="p-2 border-l border-gray-100 text-center min-w-[130px]">
                                                    <div className="flex gap-1 justify-center relative">
                                                        {cnf.hasTh && (
                                                            <div className="flex flex-col items-center">
                                                                <input type="text" value={std.subjectAbsentsTH[subj] ? 'AB' : (std.subjectMarksTH[subj] || '')} onChange={(e) => handleMarkChange(i, e.target.value, 'TH', subj)} placeholder="TH" className="w-12 text-center py-1.5 border rounded focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-gray-400 font-bold transition-colors" disabled={std.subjectAbsentsTH[subj]} tabIndex={i * dynamicSubjects.length + sIndex + 1} />
                                                                <label className="text-[10px] mt-0.5 text-gray-500 font-bold flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={std.subjectAbsentsTH[subj] || false} onChange={e => handleAbsentChange(i, 'TH', e.target.checked, subj)} className="w-3 h-3 text-red-600 rounded focus:ring-red-600 accent-red-600" /> Abs</label>
                                                            </div>
                                                        )}
                                                        {cnf.hasPr && (
                                                            <div className="flex flex-col items-center">
                                                                <input type="text" value={std.subjectAbsentsPR[subj] ? 'AB' : (std.subjectMarksPR[subj] || '')} onChange={(e) => handleMarkChange(i, e.target.value, 'PR', subj)} placeholder="PR" className="w-12 text-center py-1.5 border rounded focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-gray-400 font-bold transition-colors" disabled={std.subjectAbsentsPR[subj]} />
                                                                <label className="text-[10px] mt-0.5 text-gray-500 font-bold flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={std.subjectAbsentsPR[subj] || false} onChange={e => handleAbsentChange(i, 'PR', e.target.checked, subj)} className="w-3 h-3 text-red-600 rounded focus:ring-red-600 accent-red-600" /> Abs</label>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })
                                    ) : (
                                        <>
                                            {(subjectConfigs[selectedSubject]?.hasTh ?? true) && (
                                                <td className="p-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <input type="text" value={std.isAbsentTH ? 'AB' : std.tempMarkTH} onChange={(e) => handleMarkChange(i, e.target.value, 'TH')} placeholder="TH" className="w-20 text-center py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100 disabled:text-gray-400 font-black transition-colors text-lg" disabled={std.isAbsentTH} tabIndex={i} />
                                                        <label className="text-xs text-gray-500 font-bold flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={std.isAbsentTH} onChange={e => handleAbsentChange(i, 'TH', e.target.checked)} className="w-4 h-4 text-red-600 rounded focus:ring-red-600 accent-red-600" /> Absent</label>
                                                    </div>
                                                </td>
                                            )}
                                            {(subjectConfigs[selectedSubject]?.hasPr ?? true) && (
                                                <td className="p-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <input type="text" value={std.isAbsentPR ? 'AB' : std.tempMarkPR} onChange={(e) => handleMarkChange(i, e.target.value, 'PR')} placeholder="PR" className="w-20 text-center py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100 disabled:text-gray-400 font-black transition-colors text-lg" disabled={std.isAbsentPR} />
                                                        <label className="text-xs text-gray-500 font-bold flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={std.isAbsentPR} onChange={e => handleAbsentChange(i, 'PR', e.target.checked)} className="w-4 h-4 text-red-600 rounded focus:ring-red-600 accent-red-600" /> Absent</label>
                                                    </div>
                                                </td>
                                            )}
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden flex flex-col gap-3 p-3 text-primary">
                   {students.map((std, i) => (
                       <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          <input type="text" value={std.studentName} onChange={e => handleStudentChange(i, 'studentName', e.target.value)} className="w-full mb-2 px-2 py-1.5 border rounded-md font-bold text-gray-900 uppercase text-lg focus:ring-1 focus:ring-primary outline-none" placeholder="Student Name" />
                          <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-gray-500">ID:</span>
                              <input type="text" value={std.schoolId} onChange={e => handleStudentChange(i, 'schoolId', e.target.value)} className="flex-1 px-2 py-1 text-sm border rounded-md font-medium text-gray-600 focus:ring-1 focus:ring-primary outline-none" placeholder="Roll/ID" />
                          </div>
                            {selectedSubject === 'All Subjects' ? (
                                <div className="flex flex-col gap-3 mt-4">
                                    {dynamicSubjects.map((subj: string) => {
                                        const cnf = subjectConfigs[subj] || { hasTh: true, hasPr: true };
                                        return (
                                            <div key={subj} className="border-primary text-primary p-3 rounded-lg border">
                                                <p className="text-sm font-bold text-gray-700 mb-2">{subj}</p>
                                                <div className="flex items-center gap-4">
                                                    {cnf.hasTh && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <input type="text" inputMode="decimal" 
                                                                    value={std.subjectMarksTH[subj] || ''} 
                                                                    onChange={e => handleMarkChange(i, e.target.value, 'TH', subj)} 
                                                                    disabled={std.subjectAbsentsTH[subj]}
                                                                    className="w-full px-2 py-1 border rounded-md font-black text-sm text-center focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-100"
                                                                    placeholder="TH Marks" 
                                                                />
                                                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                                                    <input type="checkbox" checked={std.subjectAbsentsTH[subj] || false} onChange={e => handleAbsentChange(i, 'TH', e.target.checked, subj)} className="w-4 h-4 accent-red-600" /> Abs
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {cnf.hasPr && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <input type="text" inputMode="decimal" 
                                                                    value={std.subjectMarksPR[subj] || ''} 
                                                                    onChange={e => handleMarkChange(i, e.target.value, 'PR', subj)} 
                                                                    disabled={std.subjectAbsentsPR[subj]}
                                                                    className="w-full px-2 py-1 border rounded-md font-black text-sm text-center focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-100"
                                                                    placeholder="PR Marks" 
                                                                />
                                                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                                                    <input type="checkbox" checked={std.subjectAbsentsPR[subj] || false} onChange={e => handleAbsentChange(i, 'PR', e.target.checked, subj)} className="w-4 h-4 accent-red-600" /> Abs
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {(subjectConfigs[selectedSubject]?.hasTh ?? true) && (
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-400">Absent (TH)</label>
                                                <input type="checkbox" checked={std.isAbsentTH} onChange={e => handleAbsentChange(i, 'TH', e.target.checked)} className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                {std.isAbsentTH ? (
                                                    <div className="h-12 flex items-center justify-center bg-red-50 border border-red-200 text-red-600 font-bold rounded-lg">AB (Absent)</div>
                                                ) : (
                                                    <input type="text" inputMode="decimal" 
                                                        value={std.tempMarkTH} 
                                                        onChange={e => handleMarkChange(i, e.target.value, 'TH')} 
                                                        className="w-full h-12 px-4 border rounded-lg font-black text-xl text-center focus:ring-2 focus:ring-primary outline-none"
                                                        placeholder="Theory Marks" />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {(subjectConfigs[selectedSubject]?.hasPr ?? true) && (
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-400">Absent (PR)</label>
                                                <input type="checkbox" checked={std.isAbsentPR} onChange={e => handleAbsentChange(i, 'PR', e.target.checked)} className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                {std.isAbsentPR ? (
                                                    <div className="h-12 flex items-center justify-center bg-red-50 border border-red-200 text-red-600 font-bold rounded-lg">AB (Absent)</div>
                                                ) : (
                                                    <input type="text" inputMode="decimal" 
                                                        value={std.tempMarkPR} 
                                                        onChange={e => handleMarkChange(i, e.target.value, 'PR')} 
                                                        className="w-full h-12 px-4 border rounded-lg font-black text-xl text-center focus:ring-2 focus:ring-primary outline-none"
                                                        placeholder="Practical Marks" />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                       </div>
                    ))}
                </div>

                <div className="p-4 border-t text-primary flex justify-end gap-4 border-x">
                    <button 
                       onClick={publishResults} 
                       disabled={!isDataComplete()}
                       className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all ${isDataComplete() && isAnyDataEntered() ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                       <CheckCircle2 className="w-5 h-5" /> Calculate Rank & Publish
                    </button>
                    {isAnyDataEntered() && (
                        <button onClick={saveMarks} className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-dark flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                           <Save className="w-5 h-5" /> Save Marks
                        </button>
                    )}
                </div>
            </div>
        ) : null}
      </>
    )}
    </div>
  );
}
