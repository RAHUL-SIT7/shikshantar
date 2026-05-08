import React, { useRef, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, Search, Download, Edit2, Trash2, Calendar } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import NepaliDate from 'nepali-date-converter';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';

const DEFAULT_MONTHS_2083 = [
  { name: 'Baisakh', days: 31, startDay: 2, events: [{ date: 1, name: 'New Year' }, { date: 11, name: 'Loktantra Diwas' }] }, 
  { name: 'Jestha', days: 32, startDay: 5, events: [{ date: 15, name: 'Republic Day' }, { date: 20, name: 'Buddha Purnima' }] },
  { name: 'Asar', days: 31, startDay: 1, events: [{ date: 15, name: 'National Paddy Day' }] },
  { name: 'Shrawan', days: 32, startDay: 4, events: [{ date: 12, name: 'Nag Panchami' }] },
  { name: 'Bhadra', days: 31, startDay: 0, events: [{ date: 14, name: 'Teej' }, { date: 16, name: 'Rishi Panchami' }, { date: 20, name: 'Constitution Day' }] },
  { name: 'Ashwin', days: 31, startDay: 3, events: [{ date: 7, name: 'Ghatasthapana' }, { date: 14, name: 'Fulpati' }, { date: 15, name: 'Maha Ashtami' }, { date: 16, name: 'Maha Navami' }, { date: 17, name: 'Vijaya Dashami' }] },
  { name: 'Kartik', days: 30, startDay: 6, events: [{ date: 4, name: 'Laxmi Puja' }, { date: 5, name: 'Mha Puja' }, { date: 6, name: 'Bhai Tika' }, { date: 11, name: 'Chhath Puja' }] },
  { name: 'Mangsir', days: 29, startDay: 1, events: [] },
  { name: 'Poush', days: 30, startDay: 2, events: [{ date: 15, name: 'Tamu Lhosar' }] },
  { name: 'Magh', days: 29, startDay: 4, events: [{ date: 1, name: 'Maghi Parba' }, { date: 5, name: 'Sonam Lhosar' }] },
  { name: 'Falgun', days: 30, startDay: 5, events: [{ date: 7, name: 'Democracy Day' }, { date: 14, name: 'Maha Shivaratri' }, { date: 24, name: 'Holi / Fagu Purnima' }, { date: 28, name: 'Gyalpo Lhosar' }] },
  { name: 'Chaitra', days: 30, startDay: 0, events: [{ date: 15, name: 'Ram Navami' }] },
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PageCover = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => {
  return (
    <div className="page page-cover bg-primary text-white border-l-[6px] border-[#1e3a8a] shadow-inner flex flex-col justify-center items-center h-full w-full relative" ref={ref} data-density="hard">
      <div className="page-content h-full w-full flex flex-col justify-center items-center p-8 bg-gradient-to-br from-blue-800 to-blue-950 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        {children}
      </div>
    </div>
  );
});

const CalendarPage = React.forwardRef<HTMLDivElement, { month: any, monthIndex: number, isAdmin?: boolean, onDateClick?: (monthIndex: number, monthName: string, date: number, currentEvents: string) => void }>(({ month, monthIndex, isAdmin, onDateClick }, ref) => {
  return (
    <div className="page bg-white shadow-[inset_0_0_5px_rgba(0,0,0,0.1)] h-full w-full relative border border-gray-300" ref={ref}>
      <div className="p-5 h-full flex flex-col">
        <div className="text-center mb-2 border-b-2 border-primary pb-2 flex-none relative">
          <div className="absolute left-0 top-1 text-gray-300 font-bold opacity-30 text-5xl pointer-events-none tracking-tighter -mt-2 -ml-2">{monthIndex + 1}</div>
          <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" className="absolute right-0 top-0 w-8 h-8 object-contain opacity-50 grayscale" />
          <h2 className="text-2xl lg:text-3xl font-black text-primary uppercase tracking-widest relative z-10">{month.name}</h2>
          <p className="text-gray-500 font-bold tracking-[0.3em] text-[10px] mt-1">Shikshantar Academy | 2083 B.S.</p>
        </div>
        
        <div className="flex-1 flex flex-col mb-1 relative overflow-hidden">
          <div className="grid grid-cols-7 gap-1 mb-1 flex-none">
            {WEEK_DAYS.map((day, i) => (
              <div key={day} className={`text-center font-bold text-[9px] uppercase pb-1 border-b border-gray-200 ${(i === 0 || i === 6) ? 'text-red-500' : 'text-gray-600'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center flex-1">
            {Array.from({ length: month.startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-transparent rounded flex flex-col bg-gray-50/20"></div>
            ))}
            {Array.from({ length: month.days }).map((_, i) => {
              const date = i + 1;
              const globalDayIndex = (month.startDay + i) % 7;
              const isWeekend = (globalDayIndex === 0 || globalDayIndex === 6); // Sunday & Saturday
              const dayEvents = month.events ? month.events.filter((e: any) => e.date === date) : [];
              const isEvent = dayEvents.length > 0;
              
              return (
                <div 
                   key={date} 
                   onClick={() => isAdmin && onDateClick && onDateClick(monthIndex, month.name, date, dayEvents.map((e: any) => e.name).join(', '))}
                   className={`p-0.5 min-h-[30px] border shadow-sm border-gray-100/80 rounded flex flex-col items-center justify-start font-bold relative transition-colors ${isWeekend ? 'text-red-600 bg-red-50/40 border-red-100' : 'text-gray-800 bg-white hover:bg-blue-50'} ${isEvent && !isWeekend ? 'bg-blue-50/40' : ''} ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 z-10' : ''}`}
                >
                  <span className="text-[11px] md:text-[13px]">{date}</span>
                  {isEvent && (
                     <div className="flex flex-col gap-0.5 mt-px w-full items-center px-px">
                       {dayEvents.map((e: any, idx: number) => (
                         <div key={idx} className={`w-full text-[5px] md:text-[6px] leading-[1.1] text-center rounded px-[1px] py-px truncate ${isWeekend ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`} title={e.name}>{e.name}</div>
                       ))}
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Events Section */}
        {month.events && month.events.length > 0 && (
          <div className="flex-none bg-blue-50/70 p-2 rounded-lg border border-blue-100 text-[10px] mb-2 overflow-y-auto max-h-20 default-scrollbar">
             <div className="font-bold text-primary mb-1 uppercase tracking-wider text-[8px] sticky top-0 bg-blue-50/90 z-10 flex justify-between">
                <span>Key Events / Holidays</span>
             </div>
             <ul className="text-gray-700 list-none pl-1 space-y-0.5">
                {month.events.map((e: any, i: number) => (
                   <li key={i} className="flex gap-2 items-start"><span className="font-bold w-3 shrink-0 text-blue-600">{e.date}</span><span className="leading-tight">{e.name}</span></li>
                ))}
             </ul>
          </div>
        )}
        
        <div className="flex-none mt-auto pt-2 border-t border-gray-200 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <span>{month.name}</span>
          <span>Page {monthIndex + 1} / 12</span>
        </div>
      </div>
    </div>
  );
});

export default function AcademicCalendar() {
  const [flipSound] = useState(new Audio('https://actions.google.com/sounds/v1/foley/book_page_turn.ogg'));
  const bookRef = useRef<any>(null);
  const [selectedMonth, setSelectedMonth] = useState('-1');
  const [monthsData, setMonthsData] = useState<any[]>(DEFAULT_MONTHS_2083);
  const [customEventsData, setCustomEventsData] = useState<any>({});
  const [isReady, setIsReady] = useState(false);
  
  const role = auth.currentUser ? (localStorage.getItem('userRole') || 'student') : 'guest';
  const isAdmin = role === 'admin';
  const [editModal, setEditModal] = useState<{ monthIdx: number, monthName: string, date: number, current: string } | null>(null);
  const [editInput, setEditInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [adminMonth, setAdminMonth] = useState('0');
  const [adminDate, setAdminDate] = useState('');
  const [adminEventName, setAdminEventName] = useState('');

  const handleAdminSave = async () => {
      setIsSaving(true);
      const newCalData = { ...customEventsData };
      const monthKey = `month_${adminMonth}`;
      if (!newCalData[monthKey]) newCalData[monthKey] = [];
      const parsedDate = parseInt(adminDate);
      const existingIdx = newCalData[monthKey].findIndex((e: any) => e.date === parsedDate);
      if (existingIdx >= 0) {
         newCalData[monthKey][existingIdx].name = adminEventName;
      } else {
         newCalData[monthKey].push({ date: parsedDate, name: adminEventName });
      }
      try {
         await setDoc(doc(db, 'settings', 'calendar_2083'), newCalData);
         setAdminDate('');
         setAdminEventName('');
      } catch(e) {
         alert('Failed saving calendar update');
      }
      setIsSaving(false);
  };

  const handleDeleteCustomEvent = async (monthIdx: string, date: number) => {
      const newCalData = { ...customEventsData };
      const monthKey = `month_${monthIdx}`;
      if (newCalData[monthKey]) {
          newCalData[monthKey] = newCalData[monthKey].filter((e: any) => e.date !== date);
          setIsSaving(true);
          try {
             await setDoc(doc(db, 'settings', 'calendar_2083'), newCalData);
          } catch(e) {}
          setIsSaving(false);
      }
  };

  useEffect(() => {
     let defaultMonthIdx = -1;
     try {
        const currentDate = new NepaliDate();
        defaultMonthIdx = currentDate.getMonth();
        setSelectedMonth(defaultMonthIdx.toString());
     } catch (e) {}

     const unsub = onSnapshot(doc(db, 'settings', 'calendar_2083'), (snap) => {
        if (snap.exists()) {
           const customEvents = snap.data();
           setCustomEventsData(customEvents);
           const newMonths = DEFAULT_MONTHS_2083.map((m, idx) => {
              const monthCustomEvents = customEvents[`month_${idx}`] || [];
              const combinedEvents = [...m.events];
              
              monthCustomEvents.forEach((ce: any) => {
                  const existingIdx = combinedEvents.findIndex(e => e.date === ce.date);
                  if (existingIdx >= 0) combinedEvents[existingIdx] = ce;
                  else combinedEvents.push(ce);
              });
              
              return { ...m, events: combinedEvents.sort((a,b)=>a.date-b.date).filter(e => e.name !== "") };
           });
           setMonthsData(newMonths);
        } else {
           setCustomEventsData({});
        }
        setIsReady(true);
     }, () => {
         setIsReady(true);
     });

     return () => unsub();
  }, []);

  const handleDateClick = (monthIdx: number, monthName: string, date: number, current: string) => {
      if (!isAdmin) return;
      setEditModal({ monthIdx, monthName, date, current });
      setEditInput(current);
  };

  const saveEvent = async () => {
      if (!editModal) return;
      setIsSaving(true);
      
      const newCalData = { ...customEventsData };
      const monthKey = `month_${editModal.monthIdx}`;
      if (!newCalData[monthKey]) newCalData[monthKey] = [];
      
      const existingIdx = newCalData[monthKey].findIndex((e: any) => e.date === editModal.date);
      
      if (editInput.trim() === "") {
          // Add empty string to override default events (makes it disappear), or just remove if custom
          if (existingIdx >= 0) {
             newCalData[monthKey][existingIdx].name = "";
          } else {
             newCalData[monthKey].push({ date: editModal.date, name: "" });
          }
      } else {
          if (existingIdx >= 0) {
             newCalData[monthKey][existingIdx].name = editInput;
          } else {
             newCalData[monthKey].push({ date: editModal.date, name: editInput });
          }
      }
      
      try {
         await setDoc(doc(db, 'settings', 'calendar_2083'), newCalData);
         setEditModal(null);
      } catch(e) {
         alert('Failed to save update');
      }
      setIsSaving(false);
  };

  useEffect(() => {
      // Turn to the current month page automatically after readiness
      if (isReady && selectedMonth !== '-1' && bookRef.current) {
          setTimeout(() => {
             try {
                bookRef.current?.pageFlip()?.turnToPage(parseInt(selectedMonth) + 1);
             } catch(e) {}
          }, 300);
      }
  }, [isReady]);
  
  const onFlip = (e: any) => {
    flipSound.currentTime = 0;
    flipSound.play().catch(() => {});
    const pageIndex = e.data;
    setSelectedMonth(pageIndex === 0 ? '-1' : (pageIndex - 1).toString());
  };

  const nextButtonClick = () => {
     bookRef.current?.pageFlip().flipNext();
  };

  const prevButtonClick = () => {
     bookRef.current?.pageFlip().flipPrev();
  };
  
  const handleJumpToMonth = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const val = e.target.value;
     setSelectedMonth(val);
     if (bookRef.current) {
        bookRef.current.pageFlip().turnToPage(parseInt(val) + 1);
     }
  };

  const downloadPDF = () => {
     const doc = new jsPDF('p', 'pt', 'a4');
     const pageWidth = doc.internal.pageSize.getWidth();
     
     // Header
     doc.addImage('https://i.postimg.cc/SxGS5WxY/logo.png', 'PNG', 40, 30, 50, 50);
     doc.setFontSize(22);
     doc.setFont('helvetica', 'bold');
     doc.setTextColor(30, 58, 138); // Primary color
     doc.text('Shikshantar Academy', 100, 50);
     doc.setFontSize(14);
     doc.setTextColor(100, 100, 100);
     doc.text('Academic Calendar - 2083 B.S.', 100, 70);
     
     let currentY = 100;
     
     monthsData.forEach((month, idx) => {
         if (month.events.length === 0) return; // Only list months with events for brief calendar preview
         
         if (currentY > 700) {
            doc.addPage();
            currentY = 50;
         }
         
         doc.setFontSize(12);
         doc.setFont('helvetica', 'bold');
         doc.setTextColor(30, 58, 138);
         doc.text(month.name, 40, currentY);
         currentY += 15;
         
         const tableData = month.events.map((e: any) => [
            `${e.date} ${month.name}`, e.name
         ]);
         
         autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Event / Holiday']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] },
            margin: { left: 40, right: 40 },
         });
         
         currentY = (doc as any).lastAutoTable.finalY + 30;
     });
     
     doc.save('SA2083_calendar.pdf');
  };

  if (!isReady) return null;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col items-center">
      <Helmet>
        <title>Academic Calendar 2083 | Shikshantar Academy</title>
      </Helmet>
      
      <div className="text-center mb-6 w-full flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl lg:text-3xl font-black text-primary uppercase tracking-wider mb-1 flex items-center gap-3">
             <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" className="w-8 h-8 rounded-full shadow-sm" />
             Academic Calendar 2083
          </h1>
          <p className="text-gray-500 font-medium text-sm">Interactive Flipbook Calendar</p>
        </div>
        
        <div className="flex gap-3 items-center">
           <button onClick={downloadPDF} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-colors shadow-sm whitespace-nowrap">
              <Download className="w-4 h-4"/> Download PDF
           </button>
           <div className="flex gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <select 
                   value={selectedMonth} 
                   onChange={handleJumpToMonth} 
                   className="pl-9 pr-6 text-sm font-bold bg-transparent text-gray-700 py-2 border-none outline-none focus:ring-0 cursor-pointer w-40"
                >
                   <option value="-1">Go to Cover</option>
                   {monthsData.map((m, idx) => (
                      <option key={m.name} value={idx}>{m.name}</option>
                   ))}
                </select>
              </div>
           </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center w-full my-6 bg-gray-50 p-6 md:p-10 rounded-2xl shadow-inner border border-gray-200/60 overflow-hidden">
        
        {/* Navigation Buttons for Large Screens */}
        <button onClick={prevButtonClick} className="hidden md:flex absolute left-4 z-20 w-12 h-12 bg-white rounded-full shadow-lg items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-gray-200 active:scale-95">
           <ChevronLeft className="w-8 h-8 -mr-1" />
        </button>
        
        <div className="relative flex justify-center items-center drop-shadow-[0_20px_25px_rgba(0,0,0,0.15)] mx-auto perspective-1000 w-full max-w-4xl aspect-[3/4] md:aspect-[8/5.5]">
          {/* @ts-ignore */}
          <HTMLFlipBook 
            width={500} 
            height={700} 
            size="stretch"
            minWidth={280}
            maxWidth={500}
            minHeight={400}
            maxHeight={750}
            maxShadowOpacity={0.6}
            showCover={true}
            mobileScrollSupport={true}
            className="demo-book"
            onFlip={onFlip}
            ref={bookRef}
          >
            <PageCover>
              <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Shikshantar Academy Logo" className="w-36 h-36 mb-6 drop-shadow-2xl bg-white/10 rounded-full p-2 border-4 border-white/20" />
              <h1 className="text-4xl text-center font-black text-white uppercase tracking-widest leading-tight mb-2 drop-shadow-lg">Shikshantar<br/>Academy</h1>
              <p className="text-blue-200 text-sm tracking-wide font-medium">Siraha, Nepal</p>
              
              <div className="w-full flex items-center justify-center gap-4 my-8">
                 <div className="h-px bg-gradient-to-r from-transparent via-white/50 to-transparent w-full"></div>
                 <div className="w-2 h-2 rotate-45 bg-white shrink-0"></div>
                 <div className="h-px bg-gradient-to-r from-transparent via-white/50 to-transparent w-full"></div>
              </div>
              
              <h2 className="text-2xl font-black tracking-[0.4em] text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.5)] bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent transform">CALENDAR 2083</h2>
              <p className="mt-8 text-blue-300/80 text-xs font-medium tracking-widest uppercase border border-blue-300/30 px-4 py-2 rounded-full">Swipe or click to open</p>
            </PageCover>

            {monthsData.map((month, index) => (
               <CalendarPage key={month.name} month={month} monthIndex={index} isAdmin={isAdmin} onDateClick={handleDateClick} />
            ))}

            <PageCover>
              <img src="https://i.postimg.cc/SxGS5WxY/logo.png" alt="Logo" className="w-24 h-24 mb-6 opacity-30 grayscale p-2" />
              <h2 className="text-2xl font-black tracking-widest text-center text-blue-200/60 uppercase">Shikshantar Academy<br/> <span className="text-sm tracking-widest text-blue-300/50 block mt-2">End of Calendar</span></h2>
            </PageCover>
          </HTMLFlipBook>
        </div>
        
        <button onClick={nextButtonClick} className="hidden md:flex absolute right-4 z-20 w-12 h-12 bg-white rounded-full shadow-lg items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-gray-200 active:scale-95">
           <ChevronRight className="w-8 h-8 -ml-1" />
        </button>

      </div>
      
      {/* Mobile Nav Controls */}
      <div className="md:hidden flex gap-4 w-full justify-between items-center bg-white p-3 rounded-full shadow-md border border-gray-200">
          <button onClick={prevButtonClick} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-full font-bold flex justify-center items-center gap-1 active:scale-95"><ChevronLeft className="w-5 h-5"/> Prev</button>
          <div className="text-xs font-black text-gray-400 tracking-widest uppercase">Flip It</div>
          <button onClick={nextButtonClick} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold flex justify-center items-center gap-1 active:scale-95">Next <ChevronRight className="w-5 h-5"/></button>
      </div>

      {isAdmin && (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-8">
           <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
             <Edit2 className="w-6 h-6 text-primary" />
             Edit Academic Calendar
           </h2>
           
           <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Month</label>
                 <select 
                    value={adminMonth}
                    onChange={(e) => setAdminMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold bg-white"
                 >
                    {DEFAULT_MONTHS_2083.map((m, i) => (
                       <option key={i} value={i}>{m.name}</option>
                    ))}
                 </select>
              </div>
              <div className="w-full md:w-32">
                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date</label>
                 <input 
                    type="number" 
                    min="1" 
                    max="32" 
                    placeholder="e.g. 15"
                    value={adminDate}
                    onChange={(e) => setAdminDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                 />
              </div>
              <div className="flex-[2] w-full">
                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Event Name</label>
                 <input 
                    type="text" 
                    placeholder="E.g. Dashain Break"
                    value={adminEventName}
                    onChange={(e) => setAdminEventName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                 />
              </div>
              <button 
                 onClick={handleAdminSave}
                 disabled={!adminDate || !adminEventName || isSaving}
                 className="w-full md:w-auto px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                 {isSaving ? 'Saving...' : 'Save/Update'}
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DEFAULT_MONTHS_2083.map((m, i) => {
                 const monthKey = `month_${i}`;
                 const customList = customEventsData[monthKey] || [];
                 if (customList.length === 0) return null;
                 
                 return (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                       <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                          <span className="font-bold text-sm text-gray-800">{m.name}</span>
                          <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded shadow-sm">Month {i+1}</span>
                       </div>
                       <ul className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                          {customList.map((ce: any, idx: number) => (
                             <li key={idx} className="flex justify-between items-center px-4 py-2.5 hover:bg-gray-50 group">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex justify-center items-center font-bold text-xs shrink-0 border border-blue-100">{ce.date}</div>
                                   <span className="text-sm font-bold text-gray-600 break-words">{ce.name || <em>(Removed Default)</em>}</span>
                                </div>
                                <button 
                                   onClick={() => handleDeleteCustomEvent(i.toString(), ce.date)}
                                   className="text-red-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                   <Trash2 className="w-4 h-4"/>
                                </button>
                             </li>
                          ))}
                       </ul>
                    </div>
                 );
              })}
           </div>
           <p className="text-xs text-gray-400 font-bold mt-6 text-center">Note: Default events cannot be deleted here, but you can override them with an empty or new name.</p>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full relative">
              <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                 Edit Event
                 <span className="text-xs tracking-wider text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-md">{editModal.monthName} {editModal.date}</span>
              </h3>
              
              <div className="flex flex-col gap-3">
                 <label className="text-xs font-bold text-gray-600 uppercase">Event Name <span className="text-gray-400 font-medium normal-case">(leave blank to clear)</span></label>
                 <input 
                    type="text" 
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-bold text-gray-800 w-full mb-2"
                    placeholder="E.g. Dashain, Public Holiday"
                    autoFocus
                 />
                 
                 <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button 
                       onClick={() => setEditModal(null)}
                       className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                       disabled={isSaving}
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={saveEvent}
                       disabled={isSaving}
                       className="px-4 py-2 font-bold text-white bg-primary hover:bg-opacity-90 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                       {isSaving ? 'Saving...' : 'Save Update'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

