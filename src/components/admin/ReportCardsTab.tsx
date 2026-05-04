import React, { useState, useRef, useMemo } from 'react';
import { Download, FileArchive, FileText, Loader2, Search, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { ReportCardTemplate } from './ReportCardTemplate';

export function ReportCardsTab({ EXAM_TYPES, allClasses, data, setStatus }: any) {
  const [filterClass, setFilterClass] = useState(allClasses[0] || '');
  const [filterExam, setFilterExam] = useState('');
  const [generating, setGenerating] = useState(false);
  const [printPreviewStudent, setPrintPreviewStudent] = useState<any | null>(null);

  const hiddenPdfRef = useRef<HTMLDivElement>(null);

  const students = (data as any[]).filter(r => String(r.class) === String(filterClass) && (!filterExam || (r.examType && r.examType.toLowerCase().includes(filterExam.toLowerCase()))));

  // Ranks and totals calculation
  let withStats = [...students];

  const groups: Record<string, any[]> = {};
  withStats.forEach(r => {
      const key = `${r.class}_${r.examType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
  });

  Object.values(groups).forEach(group => {
      group.sort((a, b) => b.percentage - a.percentage);
      let currentRank = 1;
      group.forEach((r, i, arr) => {
         if (i > 0 && arr[i-1].percentage > r.percentage) currentRank = i + 1;
         r.rank = currentRank;
      });
  });

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
     }, 1000); // Give React time to render the hidden template
  };

  const getFilePrefix = () => {
      if (filterClass && filterExam) return `Class_${filterClass}_${filterExam}`;
      if (filterClass) return `Class_${filterClass}_AllExams`;
      if (filterExam) return `AllClasses_${filterExam}`;
      return `All_Results`;
  };

  const handleDownloadZip = async () => {
     if(withStats.length === 0) return;
     setGenerating(true);
     setStatus({type: 'success', message: `Starting batch generation for ${withStats.length} students. This may take a minute...`});
     
     const zip = new JSZip();
     // We have to iterate and generate one by one
     for (let i = 0; i < withStats.length; i++) {
         const std = withStats[i];
         setPrintPreviewStudent(std);
         // Wait for render
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

  const handleDownloadExcel = () => {
      if (withStats.length === 0) return;
      
      const excelData = withStats.map((std: any) => {
          const row: any = {
              'Roll/ID': std.studentId,
              'Student Name': std.studentName,
              'Class': std.class,
              'Exam': std.examType
          };
          
          if (std.subjects) {
              Object.keys(std.subjects).forEach(subj => {
                  const marks = std.subjects[subj];
                  const fm = marks.fullMarks;
                  const displayOm = marks.obtained;
                  let grade = 'AB';
                  let gpa = 0.0;
                  if (displayOm !== 'AB') {
                      const pct = (displayOm / fm) * 100;
                      if (pct >= 90) { grade = 'A+'; gpa = 4.0; }
                      else if (pct >= 80) { grade = 'A'; gpa = 3.6; }
                      else if (pct >= 70) { grade = 'B+'; gpa = 3.2; }
                      else if (pct >= 60) { grade = 'B'; gpa = 2.8; }
                      else if (pct >= 50) { grade = 'C+'; gpa = 2.4; }
                      else if (pct >= 40) { grade = 'C'; gpa = 2.0; }
                      else if (pct >= 35) { grade = 'D'; gpa = 1.6; }
                      else { grade = 'NG'; gpa = 0.0; }
                  }

                  row[`${subj} (Total)`] = displayOm;
                  row[`${subj} (Grade)`] = grade;
                  row[`${subj} (GPA)`] = gpa.toFixed(1);
              });
          }

          row['Total'] = std.total;
          row['Full Total'] = std.fullTotal;
          row['Percentage'] = parseFloat(std.percentage.toFixed(2));
          row['Grade'] = std.grade;
          row['GPA'] = std.gpa || '-';
          row['Rank'] = std.rank;
          
          return row;
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      XLSX.writeFile(wb, `${getFilePrefix()}_Results.xlsx`);
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

  return (
    <div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative w-full md:w-auto">
                <input 
                   list="reportcard-exams"
                   value={filterExam} 
                   onChange={e=>setFilterExam(e.target.value)} 
                   placeholder="Search or Select Exam..."
                   className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
                <datalist id="reportcard-exams">
                    {availableExamsForClass.map((ex:string) => <option key={ex} value={ex}>{ex}</option>)}
                </datalist>
            </div>
            <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#1e3a8a]">
                <option value="">-- Select Class --</option>
                {allClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-2">
                <button onClick={handleDownloadExcel} disabled={generating || withStats.length === 0} className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all ${generating || withStats.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#107c41] text-white hover:bg-[#0c5a2f] active:scale-95'}`}>
                    <FileSpreadsheet className="w-5 h-5" />
                    Export to Excel
                </button>
                <button onClick={handleDownloadZip} disabled={generating || withStats.length === 0} className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all ${generating || withStats.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white hover:from-blue-800 hover:to-indigo-900 active:scale-95'}`}>
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileArchive className="w-5 h-5" />}
                    {generating ? 'Generating ZIP...' : 'Download ZIP'}
                </button>
            </div>
        </div>

        {withStats.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 font-bold">
                No students found.
            </div>
        ) : (
            (Object.entries(
                withStats.reduce((acc, std) => {
                    const key = `Class ${std.class} - ${std.examType}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(std);
                    return acc;
                }, {} as Record<string, any[]>)
            ) as [string, any[]][]).map(([groupTitle, groupStudents]) => (
                <div key={groupTitle} className="mb-8 last:mb-0">
                    <h4 className="font-black text-[#1e3a8a] text-md px-4 py-2 bg-blue-50 border border-blue-100 rounded-t-xl">
                        {groupTitle}
                    </h4>
                    <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 overflow-hidden">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#f8fafc] border-b text-gray-600 font-bold uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="p-4">Rank</th>
                                    <th className="p-4">Student</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">%</th>
                                    <th className="p-4 text-right">Report Card</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {groupStudents.map((std: any) => (
                                    <tr key={`${std.studentId}_${std.examType}`} className="hover:bg-gray-50">
                                        <td className="p-4 font-black text-gray-600">#{std.rank}</td>
                                        <td className="p-4 font-bold text-gray-800 uppercase">{std.studentName} <span className="text-gray-400 font-normal text-xs ml-2">ID: {std.studentId}</span></td>
                                        <td className="p-4 font-bold text-gray-600">{std.total} / {std.fullTotal}</td>
                                        <td className="p-4 font-black text-[#1e3a8a]">{std.percentage.toFixed(1)}%</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDownloadSingle(std)} disabled={generating} className="bg-gray-100 text-[#1e3a8a] px-4 py-1.5 rounded-md font-bold text-xs hover:bg-gray-200 flex items-center gap-2 ml-auto">
                                                <Download className="w-3 h-3" /> Download PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))
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
