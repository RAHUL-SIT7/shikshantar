import React, { useState, useEffect } from 'react';
import { formatBSDate, getBSYearMonthDate } from '../lib/nepaliDate';
import { ArrowRight, BookOpen, Users, Trophy, MapPin, Edit2, Save, X, Calendar, Megaphone, ChevronRight, Calculator, PieChart as PieChartIcon, Bell, Download, CheckCircle2, AlertCircle, FileText, Upload, PlusCircle, CreditCard, ChevronUp, UserCheck, Search, HelpCircle, UserPlus, ShieldCheck, Image } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid, YAxis } from 'recharts';
const logoImage = "https://i.postimg.cc/SxGS5WxY/logo.png";
const principalImg = "https://i.postimg.cc/7LmLCgvb/606350985-1458678509597899-5556893883060728495-n-jpg-stp-dst-jpegr-tt6-nc-cat-111-ccb-1-7-nc-sid-7.jpg";

interface Notice {
  id: string;
  title: string;
  priority: string;
  status: string;
  targets: string[];
  date: string;
  readBy?: string[];
  isAdmission?: boolean;
}

export default function Home() {
  const logoUrl = logoImage;

  const [content, setContent] = useState({
    tagline1: 'Empowering Minds,',
    tagline2: 'Shaping Futures.',
    description: 'Shikshantar Academy provides quality education from class Play to Ten (10) in a peaceful and nurturing environment in Karjanha Municipality, Ward No. 05, Siraha.',
    principalMessage: 'At Shikshantar Academy, we believe in nurturing not just academic excellence, but character, creativity, and critical thinking. Our peaceful environment and modern facilities provide the perfect setting for your child to grow and thrive.',
    principalImage: principalImg,
    announcement: '🌟 Welcome to the new Shikshantar Academy Portal! Term 1 Examinations starting from next week. 🌟',
    admissionsBadge: 'Admissions Open 2083 B.S.'
  });

  
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [pendingAdmissions, setPendingAdmissions] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalTeachers, setTotalTeachers] = useState<number>(0);

  const [feeCollected, setFeeCollected] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);
  const [pendingDuesCount, setPendingDuesCount] = useState(0);
  const [todayCollections, setTodayCollections] = useState<any[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [recentAdmissionsList, setRecentAdmissionsList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const previewRole = urlParams.get('previewRole');
  const userRole = previewRole || localStorage.getItem('userRole') || 'student';
  const isAdmin = userRole === 'admin';
  const navigate = useNavigate();

  useEffect(() => {
    // Determine data on load
    const loadAdminData = (user: any) => {
      if (!user) return () => {};
      if (!isAdmin) return () => {};
      
      let unsubTx = () => {};
      let unsubFees = () => {};
      let unsubUsers = () => {};

        // Fetch transactions
        try {
          unsubTx = onSnapshot(query(collection(db, 'transactions'), where('status', '==', 'SUCCESS')), (txSnap) => {
            let collected = 0;
            let tCollections: any[] = [];
            let tTotal = 0;
            const today = new Date();
            
            const monthNames = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
            const monthlySums: Record<string, number> = {};
            monthNames.forEach(m => monthlySums[m] = 0);

            txSnap.forEach(snap => {
                const tx = snap.data();
                collected += tx.amount || 0;
                const txDate = new Date(tx.date);
                if (txDate.toDateString() === today.toDateString()) {
                    tCollections.push({ id: snap.id, ...tx });
                    tTotal += tx.amount || 0;
                }
                const monthIndex = txDate.getMonth();
                const moName = monthNames[monthIndex];
                if (moName) {
                    monthlySums[moName] += tx.amount || 0;
                }
            });
            
            setFeeChartData([
              { name: 'Baisakh', expected: 300000, collected: monthlySums['Baisakh'] },
              { name: 'Jestha', expected: 300000, collected: monthlySums['Jestha'] },
              { name: 'Asar', expected: 300000, collected: monthlySums['Asar'] },
              { name: 'Shrawan', expected: 300000, collected: monthlySums['Shrawan'] },
              { name: 'Bhadra', expected: 300000, collected: monthlySums['Bhadra'] },
              { name: 'Ashwin', expected: 300000, collected: monthlySums['Ashwin'] },
              { name: 'Kartik', expected: 300000, collected: monthlySums['Kartik'] },
              { name: 'Mangsir', expected: 300000, collected: monthlySums['Mangsir'] },
              { name: 'Poush', expected: 300000, collected: monthlySums['Poush'] },
              { name: 'Magh', expected: 300000, collected: monthlySums['Magh'] },
              { name: 'Falgun', expected: 300000, collected: monthlySums['Falgun'] },
              { name: 'Chaitra', expected: 300000, collected: monthlySums['Chaitra'] },
            ]);

            setFeeCollected(collected);
            setTodayCollections(tCollections);
            setTodayTotal(tTotal);
          }, (err) => console.log('Could not load transactions realtime'));
        } catch (err: any) {}

        // Fetch student fees
        try {
          unsubFees = onSnapshot(query(collection(db, 'studentFees'), where('status', '==', 'due')), (feesSnap) => {
            let pDues = 0;
            const studentsWithDues = new Set();
            
            feesSnap.forEach(snap => {
                const fee = snap.data();
                pDues += Number(fee.dueAmount || 0);
                studentsWithDues.add(fee.studentId);
            });
            const dCount = studentsWithDues.size;

            setPendingDues(pDues);
            setPendingDuesCount(dCount);
          }, (err) => console.log('Could not load student fees realtime'));
        } catch (err: any) {}

        // Fetch users
        try {
          unsubUsers = onSnapshot(collection(db, 'users'), (usersSnap) => {
            let sCount = 0;
            let tCount = 0;
            usersSnap.forEach(snap => {
               const data = snap.data();
               if(data.role === 'student' && data.status !== 'pending') sCount++;
               if(data.role === 'teacher' && data.status !== 'pending') tCount++;
            });
            setTotalStudents(sCount);
            setTotalTeachers(tCount);
          }, (err) => console.log('Could not load users realtime'));
        } catch(err: any) {}

        return () => {
          unsubTx();
          unsubFees();
          unsubUsers();
        };
    };
    
    let cleanupAdminData = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
        cleanupAdminData();
        cleanupAdminData = loadAdminData(user);
    });
    
    // Simulate loading for 0.5 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => {
        clearTimeout(timer);
        unsubAuth();
        cleanupAdminData();
    };
  }, [isAdmin]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'home_content'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setContent(data);
        
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/home_content');
    });

    const unsubGallery = onSnapshot(doc(db, 'school_data', 'gallery'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let currentBatches = data.batches || [];
        setGalleryImages(currentBatches.slice(0, 4));
      }
    }, (err) => {
       console.warn("Home gallery fetch error:", err.message);
    });

    return () => { unsub(); unsubGallery(); };
  }, []);

  useEffect(() => {
    let unsubNotices = () => {};
    let unsubAdmissions = () => {};
    let unsubRecentAdmissions = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      const isPrivileged = user && (isAdmin || userRole === 'teacher');
      
      let q = query(collection(db, 'notices'), orderBy('date', 'desc'));
      
      unsubNotices = onSnapshot(q, (snap) => {
        const studentClass = localStorage.getItem('studentClass') || '';
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notice[];
        
        if (!isPrivileged) {
           docs = docs.filter(d => d.status === 'Published');
        }
        
        if (!isAdmin) {
           if (userRole === 'teacher') {
              docs = docs.filter(n => Array.isArray(n.targets) && (n.targets.includes('All') || n.targets.includes('Teachers Only')));
           } else {
              // For students or guests
              docs = docs.filter(n => Array.isArray(n.targets) && (n.targets.includes('All') || (user && n.targets.includes('Students Only')) || n.targets.includes(`Class ${studentClass}`)));
           }
        } else {
           docs = docs.filter(n => n.status !== 'Archived');
        }
        setNotices(docs);
      }, (err: any) => {
        if (isPrivileged && err?.message?.includes('Missing or insufficient permissions')) {
          localStorage.removeItem('userRole');
          window.location.reload();
        } else {
          handleFirestoreError(err, OperationType.LIST, 'notices');
        }
      });

      if (user && isAdmin) {
        const qAdmissions = query(collection(db, 'admissions'), where('status', '==', 'Pending'));
        unsubAdmissions = onSnapshot(qAdmissions, (snap) => {
          setPendingAdmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err: any) => {
          if (err?.message?.includes('Missing or insufficient permissions')) {
            localStorage.removeItem('userRole');
            window.location.reload();
          } else {
            handleFirestoreError(err, OperationType.LIST, 'admissions');
          }
        });
        
        const qRecentAdmissions = query(collection(db, 'admissions'), orderBy('submittedAt', 'desc'));
        unsubRecentAdmissions = onSnapshot(qRecentAdmissions, (snap) => {
           setRecentAdmissionsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err: any) => {
           if (err?.message?.includes('Missing or insufficient permissions')) {
             localStorage.removeItem('userRole');
             window.location.reload();
           } else {
             handleFirestoreError(err, OperationType.LIST, 'admissions');
           }
        });
      } else {
        setPendingAdmissions([]);
        setRecentAdmissionsList([]);
      }
    });

    return () => { unsubNotices(); unsubAdmissions(); unsubRecentAdmissions(); unsubAuth(); };
  }, [userRole, isAdmin]);

  const combinedNotices = [
    ...pendingAdmissions.map(a => ({
      id: a.id,
      title: `Admission Request: ${a.studentName || 'Student'}`,
      priority: 'Urgent',
      date: a.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      isAdmission: true,
      isPinned: false
    })),
    ...notices
  ].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime(); 
  }).slice(0, 3);

  const handleAdmissionAction = async (id: string, newStatus: string) => {
      try {
          await setDoc(doc(db, 'admissions', id), { status: newStatus }, { merge: true });
      } catch (err) {
          console.error(err);
      }
  };

  // Setup NPT Date
  const getNPTDate = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + (345 * 60000));
  };
  const currentTime = getNPTDate();
  const currentGregorianYear = currentTime.getFullYear();
  const currentGregorianMonth = currentTime.getMonth() + 1;
  const currentGregorianDate = currentTime.getDate();
  let currentBSYear = currentGregorianYear + 56;
  try {
     currentBSYear = getBSYearMonthDate(new Date()).year;
  } catch(e){}
  const dateString = formatBSDate(new Date());
  const bsString = `${currentBSYear} B.S.`;
  
  const hour = currentTime.getHours();
  let greeting = 'Evening';
  if (hour < 12) greeting = 'Morning';
  else if (hour < 17) greeting = 'Afternoon';
  
  // State for Chart Data
  const [feeChartData, setFeeChartData] = useState([
    { name: 'Baisakh', expected: 300000, collected: 0 },
    { name: 'Jestha', expected: 300000, collected: 0 },
    { name: 'Asar', expected: 300000, collected: 0 },
    { name: 'Shrawan', expected: 300000, collected: 0 },
    { name: 'Bhadra', expected: 300000, collected: 0 },
    { name: 'Ashwin', expected: 300000, collected: 0 },
    { name: 'Kartik', expected: 300000, collected: 0 },
    { name: 'Mangsir', expected: 300000, collected: 0 },
    { name: 'Poush', expected: 300000, collected: 0 },
    { name: 'Magh', expected: 300000, collected: 0 },
    { name: 'Falgun', expected: 300000, collected: 0 },
    { name: 'Chaitra', expected: 300000, collected: 0 }
  ]);
  
  const admissionsApproved = recentAdmissionsList.filter(a => a.status === 'Admitted').length;
  const admissionsRejected = recentAdmissionsList.filter(a => a.status === 'Rejected').length;
  
  const admissionsChartData = [
    { name: 'Admitted', value: admissionsApproved > 0 ? admissionsApproved : 0, color: '#10b981' },
    { name: 'Pending', value: pendingAdmissions.length > 0 ? pendingAdmissions.length : 0, color: 'var(--accent)' },
    { name: 'Rejected', value: admissionsRejected > 0 ? admissionsRejected : 0, color: '#ef4444' },
  ];

  if (isAdmin) {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-6 p-2 md:p-4">
           {/* Skeleton greeting */}
           <div className="w-64 h-8 bg-gray-200 animate-pulse rounded mb-2"></div>
           <div className="w-48 h-4 bg-gray-200 animate-pulse rounded"></div>
           
           {/* Skeleton Stat Cards */}
           <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
              {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
              ))}
           </div>
        </div>
      );
    }
  
    return (
      <div className="flex flex-col gap-6 pb-12 bg-[#F5F6FA] min-h-full">
         <div className="mb-2 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
               <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a1a2e] mb-2 tracking-tight">Good {greeting}, Admin 👋</h1>
               <p className="text-sm text-gray-500 font-medium">{dateString} | {bsString}</p>
            </div>
            
         </div>

         {/* Global Scrolling Announcement */}
               {content.announcement && (
                 <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-sm relative mb-2 items-center">
                   <div className="bg-orange-500 text-white text-xs font-bold px-4 py-2.5 uppercase tracking-wider relative z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)] whitespace-nowrap shrink-0 flex items-center gap-2 rounded-l-md md:rounded-none">
                     <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                     Notice
                   </div>
                   <div className="relative flex-1 overflow-hidden h-full flex items-center w-full">
                       <div className="animate-marquee whitespace-nowrap text-gray-800 text-sm font-bold pl-[100%] inline-block h-full flex items-center py-2.5">
                         {content.announcement}
                       </div>
                   </div>
                 </div>
               )}

               {/* Section 1: 6 Summary Stat Cards */}
         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div onClick={() => navigate('/user-approvals?filter=student')} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 border-l-[#2563eb] p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-2">Total Students</p>
                     <h3 className="text-[32px] font-bold text-[#1a1a2e] leading-none mb-1">{totalStudents}</h3>
                     <p className="text-[12px] text-gray-500 font-medium">+3 enrolled this month</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-[#2563eb]" /></div>
               </div>
            </div>

            <div onClick={() => navigate('/user-approvals?filter=teacher')} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 border-l-[#4f46e5] p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-2">Total Teachers</p>
                     <h3 className="text-[32px] font-bold text-[#1a1a2e] leading-none mb-1">{totalTeachers}</h3>
                     <p className="text-[12px] text-gray-500 font-medium">9 classes covered</p>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded-lg"><BookOpen className="w-5 h-5 text-[#4f46e5]" /></div>
               </div>
            </div>

            <div onClick={() => navigate('/account-admin')} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 border-l-[#10b981] p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-2">Fee Collected</p>
                     <h3 className="text-[28px] md:text-[32px] font-bold text-[#1a1a2e] leading-none mb-1">
                        <span className="text-xl">NRs. </span>{feeCollected.toLocaleString()}
                     </h3>
                     <p className="text-[12px] text-gray-500 font-medium flex items-center gap-1">This academic year <ChevronUp className="w-3 h-3 text-[#10b981]"/></p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg"><Calculator className="w-5 h-5 text-[#10b981]" /></div>
               </div>
            </div>

            <div onClick={() => navigate('/account-admin')} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 border-l-[#ef4444] p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all relative">
               <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
               <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500"></div>
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-2">Pending Dues</p>
                     <h3 className="text-[28px] md:text-[32px] font-bold text-[#1a1a2e] leading-none mb-1">
                        <span className="text-xl">NRs. </span>{pendingDues.toLocaleString()}
                     </h3>
                     <p className="text-[12px] text-gray-500 font-medium">From {pendingDuesCount} students</p>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="w-5 h-5 text-[#ef4444]" /></div>
               </div>
            </div>

            <div onClick={() => navigate('/admin-admissions')} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 border-l-[var(--accent)] p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-2">Pending Admissions</p>
                     <h3 className="text-[32px] font-bold text-[#1a1a2e] leading-none mb-1">{pendingAdmissions.length}</h3>
                     <p className="text-[12px] text-gray-500 font-medium">New applications waiting</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
               </div>
            </div>

            <div onClick={() => navigate('/notices')} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 border-l-[#a855f7] p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">
               <div className="flex justify-between items-start mb-2">
                  <div>
                     <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-2">Active Notices</p>
                     <h3 className="text-[32px] font-bold text-[#1a1a2e] leading-none mb-1">{notices.length}</h3>
                     <p className="text-[12px] text-gray-500 font-medium">{notices.filter(n => n.priority === 'Urgent').length} urgent</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg"><Megaphone className="w-5 h-5 text-[#a855f7]" /></div>
               </div>
            </div>
         </div>

         {/* Section 2: Pending Actions Alert */}
         <div className="mt-2">
             {(pendingAdmissions.length > 0 || pendingDuesCount > 0) ? (
                <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                   <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-xl">⚡</span> Action Required
                   </h3>
                   <div className="space-y-3">
                      {pendingAdmissions.length > 0 && (
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                             <div className="flex items-start gap-2">
                                <FileText className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-gray-800">{pendingAdmissions.length} admission applications waiting for review</span>
                             </div>
                             <button onClick={() => navigate('/admin-admissions')} className="shrink-0 bg-white border border-gray-200 text-gray-800 hover:text-primary hover:text-orange-600 px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-colors w-full md:w-auto">Review Now</button>
                         </div>
                      )}
                      {pendingDuesCount > 0 && (
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
                             <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-gray-800">Multiple students have fees overdue</span>
                             </div>
                             <button onClick={() => navigate('/account-admin')} className="shrink-0 bg-white border border-gray-200 text-gray-800 hover:text-primary hover:text-red-600 px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-colors w-full md:w-auto">View Defaulters</button>
                         </div>
                      )}
                   </div>
                </div>
             ) : (
                <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] relative overflow-hidden flex items-center gap-3">
                   <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                   <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                   <h3 className="text-[16px] font-bold text-gray-900">✅ Everything is up to date!</h3>
                </div>
             )}
         </div>

         {/* Section 3: Charts */}
         <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
             <div className="md:col-span-3 bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col h-[350px]">
                <h3 className="text-[16px] font-bold text-[#333] mb-4 border-l-4 border-blue-600 pl-2">Fee Collection — {bsString}</h3>
                <div className="flex-1 w-full min-h-0">
                   <ResponsiveContainer width="100%" height={280}>
                       <BarChart data={feeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5}}>
                          <defs>
                             <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={1}/>
                             </linearGradient>
                             <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={1}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} dy={10} />
                          <YAxis yAxisId="left" orientation="left" stroke="#6B7280" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `NRs. ${val/1000}k`} />
                          <RechartsTooltip cursor={{fill: '#f3f4f6', opacity: 0.4}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', padding: '12px'}} itemStyle={{fontWeight: 'bold'}} labelStyle={{color: '#374151', marginBottom: '8px', fontWeight: 'bold'}} />
                          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '20px', fontWeight: 600}} iconType="circle" />
                          <Bar yAxisId="left" dataKey="expected" name="Expected" fill="url(#colorExpected)" radius={[6, 6, 0, 0]} barSize={16} />
                          <Bar yAxisId="left" dataKey="collected" name="Collected" fill="url(#colorCollected)" radius={[6, 6, 0, 0]} barSize={16} />
                       </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col h-[350px]">
                <h3 className="text-[16px] font-bold text-[#333] mb-4 border-l-4 border-orange-500 pl-2">Admissions This Year</h3>
                <div className="flex-1 w-full min-h-0 relative">
                   <ResponsiveContainer width="100%" height={256}>
                       <PieChart>
                          <Pie
                             data={admissionsChartData}
                             cx="50%"
                             cy="45%"
                             innerRadius="60%"
                             outerRadius="80%"
                             paddingAngle={5}
                             dataKey="value"
                             stroke="transparent"
                          >
                             {admissionsChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                       </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-4">
                      <div className="text-2xl font-black text-gray-800 leading-none mb-1">
                         {admissionsChartData.reduce((a, b) => a + b.value, 0)}
                      </div>
                      <div className="text-[11px] font-bold uppercase text-gray-400 tracking-widest leading-none">Total</div>
                   </div>
                   <div className="flex justify-center gap-4 mt-2 mb-2">
                       {admissionsChartData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.color}}></span>
                              <span className="text-[11px] font-medium text-gray-600">{item.name} ({item.value})</span>
                          </div>
                       ))}
                   </div>
                </div>
             </div>
         </div>

         {/* Section 4: Three Column Widgets */}
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Recent Admissions */}
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-100">
                  <h3 className="text-[15px] font-bold text-[#333] border-l-4 border-orange-500 pl-2">📝 Recent Admissions</h3>
               </div>
               <div className="flex-1 p-0 flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                  {recentAdmissionsList.length > 0 ? recentAdmissionsList.slice(0, 5).map((adm, i) => (
                     <div key={adm.id} className="p-3 border-b border-gray-50 hover:text-primary flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                              {(adm.studentName || 'U').substring(0, 2)}
                           </div>
                           <div className="overflow-hidden">
                              <p className="text-sm font-bold text-gray-800 truncate">{adm.studentName || 'Unknown'}</p>
                              <p className="text-[11px] text-gray-500 truncate">Class {adm.classApplied} | {formatBSDate(adm.submittedAt?.toDate?.() || Date.now())}</p>
                           </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                           {adm.status === 'Pending' ? (
                              <div className="flex gap-1">
                                 <button onClick={() => handleAdmissionAction(adm.id, 'Admitted')} className="p-1 px-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[10px] font-bold border border-emerald-200 transition-colors">✓ Adm</button>
                                 <button onClick={() => handleAdmissionAction(adm.id, 'Rejected')} className="p-1 px-2 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold border border-red-200 transition-colors">✗ Rej</button>
                              </div>
                           ) : (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${adm.status === 'Admitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                 {adm.status}
                              </span>
                           )}
                        </div>
                     </div>
                  )) : (
                     <div className="p-6 text-center text-sm font-medium text-gray-500">No recent applications</div>
                  )}
               </div>
               <div className="p-3 border-t border-gray-100 text-primary text-center mt-auto">
                  <Link to="/admin-admissions" className="text-sm font-bold text-blue-600 hover:text-blue-800 cursor-pointer w-full inline-block">View All Admissions →</Link>
               </div>
            </div>

            {/* Today's Collections */}
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-100">
                  <h3 className="text-[15px] font-bold text-[#333] border-l-4 border-emerald-500 pl-2">💰 Today's Collections</h3>
               </div>
               <div className="flex-1 p-0 flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                  {todayCollections.length > 0 ? todayCollections.map((tx, i) => (
                     <div key={tx.id || i} className="p-3 border-b border-gray-50 hover:text-primary flex items-center justify-between gap-2">
                        <div className="overflow-hidden">
                           <p className="text-sm font-bold text-gray-800 truncate">{tx.studentName}</p>
                           <p className="text-[11px] text-gray-500 flex flex-wrap gap-1 items-center">
                               <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[9px] font-bold uppercase border border-gray-200">{tx.method}</span>
                               <span>{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           </p>
                        </div>
                        <div className="shrink-0 text-right">
                           <p className="text-sm font-black text-emerald-600">NRs. {tx.amount.toLocaleString()}</p>
                        </div>
                     </div>
                  )) : (
                     <div className="p-6 text-center text-sm font-medium text-gray-500 flex flex-col items-center gap-3">
                        No fee payments recorded today
                        <button onClick={() => navigate('/account-admin')} className="bg-emerald-500 text-white px-4 py-1.5 rounded shadow text-xs font-bold hover:bg-emerald-600 transition-colors">+ Record Payment</button>
                     </div>
                  )}
               </div>
               <div className="p-3 border-t border-gray-100 text-primary flex justify-between items-center mt-auto">
                  <span className="text-sm font-bold text-gray-700">Today Total:</span>
                  <span className="text-base font-black text-emerald-600">NRs. {todayTotal.toLocaleString()}</span>
               </div>
               <div className="p-2 border-t border-gray-100 bg-gray-100 text-center">
                  <Link to="/account-admin" className="text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer w-full inline-block">View All Transactions →</Link>
               </div>
            </div>

            {/* Notice Board */}
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col overflow-hidden xl:col-span-1 md:col-span-2">
               <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-purple-50/30">
                  <h3 className="text-[15px] font-bold text-[#333] border-l-4 border-purple-500 pl-2">📢 Latest Notices</h3>
                  <button onClick={() => navigate('/notices')} className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-1"><PlusCircle className="w-3 h-3"/> Post</button>
               </div>
               <div className="flex-1 p-0 flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notices.slice(0,3).map(n => (
                     <div key={n.id} onClick={() => navigate('/notices')} className="p-3 border-b border-gray-50 hover:bg-purple-50/50 cursor-pointer flex flex-col gap-1.5 transition-colors">
                        <div className="flex justify-between items-center gap-2">
                           <h4 className={`text-sm font-bold leading-tight line-clamp-1 ${n.priority === 'Urgent' ? 'text-red-700' : 'text-gray-800'}`}>{n.title}</h4>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                           <div className="flex gap-1 items-center flex-wrap">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${n.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                 {n.priority}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 truncate max-w-[100px]">
                                 {(n.targets || []).join(', ') || 'All'}
                              </span>
                           </div>
                           <span className="text-[10px] font-medium text-gray-400 shrink-0">{formatBSDate(n.date)}</span>
                        </div>
                     </div>
                  ))}
                  {notices.length === 0 && (
                     <div className="p-6 text-center text-sm font-medium text-gray-500">No active notices</div>
                  )}
               </div>
               <div className="p-3 border-t border-gray-100 text-primary text-center mt-auto">
                  <Link to="/notices" className="text-sm font-bold text-blue-600 hover:text-blue-800 cursor-pointer w-full inline-block">View All Notices →</Link>
               </div>
            </div>
         </div>

         {/* Section 5: Quick Action Buttons */}
         {isAdmin && (
           <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <button onClick={() => navigate('/user-approvals')} className="bg-white border text-left border-gray-200 hover:border-blue-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group xl:min-h-[96px] min-h-[80px]">
                 <UserPlus className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold text-gray-700 text-center">Add Student</span>
              </button>
              <button onClick={() => navigate('/account-admin')} className="bg-white border text-left border-gray-200 hover:border-emerald-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group xl:min-h-[96px] min-h-[80px]">
                 <CreditCard className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold text-gray-700 text-center">Record Fee</span>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white border text-left border-gray-200 hover:border-indigo-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group xl:min-h-[96px] min-h-[80px]">
                 <Upload className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold text-gray-700 text-center">Upload Results</span>
              </button>
              <button onClick={() => navigate('/notices')} className="bg-white border text-left border-gray-200 hover:border-purple-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group xl:min-h-[96px] min-h-[80px]">
                 <Megaphone className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold text-gray-700 text-center">Post Notice</span>
              </button>
              <button onClick={() => navigate('/user-approvals')} className="bg-white border text-left border-gray-200 hover:border-cyan-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group xl:min-h-[96px] min-h-[80px]">
                 <ShieldCheck className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold text-gray-700 text-center">Approve Users</span>
              </button>
              <button onClick={() => navigate('/account-admin')} className="bg-white border text-left border-gray-200 hover:border-orange-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group xl:min-h-[96px] min-h-[80px]">
                 <Download className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold text-gray-700 text-center">Download Reports</span>
              </button>
           </div>
         )}
         

      </div>
    );
  }

  // --- Public View below ---
  return (
    <div className="flex flex-col bg-[#F5F6FA] w-full min-h-full">
      <Helmet>
        <title>{content.tagline2 || 'Shikshantar Academy'} | Outstanding Education in Siraha</title>
        <meta name="description" content={content.description ? content.description.slice(0, 160) : 'Shikshantar Academy provides quality education, expert faculty, and modern facilities from Play Group to Class 10 in Siraha, Nepal.'} />
        <meta name="keywords" content="Shikshantar Academy, School in Siraha, Best school in Bastipur, Quality Education Nepal, SEE Preparation, English Medium School Siraha" />
        <link rel="canonical" href="https://shikshantaracademy.edu.np" />
        <link rel="preload" href={logoImage} as="image" />
        <meta property="og:title" content={`${content.tagline2 || 'Shikshantar Academy'} | Inspiring Minds`} />
        <meta property="og:description" content={content.description ? content.description.slice(0, 160) : 'Nurturing minds and building character in the heart of Siraha. Modern facilities, expert faculty, and a commitment to excellence.'} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "Shikshantar Academy",
            "description": content.description || "Nurturing minds and building character in the heart of Siraha.",
            "image": logoImage,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Siraha",
              "addressRegion": "Madhesh Pradesh",
              "addressCountry": "NP"
            },
            "telephone": content.contactPhone || "9800000000"
          })}
        </script>
      </Helmet>
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FIX 1 — NOTICE TICKER BAR
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {content.announcement && (
        <div className="w-full h-[40px] bg-[var(--accent)] flex items-center overflow-hidden">
          <div className="bg-[#b33d00] text-white text-sm font-bold px-4 h-full flex items-center z-10 whitespace-nowrap shrink-0 shadow-md">
             📢 NOTICE:
          </div>
          <div className="flex-1 overflow-hidden h-full flex items-center">
             <div className="animate-marquee whitespace-nowrap text-white text-sm font-medium pl-[100%] inline-block h-full py-2.5">
               {content.announcement}
             </div>
          </div>
        </div>
      )}

      {/* Hero Section Container */}
      <div className="px-4 md:px-8 w-full max-w-7xl mx-auto flex flex-col gap-12 mt-8 mb-12">
        
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FIX 2 — HERO SECTION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="bg-gradient-to-br from-[var(--primary)] to-blue-900 rounded-xl p-8 md:p-12 shadow-lg relative overflow-hidden text-white flex flex-col">
          <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay flex items-center justify-center pointer-events-none">
            <img src={logoUrl} alt="School Logo" className="w-[150%] h-[150%] md:w-full md:h-full object-cover md:object-contain p-10 max-w-2xl opacity-50" referrerPolicy="no-referrer" fetchPriority="high" />
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 border border-white/10 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
          
          <div className="relative z-10 w-full max-w-3xl flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold mb-6 border border-white/20 uppercase backdrop-blur-sm shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {content.admissionsBadge}
            </div>
            
            <h1 className="text-[24px] md:text-[36px] font-extrabold leading-tight mb-4 tracking-tight text-white">
              {content.tagline1} <span className="text-[var(--accent)]">{content.tagline2}</span>
            </h1>
            
            <p className="text-[15px] text-white/90 mb-8 max-w-2xl leading-[1.6]">
              {content.description}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-10 w-full sm:w-auto">
              <Link to="/facilities" className="w-full sm:w-auto bg-[var(--accent)] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#cc4400] transition-colors shadow-md text-center">
                🏫 Explore Facilities →
              </Link>
              <a href="https://maps.app.goo.gl/n3Y7iLB1fry5cqtX9" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-white hover:text-[var(--primary)] transition-colors text-center">
                📍 Find Us
              </a>
              <Link to="/admission" className="w-full sm:w-auto bg-white text-[var(--primary)] px-6 py-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors shadow-md text-center">
                📝 Apply for Admission →
              </Link>
            </div>
            
            {/* Stats Row (Desktop) */}
            <div className="hidden md:flex flex-wrap items-center gap-4 text-white/90 text-sm font-medium">
               <span>🎓 Play Group — Class 10</span>
               <span className="w-px h-4 bg-white/30 hidden md:block"></span>
               <span>👥 {content.statsStudents || '200+'} Students</span>
               <span className="w-px h-4 bg-white/30 hidden md:block"></span>
               <span>👨‍🏫 {content.statsTeachers || '12+'} Teachers</span>
               <span className="w-px h-4 bg-white/30 hidden md:block"></span>
               <span>🏆 Est. 2072 B.S.</span>
            </div>
          </div>
        </section>

        {/* Stats Grid (Mobile) */}
        <div className="grid grid-cols-2 gap-4 md:hidden">
           <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] text-center flex flex-col items-center gap-2">
              <span className="text-2xl">🎓</span>
              <span className="text-xs font-bold text-gray-800">PG — Class 10</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] text-center flex flex-col items-center gap-2">
              <span className="text-2xl">👥</span>
              <span className="text-xs font-bold text-gray-800">{content.statsStudents || '200+'} Students</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] text-center flex flex-col items-center gap-2">
              <span className="text-2xl">👨‍🏫</span>
              <span className="text-xs font-bold text-gray-800">{content.statsTeachers || '12+'} Teachers</span>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] text-center flex flex-col items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="text-xs font-bold text-gray-800">Est. 2072 B.S.</span>
           </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FIX 3 — FEATURE/FACULTY/ACHIEVEMENT CARDS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] border-t-4 border-t-[var(--accent)] flex flex-col hover:-translate-y-[3px] hover:shadow-lg transition-all" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-4xl mb-4">📚</span>
            <h3 className="text-lg font-bold text-gray-900 mb-3">{content.feature1Title || 'Quality Education'}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">{content.feature1Desc || 'Comprehensive curriculum from Play Group to Class 10 following CDC Nepal standards. English medium instruction with focus on Science and Mathematics.'}</p>
            <div className="text-xs font-bold text-gray-800 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">📖 {content.feature1Badge || '6 Core Subjects | Nepali & English Medium'}</div>
          </motion.div>

          <motion.div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] border-t-4 border-t-green-500 flex flex-col hover:-translate-y-[3px] hover:shadow-lg transition-all" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <span className="text-4xl mb-4">👨‍🏫</span>
            <h3 className="text-lg font-bold text-gray-900 mb-3">{content.feature2Title || 'Expert Faculty'}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">{content.feature2Desc || `Led by Principal Mr. Pappu Jha and a team of ${content.statsTeachers || '12+'} dedicated, qualified educators with years of teaching experience.`}</p>
            <div className="text-xs font-bold text-gray-800 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">👥 {content.feature2Badge || `${content.statsTeachers || '12+'} Teachers | Avg. 8 Years Experience`}</div>
          </motion.div>

          <motion.div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] border-t-4 border-t-yellow-500 flex flex-col hover:-translate-y-[3px] hover:shadow-lg transition-all" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <span className="text-4xl mb-4">🏆</span>
            <h3 className="text-lg font-bold text-gray-900 mb-3">{content.feature3Title || 'Excellent Results'}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">{content.feature3Desc || `Consistent SEE results with above ${content.statsPassRate || '90%+'} pass rate. Producing district toppers every year since 2075 B.S.`}</p>
            <div className="text-xs font-bold text-gray-800 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">🏅 {content.feature3Badge || `${content.statsPassRate || '90%+'} Pass Rate | District Toppers Every Year`}</div>
          </motion.div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ADD NEW SECTION 1 — SCHOOL HIGHLIGHTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full bg-white border-y border-gray-200 py-12 px-4 md:px-8">
         <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-10">
               <h2 className="text-[22px] font-bold text-gray-900">{content.whyChooseTitle || 'Why Choose Shikshantar Academy?'}</h2>
               <div className="w-10 h-1 bg-[var(--accent)] mt-2 mb-3 rounded-full"></div>
               <p className="text-gray-600">{content.whyChooseSub || `Trusted by ${content.statsStudents || '200+'} Families in Siraha`}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="bg-gray-50 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 border-l-[var(--primary)] flex items-start gap-4">
                  <span className="text-[32px]">🏫</span>
                  <div>
                    <h4 className="font-bold text-[15px] text-gray-900 mb-1">{content.wc1Title || 'Modern Infrastructure'}</h4>
                    <p className="text-[13px] text-gray-600">{content.wc1Desc || 'Well-equipped classrooms, computer lab, science lab and library'}</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 border-l-[var(--primary)] flex items-start gap-4">
                  <span className="text-[32px]">🔬</span>
                  <div>
                    <h4 className="font-bold text-[15px] text-gray-900 mb-1">{content.wc2Title || 'Science & Computer Lab'}</h4>
                    <p className="text-[13px] text-gray-600">{content.wc2Desc || 'Hands-on learning with modern equipment for Class 8 and above'}</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 border-l-[var(--primary)] flex items-start gap-4">
                  <span className="text-[32px]">🌐</span>
                  <div>
                    <h4 className="font-bold text-[15px] text-gray-900 mb-1">{content.wc3Title || 'English Medium'}</h4>
                    <p className="text-[13px] text-gray-600">{content.wc3Desc || 'English as primary medium of instruction for all major subjects'}</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 border-l-[var(--primary)] flex items-start gap-4">
                  <span className="text-[32px]">📊</span>
                  <div>
                    <h4 className="font-bold text-[15px] text-gray-900 mb-1">{content.wc4Title || 'Regular Assessments'}</h4>
                    <p className="text-[13px] text-gray-600">{content.wc4Desc || '5 examinations per year with transparent result publishing on portal'}</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 border-l-[var(--primary)] flex items-start gap-4">
                  <span className="text-[32px]">💰</span>
                  <div>
                    <h4 className="font-bold text-[15px] text-gray-900 mb-1">{content.wc5Title || 'Affordable Fees'}</h4>
                    <p className="text-[13px] text-gray-600">{content.wc5Desc || 'Quality education at affordable rates starting NRs. 600/month'}</p>
                  </div>
               </div>
               <div className="bg-gray-50 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 border-l-[var(--primary)] flex items-start gap-4">
                  <span className="text-[32px]">📍</span>
                  <div>
                    <h4 className="font-bold text-[15px] text-gray-900 mb-1">{content.wc6Title || 'Central Location'}</h4>
                    <p className="text-[13px] text-gray-600">{content.wc6Desc || 'Conveniently located at Bastipur-5, Siraha — easily accessible'}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ADD NEW SECTION 3 — ADMISSION CTA
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full bg-[var(--primary)] py-[50px] px-4 md:px-10 text-white shadow-inner">
         <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 items-center">
            <div className="flex-1">
               <h2 className="text-[28px] font-bold text-white mb-4">{content.admissionsTitle || '🎓 Admissions Open for 2084 B.S.'}</h2>
               <p className="text-[15px] text-white/90 leading-[1.7] mb-6 max-w-xl">
                 {content.admissionsDesc || 'Shikshantar Academy is now accepting admission applications for academic year 2084-2085 B.S. for Play Group to Class 10.'}
               </p>
               <ul className="space-y-3 mb-8">
                 {(content.admissionsBullets || 'Play Group to Class 10\nOnline & offline admission available\nAffordable fee structure\nEnglish medium curriculum\nResults portal access for all students').split('\n').filter(Boolean).map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-3"><span className="text-green-400 text-lg">✅</span> {bullet}</li>
                 ))}
               </ul>
            </div>
            
            <div className="w-full lg:w-80 bg-white rounded-xl shadow-2xl p-6 text-gray-900 shrink-0">
               <h3 className="text-lg font-bold text-center mb-4 text-[var(--primary)] flex items-center justify-center gap-2">📋 {content.admInfoTitle || 'Quick Admission Info'}</h3>
               <div className="h-px bg-gray-200 w-full mb-4"></div>
               <div className="space-y-4 mb-6 text-sm font-medium">
                  <div className="flex items-start gap-3"><span className="text-lg leading-none">📅</span> <div className="mt-0.5">Session: {content.admInfoSession || '2084-2085 B.S.'}</div></div>
                  <div className="flex items-start gap-3"><span className="text-lg leading-none">🏫</span> <div className="mt-0.5">Classes: {content.admInfoClasses || 'PG to Class 10'}</div></div>
                  <div className="flex items-start gap-3"><span className="text-lg leading-none">💰</span> <div className="mt-0.5">Fee from: {content.admInfoFee || 'NRs. 600/month'}</div></div>
                  <div className="flex items-start gap-3"><span className="text-lg leading-none">📍</span> <div className="mt-0.5">{content.admInfoLocation || 'Bastipur-5, Siraha'}</div></div>
                  <div className="flex items-start gap-3"><span className="text-lg leading-none">📞</span> <div className="mt-0.5">{content.contactPhone || '9800000000'}</div></div>
               </div>
               <div className="h-px bg-gray-200 w-full mb-4"></div>
               <div className="flex flex-col gap-3">
                  <Link to="/admission" className="w-full bg-[var(--accent)] text-white py-3 rounded-lg text-center font-bold hover:bg-[#cc4400] transition-colors shadow-sm">📝 Apply for Admission</Link>
                  <a href={`tel:${content.contactPhone || '9800000000'}`} className="w-full bg-white text-gray-700 border-2 border-gray-200 py-3 rounded-lg text-center font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors">📞 Call Us Now</a>
               </div>
            </div>
         </div>
      </div>

      <div className="px-4 md:px-8 w-full max-w-7xl mx-auto flex flex-col gap-12 py-12">
        
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FIX 4 — LATEST NOTICES
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section>
           <div className="flex flex-col items-center text-center mb-10">
               <h2 className="text-[22px] font-bold text-gray-900">📢 Latest Notices</h2>
               <div className="w-10 h-1 bg-[var(--accent)] mt-2 mb-3 rounded-full"></div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white border-l-4 border-l-[var(--primary)] rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-transform flex flex-col">
                  <div className="text-xs text-gray-500 mb-2">📅 18 Baisakh 2083</div>
                  <h3 className="font-bold text-gray-900 mb-2">Results Published for Unit Test 1</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">Students can now check their results for the first unit test on the portal.</p>
               </div>
               
               <div className="bg-white border-l-4 border-l-red-500 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-transform flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                     <div className="text-xs text-gray-500">📅 15 Baisakh 2083</div>
                     <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Urgent</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">⚡ URGENT: School Holiday on 20 Baisakh</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">The school will remain closed due to unforeseen circumstances.</p>
               </div>
               
               <div className="bg-white border-l-4 border-l-[var(--primary)] rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-transform flex flex-col">
                  <div className="text-xs text-gray-500 mb-2">📅 10 Baisakh 2083</div>
                  <h3 className="font-bold text-gray-900 mb-2">Admissions Open for 2084 B.S.</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">Forms are now available in the school administration office.</p>
               </div>
           </div>
           
           <div className="mt-8 text-center">
              <Link to="/notices" className="inline-block bg-white text-gray-800 border-2 border-gray-200 shadow-sm px-6 py-2 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors">View All Notices →</Link>
           </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FIX 5 — RECENT PHOTOS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {galleryImages.length > 0 && (
           <section>
              <div className="flex flex-col items-center text-center mb-10">
                 <h2 className="text-[22px] font-bold text-gray-900">📸 Recent Photos from Gallery</h2>
                 <div className="w-10 h-1 bg-[var(--accent)] mt-2 mb-3 rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {galleryImages.slice(0, 4).map((img, idx) => (
                    <div key={idx} className="h-[160px] rounded-xl overflow-hidden cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.07)] border border-gray-200 relative" onClick={() => setExpandedImage(img.image)}>
                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 pointer-events-none"></div>
                       <img src={img.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={img.caption || `Gallery ${idx}`} referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                    </div>
                 ))}
              </div>
              
              <div className="mt-8 text-center">
                 <Link to="/gallery" className="inline-block bg-white text-gray-800 border-2 border-gray-200 shadow-sm px-6 py-2 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors">View Full Gallery →</Link>
              </div>
           </section>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ADD NEW SECTION 4 — TESTIMONIALS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section>
           <div className="flex flex-col items-center text-center mb-10">
               <h2 className="text-[22px] font-bold text-gray-900">{content.testiTitle || '💬 What Parents Say'}</h2>
               <div className="w-10 h-1 bg-[var(--accent)] mt-2 mb-3 rounded-full"></div>
               <p className="text-gray-600">{content.testiSub || 'Trusted by families across Siraha'}</p>
           </div>
           
           <div className="flex flex-col md:flex-row gap-6">
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] border border-gray-100 p-6 flex-1 relative">
                 <span className="absolute top-4 right-4 text-6xl text-[var(--primary)] opacity-[0.07] font-serif leading-none">"</span>
                 <div className="flex gap-1 mb-3 text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                 <p className="text-gray-600 italic text-sm mb-6 leading-relaxed relative z-10">"{content.testi1Text || "My son's results have improved significantly since joining Shikshantar. The teachers are dedicated and the portal helps us track everything easily."}"</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{content.testi1Initials || 'RP'}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{content.testi1Author || 'Ram Prasad Sharma'}</div>
                      <div className="text-xs text-gray-500">{content.testi1Role || 'Parent of Class 10 Student'}</div>
                    </div>
                 </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] border border-gray-100 p-6 flex-1 relative">
                 <span className="absolute top-4 right-4 text-6xl text-[var(--primary)] opacity-[0.07] font-serif leading-none">"</span>
                 <div className="flex gap-1 mb-3 text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                 <p className="text-gray-600 italic text-sm mb-6 leading-relaxed relative z-10">"{content.testi2Text || "Best school in Siraha for affordable quality education. My daughter got A+ in Science and Mathematics in SEE."}"</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{content.testi2Initials || 'SD'}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{content.testi2Author || 'Sunita Devi Thapa'}</div>
                      <div className="text-xs text-gray-500">{content.testi2Role || 'Parent of SEE Graduate 2081'}</div>
                    </div>
                 </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] border border-gray-100 p-6 flex-1 relative">
                 <span className="absolute top-4 right-4 text-6xl text-[var(--primary)] opacity-[0.07] font-serif leading-none">"</span>
                 <div className="flex gap-1 mb-3 text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                 <p className="text-gray-600 italic text-sm mb-6 leading-relaxed relative z-10">"{content.testi3Text || "The online portal is very helpful. We can check fee receipts and results anytime from our phone. Very convenient for parents."}"</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">{content.testi3Initials || 'ML'}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{content.testi3Author || 'Mohan Lal Yadav'}</div>
                      <div className="text-xs text-gray-500">{content.testi3Role || 'Parent of Class 9 Student'}</div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Message from Principal (Keep from original) */}
        <section className="bg-white rounded-xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.07)] border border-gray-100 relative overflow-hidden mt-8">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--primary)] to-blue-500"></div>
          <div className="text-[0.75rem] font-bold text-gray-500 uppercase tracking-widest mb-6">Message from the Principal</div>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div 
              className="w-48 md:w-56 aspect-[3/4] shrink-0 rounded-xl overflow-hidden shadow-lg border-4 border-white bg-gray-100 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => setExpandedImage(principalImg)}
            >
              <img
                src={principalImg}
                alt="Principal Mr. Pappu Jha"
                className="w-full h-full object-cover object-[center_80%]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 w-full flex flex-col justify-center py-4">
              <blockquote className="text-base md:text-lg text-gray-700 italic mb-6 leading-relaxed relative whitespace-pre-wrap">
                <span className="text-5xl text-gray-200 absolute -top-4 -left-6 font-serif">"</span>
                {content.principalMessage}
                <span className="text-5xl text-gray-200 absolute -bottom-8 font-serif leading-[0]">"</span>
              </blockquote>
              <div className="mt-4">
                <p className="font-extrabold text-gray-900 text-lg">{content.principalName || 'Mr. Pappu Jha'}</p>
                <p className="text-sm text-[var(--primary)] font-bold">{content.principalTitle || 'Principal, Shikshantar Academy'}</p>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ADD NEW SECTION 5 — CONTACT STRIP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAdmin && (
        <div className="w-full bg-[#F8FAFC] py-[40px] px-4 md:px-8 border-t border-gray-200 mt-auto">
           <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
                 <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-[24px] text-[var(--primary)] mb-1">📍</div>
                 <h4 className="font-bold text-gray-900 text-[16px]">Find Us</h4>
                 <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{content.findUsAddress || 'Bastipur-5, Karjanha Municipality\nWard No. 05, Siraha,\nMadhesh Pradesh, Nepal'}</p>
              </div>
              
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
                 <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-[24px] text-[var(--primary)] mb-1">📞</div>
                 <h4 className="font-bold text-gray-900 text-[16px]">Call Us</h4>
                 <a href={`tel:${content.contactPhone || '9800000000'}`} className="text-sm text-gray-600 leading-relaxed font-medium hover:text-[var(--primary)] transition-colors">{content.contactPhone || '9800000000'}</a>
                 <p className="text-xs text-gray-500">Sunday–Friday, 9:30 AM–4:00 PM</p>
              </div>
           </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/20 rounded-full p-2 transition-all"
            onClick={(e) => { e.stopPropagation(); setExpandedImage(null); }}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-[90vh] object-contain rounded drop-shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}

