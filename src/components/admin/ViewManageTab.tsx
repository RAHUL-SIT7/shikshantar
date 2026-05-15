import React, { useState, useMemo, useRef } from 'react';
import { Search, Edit2, Trash2, X, Save, BellRing, CheckCircle2, Download, FileArchive, FileSpreadsheet, Loader2 } from 'lucide-react';
import { StudentResult } from '../../data/resultsState';
import { doc, writeBatch, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { ReportCardTemplate } from './ReportCardTemplate';

export function ViewManageTab({ EXAM_TYPES, allClasses, data, setStatus, userRole, assignedClasses }: any) {
  const [filterClass, setFilterClass] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingRecord, setEditingRecord] = useState<StudentResult | null>(null);
  const [editReason, setEditReason] = useState('');
  
  const [generating, setGenerating] = useState(false);
  const [printPreviewStudent, setPrintPreviewStudent] = useState<any | null>(null);
  const hiddenPdfRef = useRef<HTMLDivElement>(null);
  
  const allowedClasses = userRole === 'admin' ? allClasses : assignedClasses;

  const filteredData = useMemo(() => {
     let f = (data as StudentResult[]).filter(r => !filterExam || (r.examType && r.examType.toLowerCase().includes(filterExam.toLowerCase())));
     if (filterClass) f = f.filter(r => String(r.class) === filterClass);
     else if (userRole === 'teacher') f = f.filter(r => allowedClasses.includes(String(r.class)));

     if (searchTerm) {
         const s = searchTerm.toLowerCase();
         f = f.filter(r => (r.studentName?.toLowerCase().includes(s) || r.studentId?.toLowerCase().includes(s)));
     }
     
     // Rank Assignment within the currently filtered set (grouped by class and exam)
     let withStats = [...f];
     
     const groups: Record<string, StudentResult[]> = {};
     withStats.forEach(r => {
         const key = `${r.class}_${r.examType}`;
         if (!groups[key]) groups[key] = [];
         groups[key].push(r);
     });

     Object.values(groups).forEach(group => {
         group.sort((a, b) => b.total - a.total);
         let currentRank = 1;
         let prevTotal = -1;
         let sameRankCount = 0;
         group.forEach((r, idx) => {
             if (r.total === prevTotal) {
                 r.rank = currentRank;
                 sameRankCount++;
             } else {
                 if (idx === 0) {
                     currentRank = 1;
                 } else {
                     currentRank += sameRankCount;
                 }
                 r.rank = currentRank;
                 sameRankCount = 1;
                 prevTotal = r.total;
             }
         });
     });

     withStats.sort((a, b) => {
         if (a.class !== b.class) return String(a.class).localeCompare(String(b.class));
         if (a.examType !== b.examType) return String(a.examType).localeCompare(String(b.examType));
         return (a.rank || 0) - (b.rank || 0);
     });

     return withStats;
  }, [data, filterClass, filterExam, searchTerm, allowedClasses, userRole]);

  const allSubjectsForView = useMemo(() => {
     const set = new Set<string>();
     filteredData.forEach(r => {
         Object.keys(r.subjects).forEach(s => set.add(s));
     });
     return Array.from(set);
  }, [filteredData]);

  const classStats = useMemo(() => {
     if(filteredData.length === 0) return null;
     const max = Math.max(...filteredData.map(d => d.percentage));
     const min = Math.min(...filteredData.map(d => d.percentage));
     const avg = filteredData.reduce((sum, d) => sum + d.percentage, 0) / filteredData.length;
     const pass = filteredData.filter(d => d.percentage >= 40).length; // simple threshold
     
     const subAvg: Record<string, string> = {};
     allSubjectsForView.forEach(sub => {
         let subTotal = 0; let count = 0;
         filteredData.forEach(r => {
             const subInfo = r.subjects[sub];
             if (subInfo && subInfo.obtained !== 'AB') {
                 subTotal += Number(subInfo.obtained);
                 count++;
             }
         });
         subAvg[sub] = count > 0 ? (subTotal / count).toFixed(1) : "0";
     });

     return { max, min, avg, passPct: (pass / filteredData.length) * 100, subAvg };
  }, [filteredData, allSubjectsForView]);

  const getGrade = (marks: number | "AB", fm: number) => {
    if (marks === "AB") return 'NG';
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

  const saveEdit = async () => {
     if(!editReason) { setStatus({type: 'error', message: 'Reason for edit is required in log.'}); return; }
     if(!editingRecord) return;
     
     try {
         // Recalculate totals
         let total = 0;
         let full = 0;
         Object.values(editingRecord.subjects).forEach((s: any) => {
             if (s.obtained !== "AB") total += Number(s.obtained);
             full += Number(s.fullMarks);
         });
         editingRecord.total = total;
         editingRecord.fullTotal = full;
         editingRecord.percentage = (total/full)*100;
         editingRecord.grade = getGrade(total, full);
         // GPA approx
         editingRecord.gpa = Number((editingRecord.percentage/25).toFixed(1));

         const examId = `${editingRecord.examType.replace(/\s+/g, '_')}_${editingRecord.class}`;
         const summaryDocId = `${examId}_${editingRecord.studentId}`;

         let batch = writeBatch(db);
         batch.update(doc(db, 'resultSummary', summaryDocId), {
             total: editingRecord.total,
             fullTotal: editingRecord.fullTotal,
             percentage: editingRecord.percentage,
             grade: editingRecord.grade,
             gpa: editingRecord.gpa
         });

         for (const [subName, subInfo] of Object.entries(editingRecord.subjects)) {
             const subjectDocId = `${examId}_${editingRecord.studentId}_${subName.replace(/\s+/g, '')}`;
             batch.update(doc(db, 'results', subjectDocId), {
                 marks: (subInfo as any).obtained
             });
         }
         
         await batch.commit();

         setStatus({type: 'success', message: 'Record saved successfully.'}); // triggers reload
         setEditingRecord(null);
         setEditReason('');
     } catch (err: any) {
         setStatus({type: 'error', message: "Update failed: " + err.message});
     }
  };

  const deleteRecord = async (stdId: string, examType: string) => {
     if(!window.confirm(`Are you sure you want to delete ${stdId}'s results for ${examType}?`)) return;
     
     try {
         // In a real app we'd get the examId this way
         const stdRow = filteredData.find(d => d.studentId === stdId && d.examType === examType);
         if (!stdRow) return;
         const examId = `${stdRow.examType.replace(/\s+/g, '_')}_${stdRow.class}`;

         let batch = writeBatch(db);
         batch.delete(doc(db, 'resultSummary', `${examId}_${stdId}`));
         
         for (const subName of Object.keys(stdRow.subjects)) {
             batch.delete(doc(db, 'results', `${examId}_${stdId}_${subName.replace(/\s+/g, '')}`));
         }
         
         await batch.commit();
         setStatus({type: 'success', message: 'Record saved successfully.'}); // Trigger refresh via save logic
     } catch (err: any) {
         setStatus({type: 'error', message: "Delete failed: " + err.message});
     }
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handlePublishResults = async () => {
     if (filteredData.length === 0) {
         setStatus({type: 'error', message: 'No results to publish for the current filter.'});
         return;
     }
     
     setIsPublishing(true);
     try {
         // find the unique classes from filteredData
         const classesToPublish = filterClass ? [filterClass] : Array.from(new Set(filteredData.map(r => String(r.class))));
         
         let batch = writeBatch(db);
         for (const c of classesToPublish) {
             const examId = `${filterExam.replace(/\s+/g, '_')}_${c}`;
             
             // Calculate stats for this specific class
             const classStudents = filteredData.filter(r => String(r.class) === String(c));
             const highestMarks: Record<string, number> = {};
             const sumMarks: Record<string, number> = {};
             const countMarks: Record<string, number> = {};

             classStudents.forEach(std => {
                if (!std.subjects) return;
                Object.entries(std.subjects).map(([sub, rawMarks]) => {
                    const marks: any = rawMarks;
                    const obtained = marks.obtained === "AB" ? 0 : Number(marks.obtained) || 0;
                    
                    if (!highestMarks[sub] || highestMarks[sub] < obtained) {
                        highestMarks[sub] = obtained;
                    }
                    if (!sumMarks[sub]) { sumMarks[sub] = 0; countMarks[sub] = 0; }
                    sumMarks[sub] += obtained;
                    countMarks[sub] += 1;
                });
             });

             const classAverages: Record<string, number> = {};
             Object.keys(sumMarks).forEach(sub => {
                classAverages[sub] = countMarks[sub] > 0 ? sumMarks[sub] / countMarks[sub] : 0;
             });

             batch.update(doc(db, 'exams', examId), { 
                 published: true,
                 highestMarks: highestMarks,
                 classAverages: classAverages
             });

             // Also save their respective ranks
             classStudents.forEach(std => {
                 batch.update(doc(db, 'resultSummary', `${examId}_${std.studentId}`), {
                     rank: std.rank || 0,
                     published: true
                 });
             });
         }

         // Send a notification to guardians
         const noticeRef = doc(collection(db, 'notices'));
         batch.set(noticeRef, {
             title: `Results Published: ${filterExam}`,
             message: `The results for ${filterExam} have been published for classes: ${classesToPublish.join(', ')}. Students and guardians can now view the results and download report cards from the Result section.`,
             date: new Date().toISOString().split('T')[0],
             priority: 'Urgent',
             targets: ['Student', 'Guardian'],
             isPinned: false,
             status: 'Published',
             timestamp: new Date().toISOString()
         });

         await batch.commit();

         setPublishSuccess(true);
         setStatus({type: 'success', message: `${filterExam} results published! Notification sent to guardians.`});
         setTimeout(() => setPublishSuccess(false), 3000);
     } catch (error: any) {
         setStatus({type: 'error', message: 'Failed to publish: ' + error.message});
     } finally {
         setIsPublishing(false);
     }
  };

  const availableExamsForClass = useMemo(() => {
      const types = new Set<string>();
      if (!filterClass) {
          EXAM_TYPES.forEach((e: string) => types.add(e));
      }
      data.forEach((d: any) => {
          if (!filterClass || String(d.class) === filterClass) {
              types.add(d.examType);
          }
      });
      return Array.from(types);
  }, [data, filterClass, EXAM_TYPES]);

   const generatePDFBlob = async (element: HTMLElement): Promise<Blob> => {
      const canvas = await toCanvas(element, { pixelRatio: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      return pdf.output('blob');
   };

   const handleDownloadSingle = async (std: any) => {
      setPrintPreviewStudent(std);
      setGenerating(true);
      setStatus({type: 'success', message: `Generating PDF for ${std.studentName}...`});
      
      setTimeout(async () => {
          if (hiddenPdfRef.current) {
              try {
                 const blob = await generatePDFBlob(hiddenPdfRef.current);
                 saveAs(blob, `${std.studentName}_${std.class}_${std.examType}_ReportCard.pdf`);
                 setStatus({type: 'success', message: `Downloaded ${std.studentName}'s Report Card.`});
              } catch(e) {
                 setStatus({type: 'error', message: 'Failed to generate PDF.'});
              }
          }
          setGenerating(false);
          setPrintPreviewStudent(null);
      }, 1000); 
   };

   const getFilePrefix = () => {
       if (filterClass && filterExam) return `Class_${filterClass}_${filterExam}`;
       if (filterClass) return `Class_${filterClass}_AllExams`;
       if (filterExam) return `AllClasses_${filterExam}`;
       return `All_Results`;
   };

   const handleDownloadZip = async () => {
      if(filteredData.length === 0) return;
      setGenerating(true);
      setStatus({type: 'success', message: `Starting batch generation for ${filteredData.length} students...`});
      
      const zip = new JSZip();
      for (let i = 0; i < filteredData.length; i++) {
          const std = filteredData[i];
          setPrintPreviewStudent(std);
          await new Promise(r => setTimeout(r, 600)); 
          if (hiddenPdfRef.current) {
              const blob = await generatePDFBlob(hiddenPdfRef.current);
              zip.file(`${std.class}_${std.examType}_${std.rank}_${std.studentName}_${std.studentId}.pdf`, blob);
          }
       }
       
       zip.generateAsync({type:"blob"}).then(function(content) {
           saveAs(content, `${getFilePrefix()}_ReportCards.zip`);
           setStatus({type: 'success', message: 'ZIP file generated successfully!'});
           setGenerating(false);
           setPrintPreviewStudent(null);
       });
   };

   const handleDownloadExcel = async () => {
       if (filteredData.length === 0) return;
       try {
           setGenerating(true);
           setStatus({type: 'success', message: 'Generating Excel File...'});
           const ExcelJS = (await import('exceljs')).default;
           const wb = new ExcelJS.Workbook();
           
           let base64Logo: string | null = null;
           try {
               const logoUrl = '/logo.png';
               const res = await fetch(logoUrl);
               const blob = await res.blob();
               base64Logo = await new Promise((resolve, reject) => {
                   const reader = new FileReader();
                   reader.onloadend = () => resolve(reader.result as string);
                   reader.onerror = reject;
                   reader.readAsDataURL(blob);
               });
           } catch(e) {
               console.warn("Could not fetch logo for excel", e);
           }
           
           let logoId = -1;
           if (base64Logo) {
               logoId = wb.addImage({
                   base64: base64Logo,
                   extension: 'png',
               });
           }

           const uniqueClasses = Array.from(new Set(filteredData.map(d => String(d.class))));

           for (const className of uniqueClasses) {
               const ws = wb.addWorksheet(`Class ${className}`);
               const classData = filteredData.filter((d: any) => String(d.class) === className);
               
               const exams = Array.from(new Set(classData.map((d: any) => d.examType)));
               
               let currentRow = 1;

               for (const exam of exams) {
                   const examData = classData.filter((d: any) => d.examType === exam);
                   
                   // School Header
                   if (logoId !== -1) {
                       ws.addImage(logoId, {
                           tl: { col: 0, row: currentRow - 1 },
                           ext: { width: 80, height: 80 }
                       });
                   }
                   
                   ws.mergeCells(`A${currentRow}:J${currentRow}`);
                   const titleCell = ws.getCell(`A${currentRow}`);
                   titleCell.value = "SHIKSHANTAR ACADEMY";
                   titleCell.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FFD32F2F' } };
                   titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
                   ws.getRow(currentRow).height = 30;
                   
                   currentRow++;
                   ws.mergeCells(`A${currentRow}:J${currentRow}`);
                   const addressCell = ws.getCell(`A${currentRow}`);
                   addressCell.value = "Siraha, Nepal | info@shikshantar.edu.np | +977-1234567890";
                   addressCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1976D2' } };
                   addressCell.alignment = { horizontal: 'center', vertical: 'middle' };

                   currentRow++;
                   ws.mergeCells(`A${currentRow}:J${currentRow}`);
                   const examCell = ws.getCell(`A${currentRow}`);
                   examCell.value = `Class: ${className}   |   Exam: ${exam}`;
                   examCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000000' } };
                   examCell.alignment = { horizontal: 'center', vertical: 'middle' };
                   ws.getRow(currentRow).height = 25;
                   
                   currentRow += 2;
                   
                   // Determine subjects for this exam from the examData
                   const subjectsSet = new Set<string>();
                   examData.forEach(std => {
                       if (std.subjects) {
                           Object.keys(std.subjects).forEach(s => subjectsSet.add(s));
                       }
                   });
                   const subjects = Array.from(subjectsSet);
                   
                   // Table Header Columns
                   const columns = [
                       { header: 'Roll/ID', key: 'roll', width: 12 },
                       { header: 'Student Name', key: 'name', width: 30 },
                   ];
                   
                   // Vivid colors for subjects
                   const subjectColors = ['FFef4444', 'FF3b82f6', 'FFf59e0b', 'FF10b981', 'FF8b5cf6', 'FFec4899', 'FF06b6d4'];
                   
                   subjects.forEach((subj, i) => {
                       columns.push({ header: `${subj} (Marks)`, key: `${subj}_marks`, width: 14 });
                       columns.push({ header: `${subj} (Grade)`, key: `${subj}_grade`, width: 14 });
                       columns.push({ header: `${subj} (GPA)`, key: `${subj}_gpa`, width: 14 });
                   });
                   
                   columns.push({ header: 'Total', key: 'total', width: 10 });
                   columns.push({ header: 'Percentage', key: 'percentage', width: 15 });
                   columns.push({ header: 'Grade', key: 'grade', width: 10 });
                   columns.push({ header: 'GPA', key: 'gpa', width: 10 });
                   columns.push({ header: 'Rank', key: 'rank', width: 10 });
                   
                   const headerRow = ws.getRow(currentRow);
                   headerRow.height = 25;
                   columns.forEach((col, i) => {
                       const cell = headerRow.getCell(i + 1);
                       cell.value = col.header;
                       cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                       cell.alignment = { horizontal: 'center', vertical: 'middle' };
                       ws.getColumn(i + 1).width = col.width;
                       
                       // apply background colors
                       let bgColor = 'FF334155'; // default slate-700
                       if (i >= 2 && i < 2 + subjects.length * 3) {
                           const subIdx = Math.floor((i - 2) / 3);
                           bgColor = subjectColors[subIdx % subjectColors.length];
                       }
                       
                       cell.fill = {
                           type: 'pattern',
                           pattern: 'solid',
                           fgColor: { argb: bgColor }
                       };
                       cell.border = {
                         top: {style:'thin', color: {argb: 'FFCBD5E1'}},
                         left: {style:'thin', color: {argb: 'FFCBD5E1'}},
                         bottom: {style:'thin', color: {argb: 'FFCBD5E1'}},
                         right: {style:'thin', color: {argb: 'FFCBD5E1'}}
                       };
                   });
                   
                   currentRow++;
                   
                   // Add Data
                   examData.forEach((std: any) => {
                       const row = ws.getRow(currentRow);
                       row.getCell(1).value = std.rollNo && std.rollNo !== '00' ? std.rollNo : std.studentId;
                       row.getCell(2).value = std.studentName;
                       row.getCell(1).border = { top: {style:'thin', color: {argb: 'FFCBD5E1'}}, left: {style:'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style:'thin', color: {argb: 'FFCBD5E1'}}, right: {style:'thin', color: {argb: 'FFCBD5E1'}} };
                       row.getCell(2).border = { top: {style:'thin', color: {argb: 'FFCBD5E1'}}, left: {style:'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style:'thin', color: {argb: 'FFCBD5E1'}}, right: {style:'thin', color: {argb: 'FFCBD5E1'}} };
                       
                       let colIdx = 3;
                       subjects.forEach(subj => {
                           let marks: string | number = 'AB';
                           let grade = 'AB';
                           let gpa = '-';
                           
                           if (std.subjects && std.subjects[subj]) {
                               const fm = std.subjects[subj].fullMarks;
                               const displayOm = std.subjects[subj].obtained;
                               if (displayOm !== 'AB') {
                                   marks = displayOm;
                                   const pct = (displayOm / fm) * 100;
                                   let gpaNum = 0.0;
                                   if (pct >= 90) { grade = 'A+'; gpaNum = 4.0; }
                                   else if (pct >= 80) { grade = 'A'; gpaNum = 3.6; }
                                   else if (pct >= 70) { grade = 'B+'; gpaNum = 3.2; }
                                   else if (pct >= 60) { grade = 'B'; gpaNum = 2.8; }
                                   else if (pct >= 50) { grade = 'C+'; gpaNum = 2.4; }
                                   else if (pct >= 40) { grade = 'C'; gpaNum = 2.0; }
                                   else if (pct >= 35) { grade = 'D'; gpaNum = 1.6; }
                                   else { grade = 'NG'; gpaNum = 0.0; }
                                   gpa = gpaNum.toFixed(1);
                               }
                           }
                           
                           row.getCell(colIdx).value = marks;
                           row.getCell(colIdx + 1).value = grade;
                           row.getCell(colIdx + 2).value = gpa;
                           
                           row.getCell(colIdx).border = { top: {style:'thin', color: {argb: 'FFCBD5E1'}}, left: {style:'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style:'thin', color: {argb: 'FFCBD5E1'}}, right: {style:'thin', color: {argb: 'FFCBD5E1'}} };
                           row.getCell(colIdx+1).border = { top: {style:'thin', color: {argb: 'FFCBD5E1'}}, left: {style:'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style:'thin', color: {argb: 'FFCBD5E1'}}, right: {style:'thin', color: {argb: 'FFCBD5E1'}} };
                           row.getCell(colIdx+2).border = { top: {style:'thin', color: {argb: 'FFCBD5E1'}}, left: {style:'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style:'thin', color: {argb: 'FFCBD5E1'}}, right: {style:'thin', color: {argb: 'FFCBD5E1'}} };
                           
                           row.getCell(colIdx).alignment = { horizontal: 'center' };
                           row.getCell(colIdx+1).alignment = { horizontal: 'center' };
                           row.getCell(colIdx+2).alignment = { horizontal: 'center' };
                           
                           colIdx += 3;
                       });
                       
                       row.getCell(colIdx).value = std.total;
                       row.getCell(colIdx+1).value = parseFloat(std.percentage.toFixed(2));
                       row.getCell(colIdx+2).value = std.grade;
                       row.getCell(colIdx+3).value = std.gpa || '-';
                       row.getCell(colIdx+4).value = std.rank;
                       
                       for (let i = 0; i < 5; i++) {
                           row.getCell(colIdx + i).border = { top: {style:'thin', color: {argb: 'FFCBD5E1'}}, left: {style:'thin', color: {argb: 'FFCBD5E1'}}, bottom: {style:'thin', color: {argb: 'FFCBD5E1'}}, right: {style:'thin', color: {argb: 'FFCBD5E1'}} };
                           row.getCell(colIdx + i).alignment = { horizontal: 'center' };
                       }
                       
                       currentRow++;
                   });
                   
                   currentRow += 4; // Space between exams
               }
           }
           
           const buffer = await wb.xlsx.writeBuffer();
           saveAs(new Blob([buffer]), `${getFilePrefix()}_Results.xlsx`);
           setGenerating(false);
           setStatus(null);
       } catch (err: any) {
           console.error("Error generating Excel:", err);
           setGenerating(false);
           setStatus({type: 'error', message: `Failed to generate Excel: ${err.message}`});
       }
   };

  // Check if all in filtered view are published
  const allPublished = filteredData.length > 0 && filteredData.every(r => r.published);

  return (
    <div>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="relative w-full md:w-auto">
                <input 
                   list="history-exams"
                   value={filterExam} 
                   onChange={e=>setFilterExam(e.target.value)} 
                   placeholder="Search or Select Exam..."
                   className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="history-exams">
                    {availableExamsForClass.map((ex:string) => <option key={ex} value={ex}>{ex}</option>)}
                </datalist>
            </div>
            <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Permitted Classes</option>
                {allowedClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input type="text" placeholder="Search name or ID..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
                <button onClick={handleDownloadExcel} disabled={generating || filteredData.length === 0} className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all ${generating || filteredData.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#107c41] text-white hover:bg-[#0c5a2f] active:scale-95'}`}>
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                </button>
                <button onClick={handleDownloadZip} disabled={generating || filteredData.length === 0} className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all ${generating || filteredData.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white hover:from-blue-800 hover:to-indigo-900 active:scale-95'}`}>
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                    ZIP
                </button>
                <button 
                    onClick={handlePublishResults} 
                    disabled={isPublishing || filteredData.length === 0 || allPublished}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${(isPublishing || filteredData.length === 0) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : allPublished ? 'bg-green-100 border border-green-300 text-green-700 cursor-not-allowed' : 'bg-[#10b981] text-white hover:bg-[#059669] active:scale-95'}`}
                >
                    {allPublished || publishSuccess ? <CheckCircle2 className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                    {allPublished ? 'Published ' : isPublishing ? 'Publishing...' : 'Publish'}
                </button>
            </div>
        </div>

        {classStats && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-xl mb-6 shadow-sm flex flex-wrap gap-6 items-center">
                <div className="flex-1 min-w-[200px]">
                   <h3 className="font-black text-primary text-lg mb-2">Class Statistics ({filterClass ? `Class ${filterClass}` : 'All Classes'}{filterExam ? ` - ${filterExam}` : ''})</h3>
                   <div className="flex gap-4 text-sm font-bold text-gray-700">
                      <div><span className="text-gray-500 block text-xs">High</span> {classStats.max.toFixed(1)}%</div>
                      <div><span className="text-gray-500 block text-xs">Low</span> {classStats.min.toFixed(1)}%</div>
                      <div><span className="text-gray-500 block text-xs">Average</span> {classStats.avg.toFixed(1)}%</div>
                      <div><span className="text-gray-500 block text-xs">Pass</span> <span className={classStats.passPct >= 50 ? 'text-green-600' : 'text-red-600'}>{classStats.passPct.toFixed(1)}%</span></div>
                   </div>
                </div>
                <div className="flex-1 min-w-[300px] border-l border-blue-200 pl-6 border-dashed">
                   <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Average Marks per Subject</h4>
                   <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                       {Object.keys(classStats.subAvg).map(s => (
                           <div key={s} className="bg-white px-3 py-1 rounded shadow-sm border border-blue-100 whitespace-nowrap">
                              <span className="font-bold text-gray-800">{s}:</span> <span className="text-[#10b981] font-black">{classStats.subAvg[s]}</span>
                           </div>
                       ))}
                   </div>
                </div>
            </div>
        )}

        {filteredData.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-400 font-bold">
                No results found for selected criteria.
            </div>
        ) : (
            (Object.entries(
                filteredData.reduce((acc, std) => {
                    const key = `Class ${std.class} - ${std.examType}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(std);
                    return acc;
                }, {} as Record<string, StudentResult[]>)
            ) as [string, StudentResult[]][]).map(([groupTitle, groupStudents]) => {
                const groupSubjects = Array.from(new Set(groupStudents.flatMap(std => Object.keys(std.subjects))));
                return (
                <div key={groupTitle} className="mb-8 last:mb-0">
                    <h4 className="font-black border-primary text-primary text-md px-4 py-2 bg-blue-50 border border-blue-100 rounded-t-xl">
                        {groupTitle}
                    </h4>
                    <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-primary border-b text-gray-600 font-bold uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="p-4">Rank</th>
                                    <th className="p-4">Student</th>
                                    {groupSubjects.map(s => <th key={s} className="p-4 text-center">{s}</th>)}
                                    <th className="p-4 text-center">Total</th>
                                    <th className="p-4 text-center">%</th>
                                    <th className="p-4 text-center">Grade</th>
                                    <th className="p-4 text-center">Published</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {groupStudents.map((std: StudentResult) => (
                                    <tr key={`${std.studentId}_${std.examType}`} className="hover:bg-blue-50 transition-colors">
                                        <td className="p-4">
                                           <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-700 text-xs">{std.rank}</div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-black text-gray-900 uppercase">{std.studentName}</p>
                                            <p className="text-xs text-gray-500 font-bold">ID: {std.rollNo !== '00' && std.rollNo ? std.rollNo : std.studentId} | Cls: {std.class} | Exam: {std.examType}</p>
                                        </td>
                                        {groupSubjects.map(s => {
                                            const subject = std.subjects[s];
                                            if (!subject) return <td key={s} className="p-4 text-center">-</td>;
                                            const m = subject.obtained;
                                            const fm = subject.fullMarks;
                                            return (
                                                <td key={s} className="p-4 text-center">
                                                   {m === 'AB' ? <span className="text-red-500 font-bold text-xs">AB</span> : (
                                                      <div>
                                                         <span className="font-black text-gray-800">{m}</span><br/>
                                                         <span className={`text-[10px] font-bold ${getGrade(m, fm).includes('F') || getGrade(m, fm).includes('NG') ? 'text-red-500' : 'text-gray-400'}`}>{getGrade(m, fm)}</span>
                                                      </div>
                                                   )}
                                                </td>
                                            )
                                        })}
                                        <td className="p-4 text-center font-black text-gray-800">{std.total}</td>
                                        <td className="p-4 text-center font-black text-primary">{std.percentage.toFixed(1)}%</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-sm text-xs font-black ${ std.grade.includes('A') ? 'bg-green-100 text-green-700' : std.grade.includes('B') ? 'bg-blue-100 -' : std.grade.includes('C') ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700' }`}>
                                                {std.grade || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                           {std.published ? 
                                             <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded">✓ Published</span> :
                                             <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded">Draft</span>
                                           }
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setEditingRecord(JSON.parse(JSON.stringify(std)))} className="p-2 bg-gray-100 text-gray-600 rounded-lg md:hover:bg-primary md:hover:text-white transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => deleteRecord(std.studentId, std.examType)} className="p-2 bg-gray-100 text-red-500 rounded-lg md:hover:bg-red-500 md:hover:text-white transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDownloadSingle(std)} disabled={generating} className="p-2 bg-gray-100 text-primary rounded-lg md:hover:bg-primary md:hover:text-white transition-colors disabled:opacity-50" title="Download Report Card"><Download className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                );
            })
        )}

        {/* Edit Modal */}
        {editingRecord && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b text-primary flex justify-between items-center text-gray-800">
                        <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2"><Edit2 className="w-4 h-4"/> Edit Record: {editingRecord.studentName}</h3>
                        <button onClick={() => setEditingRecord(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto bg-white flex-1 space-y-4">
                       <div className="grid grid-cols-2 gap-4 border-primary text-primary p-3 rounded-lg border border-gray-100 mb-4">
                           <div><span className="text-xs font-bold text-gray-400 uppercase">Class</span><p className="font-bold">{editingRecord.class}</p></div>
                           <div><span className="text-xs font-bold text-gray-400 uppercase">Exam Type</span><p className="font-bold">{editingRecord.examType}</p></div>
                       </div>
                       
                       <h4 className="font-black text-gray-800 border-b pb-2">Subject Marks</h4>
                       {Object.entries(editingRecord.subjects).map(([s, rawMarks]) => {
                           const marks = rawMarks as any;
                           return (
                               <div key={s} className="flex justify-between items-center">
                                   <label className="font-bold text-gray-700">{s} (out of {marks.fullMarks})</label>
                                   <input type="text" value={marks.obtained} onChange={e => {
                                       const val = e.target.value === 'AB' ? 'AB' : Number(e.target.value);
                                       setEditingRecord({
                                           ...editingRecord, 
                                           subjects: {
                                               ...editingRecord.subjects,
                                               [s]: { ...marks, obtained: val as any }
                                           }
                                       })
                                   }} className="w-24 text-center px-3 py-1.5 border rounded-lg font-black text-lg focus:ring-2 focus:ring-primary outline-none" />
                               </div>
                           );
                       })}

                       <div className="mt-6 pt-4 border-t">
                           <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Reason for Edit</label>
                           <textarea value={editReason} onChange={e=>setEditReason(e.target.value)} rows={2} className="w-full p-2 border border-red-200 rounded-lg bg-red-50 outline-none focus:ring-2 focus:ring-red-400" placeholder="e.g. Recounting verified by Principal..."></textarea>
                       </div>
                    </div>
                    <div className="p-4 border-t text-primary flex justify-end gap-2">
                        <button onClick={() => setEditingRecord(null)} className="px-4 py-2 font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                        <button onClick={saveEdit} disabled={!editReason} className={`px-5 py-2 font-bold rounded-lg flex items-center gap-2 ${editReason ? 'bg-[var(--primary)] text-white hover:bg-primary-dark shadow-md' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Save className="w-4 h-4"/> Save Changes</button>
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Print Container */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            {printPreviewStudent && (
                 <ReportCardTemplate 
                    ref={hiddenPdfRef} 
                    student={printPreviewStudent} 
                 />
            )}
        </div>
    </div>
  );
}
