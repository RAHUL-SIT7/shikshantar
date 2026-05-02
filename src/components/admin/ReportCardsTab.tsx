import React, { useState, useRef } from 'react';
import { Download, FileArchive, FileText, Loader2, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ReportCardTemplate } from './ReportCardTemplate';

export function ReportCardsTab({ EXAM_TYPES, allClasses, data, setStatus }: any) {
  const [filterClass, setFilterClass] = useState(allClasses[0] || '');
  const [filterExam, setFilterExam] = useState(EXAM_TYPES[0]);
  const [generating, setGenerating] = useState(false);
  const [printPreviewStudent, setPrintPreviewStudent] = useState<any | null>(null);

  const hiddenPdfRef = useRef<HTMLDivElement>(null);

  const students = (data as any[]).filter(r => String(r.class) === String(filterClass) && r.examType === filterExam);

  // Ranks and totals calculation
  let withStats = [...students];

  withStats.sort((a, b) => b.percentage - a.percentage);
  let currentRank = 1;
  withStats = withStats.map((r, i, arr) => {
     if (i > 0 && arr[i-1].percentage > r.percentage) currentRank = i + 1;
     return { ...r, rank: currentRank };
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
             zip.file(`${std.rank}_${std.studentName}_${std.studentId}.pdf`, blob);
         }
      }
      
      zip.generateAsync({type:"blob"}).then(function(content) {
          saveAs(content, `Class_${filterClass}_${filterExam}_ReportCards.zip`);
          setStatus({type: 'success', message: 'ZIP file generated successfully!'});
          setGenerating(false);
          setPrintPreviewStudent(null);
      });
  };

  return (
    <div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <select value={filterExam} onChange={e=>setFilterExam(e.target.value)} className="px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#1e3a8a]">
                {EXAM_TYPES.map((ex:string) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#1e3a8a]">
                <option value="">-- Select Class --</option>
                {allClasses.map((c: string) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <button onClick={handleDownloadZip} disabled={generating || withStats.length === 0} className={`ml-auto px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all ${generating || withStats.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white hover:from-blue-800 hover:to-indigo-900 active:scale-95'}`}>
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileArchive className="w-5 h-5" />}
                {generating ? 'Generating ZIP...' : 'Download All as ZIP'}
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                    {withStats.map((std: any) => (
                        <tr key={std.studentId} className="hover:bg-gray-50">
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
                    {withStats.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">No students found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

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
