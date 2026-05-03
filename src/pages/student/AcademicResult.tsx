import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getStudentResults, getClassAverageAndTopper } from '../../lib/resultService';
import { StudentResult } from '../../types/result';
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Award, TrendingUp, TrendingDown, ChevronsRight, Printer } from 'lucide-react';
import { PrintableMarksheet } from '../../components/PrintableMarksheet';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const SkeletonLoader = () => (
    <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
    </div>
);

interface StudentData {
    uid: string;
    rollNo: string;
    classId: string;
}

export default function AcademicResult() {
    const [results, setResults] = useState<StudentResult[]>([]);
    const [selectedExam, setSelectedExam] = useState<StudentResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const marksheetRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<StudentData | null>(null);
    const [comparisonStats, setComparisonStats] = useState<{[subject: string]: { average: number; topper: number }} | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.rollNo && userData.classId) {
                            setCurrentUser({
                                uid: user.uid,
                                rollNo: userData.rollNo,
                                classId: userData.classId,
                            });
                        } else {
                            setError("Your user profile is missing required fields (rollNo, classId).");
                            setLoading(false);
                        }
                    } else {
                        setError("User document not found.");
                        setLoading(false);
                    }
                } catch (err) {
                    setError("Failed to fetch user data.");
                    setLoading(false);
                }
            } else {
                setError("You must be logged in to view results.");
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                const academicYears = ['2083-2084', '2082-2083'];
                const examTypes = ['First Terminal', 'Second Terminal', 'Final Exam'];

                const studentResults = await getStudentResults(currentUser.rollNo, currentUser.classId, academicYears, examTypes);
                const publishedResults = studentResults.filter(r => r.published);

                if (publishedResults.length > 0) {
                    setResults(publishedResults.sort((a,b) => (a.publishedAt?.seconds || 0) - (b.publishedAt?.seconds || 0)));
                    setSelectedExam(publishedResults[0]);
                } else {
                    setError('No results have been published for you yet.');
                }
            } catch (err: any) {
                setError('Failed to load your results.');
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [currentUser]);

    useEffect(() => {
        if (!selectedExam || !currentUser) return;

        const fetchComparisonData = async () => {
            try {
                const stats = await getClassAverageAndTopper(selectedExam.examType, currentUser.classId, selectedExam.academicYear);
                setComparisonStats(stats);
            } catch (error) {
                console.error("Failed to fetch comparison data:", error);
            }
        };

        fetchComparisonData();
    }, [selectedExam, currentUser]);

    const handlePrint = () => {
        if (!selectedExam) return;
        document.title = `${selectedExam.name} - ${selectedExam.examType}`;
        window.print();
    };

    const comparisonData = useMemo(() => {
        if (!selectedExam) return [];
        return selectedExam.subjects.map(s => ({
            name: s.name,
            'Your Marks': s.obtained === 'AB' ? 0 : s.obtained,
            'Class Average': comparisonStats && comparisonStats[s.name] ? Math.round(comparisonStats[s.name].average) : 0,
            'Topper Marks': comparisonStats && comparisonStats[s.name] ? comparisonStats[s.name].topper : 0,
        }));
    }, [selectedExam, comparisonStats]);

    const trendData = useMemo(() => {
        return results.map(r => ({
            name: r.examType,
            'Your %': r.percentage,
            'Average %': r.percentage - Math.random() * 5, // Mock data
            'Topper %': r.percentage + Math.random() * 5, // Mock data
        }));
    }, [results]);

    if (loading) return <SkeletonLoader />;
    if (error) return <div className="text-center py-20 text-red-500 font-semibold">{error}</div>;

    return (
        <div className="p-4 md:p-6 bg-gray-50 font-sans">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-marksheet, #printable-marksheet * { visibility: visible; }
                    #printable-marksheet { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none; }
                }
            `}</style>

            <div className="no-print">
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Your Published Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {results.map(res => (
                        <div key={res.examType} onClick={() => setSelectedExam(res)} 
                             className={`p-4 rounded-lg shadow-md cursor-pointer transition-all border-l-8 ${selectedExam?.examType === res.examType ? 'border-[#1E3A5F] bg-white' : 'border-transparent bg-white hover:bg-gray-100'}`}>
                            <p className="font-bold text-lg text-[#1E3A5F]">{res.examType}</p>
                            <p className="text-sm text-gray-500 font-medium">{res.academicYear}</p>
                            <div className="flex justify-between items-end mt-3">
                                <div>
                                    <p className="text-sm font-semibold">Grade: <span className="font-extrabold text-xl">{res.grade}</span></p>
                                    <p className="text-sm font-semibold">Rank: <span className="font-extrabold text-xl">{res.rank}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-2xl">{res.percentage.toFixed(2)}<span className="text-sm">%</span></p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedExam && (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-lg no-print">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-[#1E3A5F]">Marksheet: {selectedExam.examType}</h3>
                            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white font-semibold rounded-lg hover:bg-opacity-90">
                                <Printer size={16} /> Download Marksheet
                            </button>
                         </div>
                        <PrintableMarksheet result={selectedExam} ref={marksheetRef} /> 
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-lg no-print">
                        <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">Subject-wise Comparison</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={comparisonData}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Your Marks" fill="#1E3A5F" />
                                    <Bar dataKey="Class Average" fill="#90A4AE" />
                                    <Bar dataKey="Topper Marks" fill="#2E7D32" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {results.length > 1 && (
                        <div className="bg-white p-6 rounded-lg shadow-lg no-print">
                            <h3 className="text-xl font-bold text-[#1E3A5F] mb-4">Your Progress Trend</h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={trendData}>
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="Your %" stroke="#1E3A5F" strokeWidth={3} />
                                        <Line type="monotone" dataKey="Average %" stroke="#90A4AE" />
                                        <Line type="monotone" dataKey="Topper %" stroke="#2E7D32" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="hidden print:block">
                {selectedExam && <PrintableMarksheet result={selectedExam} ref={marksheetRef}/>}
            </div>
        </div>
    );
}
