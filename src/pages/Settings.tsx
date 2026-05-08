import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Save, Settings as SettingsIcon, MonitorPlay, Calendar, Plus, Trash2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'preview'>('content');
  const [previewRole, setPreviewRole] = useState<'guest'>('guest');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [isSaving, setIsSaving] = useState(false);

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
      </div>

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
