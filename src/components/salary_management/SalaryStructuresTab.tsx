import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function SalaryStructuresTab({ teachers, structures }: { teachers: any[], structures: any[] }) {
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [basicPay, setBasicPay] = useState('');
    const [dearness, setDearness] = useState('');
    const [transport, setTransport] = useState('');
    const [houseRent, setHouseRent] = useState('');
    const [other, setOther] = useState('');

    const [status, setStatus] = useState<string | null>(null);

    const handleSelect = (e: any) => {
        const tid = e.target.value;
        setSelectedTeacher(tid);
        setStatus(null);
        const st = structures.find(s => s.id === tid);
        if (st) {
            setBasicPay(st.basicPay || '');
            setDearness(st.dearness || '');
            setTransport(st.transport || '');
            setHouseRent(st.houseRent || '');
            setOther(st.other || '');
        } else {
            setBasicPay(''); setDearness(''); setTransport(''); setHouseRent(''); setOther('');
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedTeacher) {
            setStatus("Please select a teacher first.");
            return;
        }
        setStatus("Saving...");
        
        // If testing via AI Studio's Preview Role, simulate the save to prevent confusing permission errors
        const isPreviewMode = !!new URLSearchParams(window.location.search).get('previewRole');
        if (isPreviewMode) {
            setTimeout(() => {
                setStatus("Saved structure successfully! (Simulated in Preview Mode)");
                setTimeout(() => setStatus(null), 3000);
            }, 800);
            return;
        }

        try {
            await setDoc(doc(db, 'salary_structures', selectedTeacher), {
                basicPay: Math.max(0, Number(basicPay||0)),
                dearness: Math.max(0, Number(dearness||0)),
                transport: Math.max(0, Number(transport||0)),
                houseRent: Math.max(0, Number(houseRent||0)),
                other: Math.max(0, Number(other||0)),
                updatedAt: new Date().toISOString()
            });
            setStatus("Saved structure successfully!");
            setTimeout(() => setStatus(null), 3000);
        } catch (error: any) {
            console.error("Error saving salary structure:", error);
            if (error.code === 'permission-denied' || String(error.message).includes('permissions')) {
               setStatus("Failed to save: You do not have true admin permissions in the database.");
            } else {
               setStatus("Failed to save: " + error.message);
            }
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
            <h2 className="text-lg font-bold mb-6 text-primary">Assign Salary Structure</h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase">Select Teacher</label>
                   <select value={selectedTeacher} onChange={handleSelect} className="w-full mt-1 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary">
                       <option value="">-- Select Teacher --</option>
                       {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName || t.name}</option>)}
                   </select>
                </div>
                {selectedTeacher && (
                    <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">Basic Pay (NRS)</label>
                           <input type="number" min="0" value={basicPay} onChange={e=>setBasicPay(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-gray-200" required />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">Dearness Allowance</label>
                           <input type="number" min="0" value={dearness} onChange={e=>setDearness(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-gray-200" />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">Transport Allowance</label>
                           <input type="number" min="0" value={transport} onChange={e=>setTransport(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-gray-200" />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">House Rent Allowance</label>
                           <input type="number" min="0" value={houseRent} onChange={e=>setHouseRent(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-gray-200" />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase">Other Allowances</label>
                           <input type="number" min="0" value={other} onChange={e=>setOther(e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-gray-200" />
                        </div>
                    </div>
                    {status && (
                        <div className={`p-3 rounded-lg text-sm font-bold ${status.includes('Failed') ? 'bg-red-50 text-red-600' : status.includes('Please') ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {status}
                        </div>
                    )}
                    <button className="w-full bg-primary text-white p-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-blue-900 transition-colors">Save Structure</button>
                    </>
                )}
            </form>
            

            <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Existing Structures</h3>
                <div className="space-y-3">
                   {structures.map(s => {
                      const t = teachers.find(tx => tx.id === s.id);
                      if(!t) return null;
                      const total = (s.basicPay||0) + (s.dearness||0) + (s.transport||0) + (s.houseRent||0) + (s.other||0);
                      return (
                         <div key={s.id} className="p-4 border rounded-xl border-gray-100 text-sm flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => handleSelect({target:{value: s.id}})}>
                            <p className="font-bold text-gray-800">{t.fullName || t.name}</p>
                            <p className="font-black text-emerald-600">Total: NRs. {total.toLocaleString()}</p>
                         </div>
                      );
                   })}
                </div>
            </div>
        </div>
    )
}
