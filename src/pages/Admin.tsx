import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export default function Admin() {
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  useEffect(() => {
    const stored = localStorage.getItem('school_results');
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);
        
        // Validate basic structure
        if (parsedData.length > 0 && !('StudentId' in (parsedData[0] as object))) {
          setStatus({ type: 'error', message: 'Invalid format. Excel must have a "StudentId" column.' });
          return;
        }

        setData(parsedData);
        localStorage.setItem('school_results', JSON.stringify(parsedData));
        setStatus({ type: 'success', message: `Successfully loaded ${parsedData.length} student records.` });
      } catch (error) {
        setStatus({ type: 'error', message: 'Error parsing Excel file. Please ensure it is a valid .xlsx or .csv file.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all result data?')) {
      localStorage.removeItem('school_results');
      setData([]);
      setStatus({ type: 'success', message: 'All result data cleared.' });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
          <span>Admin Dashboard - Result Management</span>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#1f2937] mb-2">Upload Results (Excel/CSV)</h3>
            <p className="text-xs text-[#6b7280] mb-4">
              Upload an Excel file containing student marks. The file must have columns like: 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">StudentId</code>, 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">Name</code>, 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">Class</code>, 
              <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">Mathematics</code>, etc.
            </p>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#e5e7eb] border-dashed rounded-lg cursor-pointer bg-[#f9fafb] hover:bg-[#f3f4f6] transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-[#6b7280] mb-2" />
                <p className="text-sm text-[#6b7280]"><span className="font-semibold text-[#1e3a8a]">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-[#6b7280] mt-1">.XLSX, .XLS, or .CSV</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>

            {status.type && (
              <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                status.type === 'success' ? 'bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]' : 'bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]'
              }`}>
                {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.message}
              </div>
            )}
          </div>

          <div className="flex-1 bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-[#1f2937] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" />
                Current Database Status
              </h3>
              {data.length > 0 && (
                <button onClick={clearData} className="text-xs text-[#ef4444] hover:text-[#b91c1c] flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-[0.8rem] opacity-70">Total Records</span>
              <span className="text-[0.8rem] font-semibold">{data.length} Students</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-[0.8rem] opacity-70">Last Updated</span>
              <span className="text-[0.8rem] font-semibold">{data.length > 0 ? 'Just now' : 'Never'}</span>
            </div>

            {data.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-[#6b7280] mb-2 uppercase">Preview (First 3 rows)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[0.7rem] border-collapse">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {Object.keys(data[0]).slice(0, 4).map(key => (
                          <th key={key} className="p-1 font-semibold text-[#6b7280]">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-[#f3f4f6]">
                          {Object.values(row).slice(0, 4).map((val: any, j) => (
                            <td key={j} className="p-1">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
