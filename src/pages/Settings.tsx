import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, onSnapshot, deleteDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { Save, Settings as SettingsIcon, MonitorPlay, Calendar, Plus, Trash2, RefreshCcw, History } from 'lucide-react';

import ThemeSettings from './ThemeSettings';

const DEFAULT_CONTENT = {
  tagline1: 'Welcome to',
  tagline2: 'Shikshantar Academy',
  description: 'Nurturing minds and building character in the heart of Siraha. We provide quality education with modern facilities, expert faculty, and a commitment to excellence.',
  principalMessage: 'At Shikshantar Academy, we believe in nurturing not just academic excellence, but character, creativity, and critical thinking. Our peaceful environment and modern facilities provide the perfect setting for your child to grow and thrive.',
  announcement: '',
  admissionsBadge: 'Admissions Open 2083 B.S.',
  statsStudents: '200+',
  statsTeachers: '12+',
  statsPassRate: '90%+',
  contactPhone: '9800000000',
  
  // Feature Cards
  feature1Title: 'Quality Education',
  feature1Desc: 'Comprehensive curriculum from Play Group to Class 10 following CDC Nepal standards. English medium instruction with focus on Science and Mathematics.',
  feature1Badge: '6 Core Subjects | Nepali & English Medium',
  feature2Title: 'Expert Faculty',
  feature2Desc: 'Led by Principal Mr. Pappu Jha and a team of 20+ dedicated, qualified educators with years of teaching experience.',
  feature2Badge: '20+ Teachers | Avg. 8 Years Experience',
  feature3Title: 'Excellent Results',
  feature3Desc: 'Consistent SEE results with above 90%+ pass rate. Producing district toppers every year since 2075 B.S.',
  feature3Badge: '90%+ Pass Rate | District Toppers Every Year',

  // Why Choose Us
  whyChooseTitle: 'Why Choose Shikshantar Academy?',
  whyChooseSub: 'Trusted by 400+ Families in Siraha',
  wc1Title: 'Modern Infrastructure',
  wc1Desc: 'Well-equipped classrooms, computer lab, science lab and library',
  wc2Title: 'Science & Computer Lab',
  wc2Desc: 'Hands-on learning with modern equipment for Class 8 and above',
  wc3Title: 'English Medium',
  wc3Desc: 'English as primary medium of instruction for all major subjects',
  wc4Title: 'Regular Assessments',
  wc4Desc: '5 examinations per year with transparent result publishing on portal',
  wc5Title: 'Affordable Fees',
  wc5Desc: 'Quality education at affordable rates starting NRs. 600/month',
  wc6Title: 'Central Location',
  wc6Desc: 'Conveniently located at Bastipur-5, Siraha — easily accessible',

  // Admissions CTA
  admissionsTitle: '🎓 Admissions Open for 2084 B.S.',
  admissionsDesc: 'Shikshantar Academy is now accepting admission applications for academic year 2084-2085 B.S. for Play Group to Class 10.',
  admissionsBullets: 'Play Group to Class 10\nOnline & offline admission available\nAffordable fee structure\nEnglish medium curriculum\nResults portal access for all students',
  admInfoTitle: 'Quick Admission Info',
  admInfoSession: '2084-2085 B.S.',
  admInfoClasses: 'PG to Class 10',
  admInfoFee: 'NRs. 600/month',
  admInfoLocation: 'Bastipur-5, Siraha',

  // Testimonials
  testiTitle: '💬 What Parents Say',
  testiSub: 'Trusted by families across Siraha',
  testi1Text: "My son's results have improved significantly since joining Shikshantar. The teachers are dedicated and the portal helps us track everything easily.",
  testi1Author: 'Ram Prasad Sharma',
  testi1Role: 'Parent of Class 10 Student',
  testi1Initials: 'RP',
  testi2Text: "Best school in Siraha for affordable quality education. My daughter got A+ in Science and Mathematics in SEE.",
  testi2Author: 'Sunita Devi Thapa',
  testi2Role: 'Parent of SEE Graduate 2081',
  testi2Initials: 'SD',
  testi3Text: "The online portal is very helpful. We can check fee receipts and results anytime from our phone. Very convenient for parents.",
  testi3Author: 'Mohan Lal Yadav',
  testi3Role: 'Parent of Class 9 Student',
  testi3Initials: 'ML',

  // Principal & Contact
  principalName: 'Mr. Pappu Jha',
  principalTitle: 'Principal, Shikshantar Academy',
  findUsAddress: 'Bastipur-5, Karjanha Municipality\nWard No. 05, Siraha,\nMadhesh Pradesh, Nepal'
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'preview' | 'system'>('content');
  const [previewRole, setPreviewRole] = useState<'guest'>('guest');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [trashItems, setTrashItems] = useState<any[]>([]);

  useEffect(() => {
     const unsubTrash = onSnapshot(collection(db, 'trash'), (snap) => {
         const now = Date.now();
         const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
         const freshItems: any[] = [];
         
         snap.docs.forEach((d) => {
             const data = d.data();
             const deletedAtTime = data.deletedAt?.toMillis ? data.deletedAt.toMillis() : now;
             if (now - deletedAtTime > sevenDaysMs) {
                 // Auto-delete item older than 7 days
                 deleteDoc(doc(db, 'trash', d.id)).catch(console.error);
             } else {
                 freshItems.push({ id: d.id, ...data });
             }
         });
         setTrashItems(freshItems);
     }, (err) => {
         console.warn("Could not load trash collection items: ", err.message);
     });
     return () => unsubTrash();
  }, []);

  const handleEmptyTrashSection = async (section: string) => {
      const itemsToRestore = trashItems.filter(item => item.section === section);
      if (itemsToRestore.length === 0) return;
      if (!window.confirm(`Are you sure you want to permanently delete the ${itemsToRestore.length} trashed items for ${section}? This cannot be undone.`)) return;
      setIsRestoring(section);
      try {
          for (const item of itemsToRestore) {
              await deleteDoc(doc(db, 'trash', item.id));
          }
      } catch (err) {
          console.error("Error emptying trash:", err);
      }
      setIsRestoring(null);
  };

  const handleRestoreSection = async (section: string) => {
      const itemsToRestore = trashItems.filter(item => item.section === section);
      if (itemsToRestore.length === 0) {
          alert("No items found to restore for this section.");
          return;
      }
      if (!window.confirm(`Are you sure you want to restore ${itemsToRestore.length} items from ${section}?`)) return;
      
      setIsRestoring(section);
      try {
          for (const item of itemsToRestore) {
              const { originalCollection, originalId, data, id } = item;
              if (originalCollection && originalId && data) {
                  await setDoc(doc(db, originalCollection, originalId), data);
              }
              await deleteDoc(doc(db, 'trash', id));
          }
          alert(`Successfully restored ${itemsToRestore.length} items for ${section}!`);
      } catch (err) {
          console.error("Error restoring:", err);
          alert(`Error restoring data: ` + (err as any).message);
      }
      setIsRestoring(null);
  };

  const handleClearSection = async (section: string, label: string) => {
    if (!window.confirm(`WARNING: This will permanently delete ALL data for ${label}. Are you sure?`)) return;
    const confirmText = window.prompt(`Type "DELETE" to confirm clearing ${label}.`);
    if (confirmText?.toUpperCase() !== 'DELETE') return;

    setIsClearing(section);
    try {
      let collectionsToClear: string[] = [];
      if (section === 'admissions') collectionsToClear = ['admissions'];
      if (section === 'fees') collectionsToClear = ['studentFees', 'transactions', 'financial_transactions'];
      if (section === 'results') collectionsToClear = ['results', 'results_secure', 'resultSummary', 'exams'];

      for (const c of collectionsToClear) {
        const qs = await getDocs(collection(db, c));
        for (const docSnap of qs.docs) {
          const trashRef = doc(collection(db, 'trash'));
          await setDoc(trashRef, {
             originalCollection: c,
             originalId: docSnap.id,
             data: docSnap.data(),
             section: section,
             deletedAt: serverTimestamp()
          });
          await deleteDoc(doc(db, c, docSnap.id));
        }
      }

      if (section === 'students') {
          const usersQs = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
          for (const docSnap of usersQs.docs) {
             const trashRef = doc(collection(db, 'trash'));
             await setDoc(trashRef, {
                originalCollection: 'users',
                originalId: docSnap.id,
                data: docSnap.data(),
                section: section,
                deletedAt: serverTimestamp()
             });
             await deleteDoc(doc(db, 'users', docSnap.id));
          }
      }

      alert(`${label} data cleared successfully!`);
    } catch (err) {
       console.error(`Error clearing ${section}:`, err);
       alert(`Error clearing data: ` + (err as any).message);
    }
    setIsClearing(null);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'home_content'), (docSnap) => {
      if (docSnap.exists()) {
        setContent(docSnap.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/home_content');
    });
    
    return () => {
       unsub();
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'home_content'), content);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto scrollbar-hide">
         <button 
           onClick={() => setActiveTab('content')}
           className={`px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'content' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
            Home Content Control
         </button>
         <button 
           onClick={() => setActiveTab('theme')}
           className={`px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'theme' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
            Theme Details
         </button>
         <button 
           onClick={() => setActiveTab('preview')}
           className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'preview' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
            <MonitorPlay className="w-4 h-4" /> Preview Dashboard
         </button>
         <button 
           onClick={() => setActiveTab('system')}
           className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'system' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-red-700'}`}
         >
            <Trash2 className="w-4 h-4" /> Reset Data
         </button>
      </div>

      {activeTab === 'system' && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 max-w-4xl">
           <h2 className="text-xl font-extrabold text-red-600 mb-2 flex items-center gap-2">
             <Trash2 className="w-6 h-6" />
             Clear System Data
           </h2>
           <p className="text-sm text-gray-600 mb-6">If you want to start fresh or remove dummy data, you can clear all students, admissions, fee records, transactions, and results here. This action is IRREVERSIBLE.</p>
           
           <div className="space-y-4">
               {/* Students */}
               <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                     <h4 className="font-bold text-red-800">Clear Student Accounts</h4>
                     <p className="text-xs text-red-600 mt-1">Deletes all student profiles and user accounts.</p>
                     {trashItems.filter(i => i.section === 'students').length > 0 && <p className="text-xs text-emerald-600 mt-2 font-bold">{trashItems.filter(i => i.section === 'students').length} items available to restore</p>}
                  </div>
                  <div className="flex items-center gap-3">
                      {trashItems.filter(i => i.section === 'students').length > 0 && (
                          <>
                            <button onClick={() => handleRestoreSection('students')} disabled={isRestoring !== null} className="bg-emerald-100 text-emerald-800 px-4 py-2 border border-emerald-200 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 disabled:opacity-50 transition-colors shadow-sm">
                               <History className="w-4 h-4" /> {isRestoring === 'students' ? 'Restoring...' : 'Restore'}
                            </button>
                            <button onClick={() => handleEmptyTrashSection('students')} disabled={isRestoring !== null} className="bg-gray-100 text-gray-800 px-4 py-2 border border-gray-200 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm">
                               <Trash2 className="w-4 h-4" /> Empty Trash
                            </button>
                          </>
                      )}
                      <button 
                        onClick={() => handleClearSection('students', 'Student Accounts')} 
                        disabled={isClearing !== null}
                        className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                         <Trash2 className="w-4 h-4" /> {isClearing === 'students' ? 'Clearing...' : 'Clear'}
                      </button>
                  </div>
               </div>
               
               {/* Fees */}
               <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                     <h4 className="font-bold text-red-800">Clear Fees & Transactions</h4>
                     <p className="text-xs text-red-600 mt-1">Deletes all student fee ledgers, payments, and history.</p>
                     {trashItems.filter(i => i.section === 'fees').length > 0 && <p className="text-xs text-emerald-600 mt-2 font-bold">{trashItems.filter(i => i.section === 'fees').length} items available to restore</p>}
                  </div>
                  <div className="flex items-center gap-3">
                      {trashItems.filter(i => i.section === 'fees').length > 0 && (
                          <>
                            <button onClick={() => handleRestoreSection('fees')} disabled={isRestoring !== null} className="bg-emerald-100 text-emerald-800 px-4 py-2 border border-emerald-200 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 disabled:opacity-50 transition-colors shadow-sm">
                               <History className="w-4 h-4" /> {isRestoring === 'fees' ? 'Restoring...' : 'Restore'}
                            </button>
                            <button onClick={() => handleEmptyTrashSection('fees')} disabled={isRestoring !== null} className="bg-gray-100 text-gray-800 px-4 py-2 border border-gray-200 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm">
                               <Trash2 className="w-4 h-4" /> Empty Trash
                            </button>
                          </>
                      )}
                      <button 
                        onClick={() => handleClearSection('fees', 'Fees & Transactions')} 
                        disabled={isClearing !== null}
                        className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                         <Trash2 className="w-4 h-4" /> {isClearing === 'fees' ? 'Clearing...' : 'Clear'}
                      </button>
                  </div>
               </div>

               {/* Results */}
               <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                     <h4 className="font-bold text-red-800">Clear Exams & Results</h4>
                     <p className="text-xs text-red-600 mt-1">Deletes all entered student marks and report cards.</p>
                     {trashItems.filter(i => i.section === 'results').length > 0 && <p className="text-xs text-emerald-600 mt-2 font-bold">{trashItems.filter(i => i.section === 'results').length} items available to restore</p>}
                  </div>
                  <div className="flex items-center gap-3">
                      {trashItems.filter(i => i.section === 'results').length > 0 && (
                          <>
                            <button onClick={() => handleRestoreSection('results')} disabled={isRestoring !== null} className="bg-emerald-100 text-emerald-800 px-4 py-2 border border-emerald-200 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 disabled:opacity-50 transition-colors shadow-sm">
                               <History className="w-4 h-4" /> {isRestoring === 'results' ? 'Restoring...' : 'Restore'}
                            </button>
                            <button onClick={() => handleEmptyTrashSection('results')} disabled={isRestoring !== null} className="bg-gray-100 text-gray-800 px-4 py-2 border border-gray-200 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm">
                               <Trash2 className="w-4 h-4" /> Empty Trash
                            </button>
                          </>
                      )}
                      <button 
                        onClick={() => handleClearSection('results', 'Exams & Results')} 
                        disabled={isClearing !== null}
                        className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                         <Trash2 className="w-4 h-4" /> {isClearing === 'results' ? 'Clearing...' : 'Clear'}
                      </button>
                  </div>
               </div>

               {/* Admissions */}
               <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                     <h4 className="font-bold text-red-800">Clear Admissions Data</h4>
                     <p className="text-xs text-red-600 mt-1">Deletes all online admission requests and forms.</p>
                     {trashItems.filter(i => i.section === 'admissions').length > 0 && <p className="text-xs text-emerald-600 mt-2 font-bold">{trashItems.filter(i => i.section === 'admissions').length} items available to restore</p>}
                  </div>
                  <div className="flex items-center gap-3">
                      {trashItems.filter(i => i.section === 'admissions').length > 0 && (
                          <>
                            <button onClick={() => handleRestoreSection('admissions')} disabled={isRestoring !== null} className="bg-emerald-100 text-emerald-800 px-4 py-2 border border-emerald-200 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 disabled:opacity-50 transition-colors shadow-sm">
                               <History className="w-4 h-4" /> {isRestoring === 'admissions' ? 'Restoring...' : 'Restore'}
                            </button>
                            <button onClick={() => handleEmptyTrashSection('admissions')} disabled={isRestoring !== null} className="bg-gray-100 text-gray-800 px-4 py-2 border border-gray-200 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm">
                               <Trash2 className="w-4 h-4" /> Empty Trash
                            </button>
                          </>
                      )}
                      <button 
                        onClick={() => handleClearSection('admissions', 'Admissions Data')} 
                        disabled={isClearing !== null}
                        className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                         <Trash2 className="w-4 h-4" /> {isClearing === 'admissions' ? 'Clearing...' : 'Clear'}
                      </button>
                  </div>
               </div>
           </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl">
           <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
             <SettingsIcon className="w-6 h-6 text-[var(--primary)]" />
             Edit Landing Page Text
           </h2>

           <div className="space-y-5">
            
            <div className="flex flex-col gap-1.5">
               <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Scrolling Announcement Notice</label>
               <input
                 type="text"
                 placeholder="Type an announcement to show globally, or clear this text to hide the notice bar."
                 value={content.announcement || ''}
                 onChange={(e) => setContent({...content, announcement: e.target.value})}
                 className="w-full border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary)] px-3 py-2 text-sm font-medium transition-colors placeholder:text-gray-400 placeholder:opacity-75"
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Hero Tagline 1</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_CONTENT.tagline1}
                    value={content.tagline1 || ''}
                    onChange={(e) => setContent({...content, tagline1: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Hero Tagline 2</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_CONTENT.tagline2}
                    value={content.tagline2 || ''}
                    onChange={(e) => setContent({...content, tagline2: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                  />
               </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Hero Description</label>
               <textarea
                 rows={3}
                 placeholder={DEFAULT_CONTENT.description}
                 value={content.description || ''}
                 onChange={(e) => setContent({...content, description: e.target.value})}
                 className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Admissions Badge Notice</label>
               <input
                 type="text"
                 placeholder={DEFAULT_CONTENT.admissionsBadge}
                 value={content.admissionsBadge || ''}
                 onChange={(e) => setContent({...content, admissionsBadge: e.target.value})}
                 className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
               />
            </div>

            <div className="flex flex-col gap-1.5 pt-4 border-t border-gray-100">
               <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Principal's Message</label>
               <textarea
                 rows={4}
                 placeholder={DEFAULT_CONTENT.principalMessage}
                 value={content.principalMessage || ''}
                 onChange={(e) => setContent({...content, principalMessage: e.target.value})}
                 className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
               />
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Students Count Text (e.g. 200+)</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_CONTENT.statsStudents}
                    value={content.statsStudents || ''}
                    onChange={(e) => setContent({...content, statsStudents: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Teachers Count Text (e.g. 12+)</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_CONTENT.statsTeachers}
                    value={content.statsTeachers || ''}
                    onChange={(e) => setContent({...content, statsTeachers: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Pass Rate (e.g. 90%+)</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_CONTENT.statsPassRate}
                    value={content.statsPassRate || ''}
                    onChange={(e) => setContent({...content, statsPassRate: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-widest text-[11px]">Contact Phone</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_CONTENT.contactPhone}
                    value={content.contactPhone || ''}
                    onChange={(e) => setContent({...content, contactPhone: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                  />
               </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
               <button 
                 onClick={handleSave} 
                 disabled={isSaving}
                 className="bg-[var(--primary)] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 disabled:opacity-70"
               >
                 <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
               </button>
            </div>
            
            <div className="border-t border-gray-100 pt-4 mt-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Advanced Home Content</h3>
              <p className="text-sm text-gray-500 mb-6">Modify all text across the public landing page below. Expand sections to edit.</p>
              
              {[
                {
                  title: 'Feature Cards (Top row)',
                  fields: [
                    { key: 'feature1Title', label: 'Feature 1 Title', type: 'text' },
                    { key: 'feature1Desc', label: 'Feature 1 Description', type: 'textarea' },
                    { key: 'feature1Badge', label: 'Feature 1 Badge', type: 'text' },
                    { key: 'feature2Title', label: 'Feature 2 Title', type: 'text' },
                    { key: 'feature2Desc', label: 'Feature 2 Description', type: 'textarea' },
                    { key: 'feature2Badge', label: 'Feature 2 Badge', type: 'text' },
                    { key: 'feature3Title', label: 'Feature 3 Title', type: 'text' },
                    { key: 'feature3Desc', label: 'Feature 3 Description', type: 'textarea' },
                    { key: 'feature3Badge', label: 'Feature 3 Badge', type: 'text' },
                  ]
                },
                {
                  title: 'Why Choose Us',
                  fields: [
                    { key: 'whyChooseTitle', label: 'Section Title', type: 'text' },
                    { key: 'whyChooseSub', label: 'Section Subtitle', type: 'text' },
                    ...Array.from({length: 6}).map((_, i) => [
                      { key: `wc${i+1}Title`, label: `Item ${i+1} Title`, type: 'text' },
                      { key: `wc${i+1}Desc`, label: `Item ${i+1} Desc`, type: 'text' }
                    ]).flat()
                  ]
                },
                {
                  title: 'Admissions CTA & Quick Info',
                  fields: [
                    { key: 'admissionsTitle', label: 'Admissions Status Title', type: 'text' },
                    { key: 'admissionsDesc', label: 'Admissions Status Description', type: 'textarea' },
                    { key: 'admissionsBullets', label: 'Bullets (one per line)', type: 'textarea' },
                    { key: 'admInfoTitle', label: 'Quick Info Title', type: 'text' },
                    { key: 'admInfoSession', label: 'Session Line', type: 'text' },
                    { key: 'admInfoClasses', label: 'Classes Line', type: 'text' },
                    { key: 'admInfoFee', label: 'Fee Line', type: 'text' },
                    { key: 'admInfoLocation', label: 'Location Line', type: 'text' },
                  ]
                },
                {
                  title: 'Testimonials',
                  fields: [
                    { key: 'testiTitle', label: 'Testimonials Title', type: 'text' },
                    { key: 'testiSub', label: 'Testimonials Subtitle', type: 'text' },
                    ...Array.from({length: 3}).map((_, i) => [
                      { key: `testi${i+1}Text`, label: `Review ${i+1} Text`, type: 'textarea' },
                      { key: `testi${i+1}Author`, label: `Review ${i+1} Author Name`, type: 'text' },
                      { key: `testi${i+1}Role`, label: `Review ${i+1} Role text`, type: 'text' },
                      { key: `testi${i+1}Initials`, label: `Review ${i+1} Initials`, type: 'text' },
                    ]).flat()
                  ]
                },
                {
                  title: 'Principal & Contact Details',
                  fields: [
                    { key: 'principalName', label: 'Principal Name', type: 'text' },
                    { key: 'principalTitle', label: 'Principal Title', type: 'text' },
                    { key: 'findUsAddress', label: 'Find Us Address', type: 'textarea' }
                  ]
                }
              ].map((section, idx) => (
                  <div key={idx} className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                     <h4 className="font-bold text-gray-800 mb-4">{section.title}</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.fields.map(f => (
                            <div key={f.key} className={`flex flex-col gap-1.5 ${f.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{f.label}</label>
                              {f.type === 'textarea' ? (
                                <textarea
                                  rows={3}
                                  placeholder={(DEFAULT_CONTENT as any)[f.key]}
                                  value={(content as any)[f.key] || ''}
                                  onChange={(e) => setContent({...content, [f.key]: e.target.value})}
                                  className="w-full border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                                />
                              ) : (
                                <input
                                  type="text"
                                  placeholder={(DEFAULT_CONTENT as any)[f.key]}
                                  value={(content as any)[f.key] || ''}
                                  onChange={(e) => setContent({...content, [f.key]: e.target.value})}
                                  className="w-full border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] px-3 py-2 text-sm font-medium placeholder:text-gray-400 placeholder:opacity-75"
                                />
                              )}
                            </div>
                        ))}
                     </div>
                  </div>
              ))}

             <div className="pt-4 flex justify-end">
               <button 
                 onClick={handleSave} 
                 disabled={isSaving}
                 className="bg-[var(--primary)] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-opacity-90 disabled:opacity-70"
               >
                 <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
               </button>
            </div>

            </div>
           </div>
        </div>
      )}

      {activeTab === 'theme' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <ThemeSettings />
        </div>
      )}



      {activeTab === 'preview' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
             <span className="text-sm font-bold text-gray-700">Preview View:</span>
             <div className="flex gap-2">
                <button 
                  onClick={() => setPreviewRole('guest')} 
                  className={`px-3 py-1.5 text-sm font-bold rounded flex items-center gap-1 border ${previewRole === 'guest' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                >
                  <MonitorPlay className="w-4 h-4"/> Guest
                </button>
             </div>
             <p className="text-xs text-gray-500 ml-auto">Changes here show exactly how it looks to users.</p>
          </div>
          <div className="border-4 border-gray-800 rounded-2xl overflow-hidden w-full h-[600px] shadow-xl bg-gray-100 relative max-w-4xl mx-auto">
             <iframe src={`/?previewRole=${previewRole}`} className="w-full h-full border-none"></iframe>
          </div>
        </div>
      )}

    </div>
  );
}
