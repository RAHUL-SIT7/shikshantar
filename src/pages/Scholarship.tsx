import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Award, Edit2, Save, X } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ScholarshipTab from '../components/fee_management/ScholarshipTab';

const Scholarship = ({ userRole }: { userRole?: string }) => {
  const [policy, setPolicy] = useState<string>('');
  const [tempPolicy, setTempPolicy] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [policyEditMode, setPolicyEditMode] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [studentsData, setStudentsData] = useState<any[]>([]);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'fee_structure'), (docSnap) => {
      let currentPolicy = `<p>The academy provides scholarships to outstanding students based on their class performance and terminal exam results...</p>`;
      if (docSnap.exists() && docSnap.data().scholarshipPolicy) {
        currentPolicy = docSnap.data().scholarshipPolicy;
      }
      setPolicy(currentPolicy);
      setLoading(false);
    }, (error) => {
      console.warn("Could not fetch fee structure:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isAdmin) {
       const fetchStructuresAndStudents = async () => {
          const settingsDoc = await getDoc(doc(db, 'settings', 'fee_structure'));
          const structs = settingsDoc.exists() ? (settingsDoc.data().academic || []) : [];

          const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
             const loaded = snapshot.docs.map(doc => {
                 const data = doc.data();
                 let baseFee = 0;
                 if (data.class) {
                     const struct = structs.find((s: any) => s.className === data.class);
                     if (struct) baseFee = Number(struct.tuition?.replace(/[^0-9.]/g, '') || 0);
                 }
                 if (data.scholarshipStatus === 'Provided' && data.scholarshipAmount) {
                     baseFee = Math.max(0, baseFee - Number(data.scholarshipAmount));
                 }
                 return { 
                     id: doc.id, 
                     ...data,
                     name: data.fullName || data.name,
                     monthlyFee: baseFee
                 };
             });
             setStudentsData(loaded);
          }, (error) => {
             console.warn("Failed to listen to users:", error);
          });
          return () => unsub();
       };
       let unsubscribe: any = null;
       fetchStructuresAndStudents().then(unsub => { unsubscribe = unsub; });
       return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [isAdmin]);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      await updateDoc(doc(db, 'settings', 'fee_structure'), {
        scholarshipPolicy: tempPolicy
      });
      setPolicyEditMode(false);
    } catch (err) {
      console.error("Failed to save policy", err);
      alert("Failed to save policy. Ensure you have the right permissions.");
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Award className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Our Scholarship Policy</h1>
          <p className="text-gray-500 font-medium mt-1">Information regarding merit discounts and scholarship schemes.</p>
        </div>
      </div>

      {/* Policy Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Award className="w-5 h-5 text-primary"/> Policy Document</h3>
          
          {isAdmin && (
             <div>
                {policyEditMode ? (
                   <div className="flex gap-2">
                      <button onClick={handleSavePolicy} disabled={savingPolicy} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-primary-dark transition-colors shadow-sm">
                         {savingPolicy ? 'Saving...' : <><Save className="w-4 h-4"/> Save Guidelines</>}
                      </button>
                      <button onClick={() => setPolicyEditMode(false)} className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:text-primary transition-colors border border-gray-300 shadow-sm">
                         <X className="w-4 h-4"/> Cancel
                      </button>
                   </div>
                ) : (
                   <button onClick={() => { setTempPolicy(policy); setPolicyEditMode(true); }} className="bg-blue-50 text-primary border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors shadow-sm">
                      <Edit2 className="w-4 h-4"/> Edit Guidelines
                   </button>
                )}
             </div>
          )}
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="p-8">
             {policyEditMode ? (
                 <div className="bg-white rounded border border-gray-300 overflow-hidden">
                    <style>{`.ql-editor { min-height: 200px; font-family: inherit; font-size: 1rem; }`}</style>
                    <ReactQuill 
                       theme="snow" 
                       value={tempPolicy} 
                       onChange={setTempPolicy} 
                       modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline'],
                            [{'list': 'ordered'}, {'list': 'bullet'}, { 'align': [] }],
                            ['clean']
                          ]
                       }}
                    />
                 </div>
             ) : (
                <div className="prose prose-blue max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: policy }} />
             )}
          </div>
        )}
      </div>

      {isAdmin && (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2 bg-slate-50">
               <Award className="w-5 h-5 text-emerald-600" />
               <h3 className="text-xl font-bold text-gray-800">Scholarship Management</h3>
            </div>
            <div className="p-6 bg-slate-50/50">
               <ScholarshipTab studentsData={studentsData} />
            </div>
         </div>
      )}
    </div>
  );
};

export default Scholarship;
