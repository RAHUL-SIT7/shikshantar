import React, { useState, useEffect, useMemo } from 'react';
import { getClassResults } from '../../lib/resultService';
import { StudentResult, Subject } from '../../types/result';
import { BarChart, ChevronsUpDown, Download, Printer, Award, Users, TrendingUp, TrendingDown, Percent, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClassResultViewProps {
    examTypes: string[];
    allClasses: string[];
}

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string | number, color: string }) => (
    <div className={`bg-white p-4 rounded-lg shadow-md border-l-4`} style={{ borderLeftColor: color }}>
        <div className="flex items-center">
            <div className={`p-2 rounded-full mr-4`} style={{ backgroundColor: `${color}20`}}>{icon}</div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    </div>
);

const ClassResultView: React.FC<ClassResultViewProps> = ({ examTypes, allClasses }) => {
    const [examType, setExamType] = useState(examTypes[0]);
    const [classId, setClassId] = useState(allClasses[0] || '');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    
    const [results, setResults] = useState<StudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [sortConfig, setSortConfig] = useState<{ key: keyof StudentResult, direction: 'asc' | 'desc' } | null>({ key: 'rank', direction: 'asc'});

    const fetchData = async () => {
        if (!examType || !classId || !year) {
            setError("Please select all filters.");
            setResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await getClassResults(examType, classId, year);
            setResults(data);
            if (data.length === 0) {
                setError('No results found for this selection.');
            }
        } catch (err: any) {
            setError(err.message);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const summaryStats = useMemo(() => {
        if (results.length === 0) {
            return { total: 0, passed: 0, failed: 0, avgPercent: 0, highest: 0, lowest: 0 };
        }
        const total = results.length;
        const passed = results.filter(r => r.division !== 'FAIL').length;
        const percentages = results.map(r => r.percentage);
        const avgPercent = percentages.reduce((a, b) => a + b, 0) / total;
        const highest = Math.max(...percentages);
        const lowest = Math.min(...percentages);

        return {
            total,
            passed,
            failed: total - passed,
            avgPercent: avgPercent.toFixed(2),
            highest: highest.toFixed(2),
            lowest: lowest.toFixed(2)
        }
    }, [results]);

    const sortedResults = useMemo(() => {
        let sortableItems = [...results];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [results, sortConfig]);
    
    const requestSort = (key: keyof StudentResult) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getRankClass = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-yellow-100 border-l-4 border-yellow-400';
            case 2: return 'bg-gray-200 border-l-4 border-gray-400';
            case 3: return 'bg-yellow-600/20 border-l-4 border-yellow-700';
            default: return 'border-l-4 border-transparent';
        }
    };

    const subjectHeaders = useMemo(() => {
        if (results.length === 0) return [];
        // Assumption: All students in a class result set have the same subjects
        return results[0].subjects.map(s => s.name);
    }, [results]);

    const handleExport = () => {
        const dataToExport = sortedResults.map(r => ({
            Rank: r.rank,
            'Roll No': r.rollNo,
            Name: r.name,
            ...r.subjects.reduce((acc, subj) => {
                acc[subj.name] = subj.obtained;
                return acc;
            }, {} as {[key: string]: number | 'AB'}),
            Total: r.total,
            '%': r.percentage.toFixed(2),
            Grade: r.grade,
            Division: r.division,
            Remarks: r.remarks,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Class_${classId}_${examType}_${year}`);
        XLSX.writeFile(wb, `results_${classId}_${examType}_${year}.xlsx`);
    };

    const handlePrint = () => window.print();

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-[#1E3A5F]">Class Result Viewer</h1>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 flex items-center gap-2"><Download size={16}/> Export</button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-[#1E3A5F] text-white font-semibold rounded-lg shadow-md hover:bg-opacity-90 flex items-center gap-2"><Printer size={16}/> Print</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
                    <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] outline-none">
                        {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] outline-none">
                        {allClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                    <input type="text" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E3A5F] outline-none" />
                    <button onClick={fetchData} disabled={isLoading} className="w-full py-2 bg-[#1E3A5F] text-white font-bold rounded-lg hover:bg-opacity-90 disabled:bg-gray-400">
                        {isLoading ? 'Loading...' : 'View Results'}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-lg shadow-md animate-pulse"></div>)}</div>
                    <div className="h-96 bg-white rounded-lg shadow-md animate-pulse"></div>
                </div>
            ) : error ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <p className="text-red-500 font-semibold">{error}</p>
                </div>
            ) : (
                <div className="space-y-6">
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard icon={<Users size={20} className="text-[#1E3A5F]"/>} title="Total Students" value={summaryStats.total} color="#1E3A5F" />
                        <StatCard icon={<CheckCircle2 size={20} className="text-green-500"/>} title="Pass Count" value={summaryStats.passed} color="#22C55E"/>
                        <StatCard icon={<AlertCircle size={20} className="text-red-500"/>} title="Fail Count" value={summaryStats.failed} color="#EF4444"/>
                        <StatCard icon={<Percent size={20} className="text-blue-500"/>} title="Class Average" value={`${summaryStats.avgPercent}%`} color="#3B82F6"/>
                        <StatCard icon={<TrendingUp size={20} className="text-purple-500"/>} title="Highest %" value={`${summaryStats.highest}%`} color="#8B5CF6"/>
                        <StatCard icon={<TrendingDown size={20} className="text-yellow-500"/>} title="Lowest %" value={`${summaryStats.lowest}%`} color="#F59E0B"/>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md overflow-x-auto print:shadow-none">
                        <h2 className="text-xl p-4 font-bold text-[#1E3A5F] print:text-center">Results for {examType} - Class {classId} ({year})</h2>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 print:bg-gray-100">
                                <tr className="text-gray-600">
                                    {['rank', 'rollNo', 'name', ...subjectHeaders, 'total', 'percentage', 'grade', 'division', 'remarks'].map(key => (
                                        <th key={key} onClick={() => requestSort(key as keyof StudentResult)} className="p-3 font-bold uppercase cursor-pointer hover:bg-gray-200 print:px-2 print:py-1">
                                            <div className="flex items-center gap-1">
                                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                                                <ChevronsUpDown size={14} className="print:hidden"/>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedResults.map((r) => (
                                    <tr key={r.rollNo} className={`border-b hover:bg-gray-50 print:border-gray-300 ${getRankClass(r.rank)}`}>
                                        <td className="p-3 font-bold print:px-2 print:py-1"><div className="flex items-center gap-1">{r.rank <=3 && <Award size={16}/>}{r.rank}</div></td>
                                        <td className="p-3 print:px-2 print:py-1">{r.rollNo}</td>
                                        <td className="p-3 font-semibold text-gray-800 print:px-2 print:py-1">{r.name}</td>
                                        {r.subjects.map((s, i) => (
                                            <td key={i} className={`p-3 text-center print:px-2 print:py-1 ${(s.obtained !== 'AB' && s.obtained < s.passMarks) ? 'text-red-600 font-bold' : ''}`}>
                                                {s.obtained}
                                            </td>
                                        ))}
                                        <td className="p-3 font-bold print:px-2 print:py-1">{r.total}</td>
                                        <td className="p-3 print:px-2 print:py-1">{r.percentage.toFixed(2)}</td>
                                        <td className="p-3 print:px-2 print:py-1">{r.grade}</td>
                                        <td className="p-3 print:px-2 print:py-1">{r.division}</td>
                                        <td className="p-3 print:px-2 print:py-1">{r.remarks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\:hidden { display: none; }
                    .print\:shadow-none { box-shadow: none; }
                    .print\:text-center { text-align: center; }
                    .print\:border-gray-300 { border-color: #D1D5DB; }
                    .print\:px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
                    .print\:py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                    .p-3 { padding: 4px 8px !important; } 
                    h1, h2 { font-size: 14pt !important; }
                    table { font-size: 9pt !important; page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                }
            `}</style>
        </div>
    );
}

export default ClassResultView;
