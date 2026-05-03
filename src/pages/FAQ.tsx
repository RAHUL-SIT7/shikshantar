import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Edit2, Save, X, Plus, Trash2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function FAQ() {
  const [faqs, setFaqs] = useState<{question: string, answer: string, id: string}[]>([]);
  const [tempFaqs, setTempFaqs] = useState<{question: string, answer: string, id: string}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'faq'), (docSnap) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        if (dbData.items) {
          setFaqs(dbData.items);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/faq'));

    return () => unsub();
  }, []);

  const handleEdit = () => {
    setTempFaqs(faqs.length > 0 ? faqs : [{ id: Date.now().toString(), question: '', answer: '' }]);
    setIsEditing(true);
  };

  const addFaq = () => {
    setTempFaqs([...tempFaqs, { id: Date.now().toString(), question: '', answer: '' }]);
  };

  const removeFaq = (id: string) => {
    setTempFaqs(tempFaqs.filter(f => f.id !== id));
  };

  const updateFaq = (id: string, field: 'question' | 'answer', value: string) => {
    setTempFaqs(tempFaqs.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validFaqs = tempFaqs.filter(f => f.question.trim() !== '' && f.answer.trim() !== '');
      await setDoc(doc(db, 'settings', 'faq'), { items: validFaqs });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/faq');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-[#1e3a8a] flex items-center gap-3">
             <HelpCircle className="w-8 h-8 text-[#f97316]" /> 
             Frequently Asked Questions
           </h1>
           <p className="text-gray-500 mt-2">Find answers to common questions about admissions, fees, and more.</p>
        </div>
        {isAdmin && !isEditing && (
          <button onClick={handleEdit} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shrink-0">
            <Edit2 className="w-4 h-4" /> Edit FAQs
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        {isEditing ? (
          <div className="space-y-6">
            {tempFaqs.map((faq, index) => (
              <div key={faq.id} className="p-4 border border-gray-200 rounded-xl relative bg-gray-50 group">
                <button onClick={() => removeFaq(faq.id)} className="absolute -top-3 -right-3 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="space-y-3">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Question {index + 1}</label>
                     <input 
                       type="text" 
                       value={faq.question} 
                       onChange={e => updateFaq(faq.id, 'question', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium" 
                       placeholder="e.g. What are the admission requirements?"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Answer</label>
                     <textarea 
                       value={faq.answer} 
                       onChange={e => updateFaq(faq.id, 'answer', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" 
                       rows={3}
                       placeholder="Enter the answer..."
                     ></textarea>
                   </div>
                </div>
              </div>
            ))}

            <button onClick={addFaq} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium">
              <Plus className="w-5 h-5" /> Add New Question
            </button>
            
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button disabled={saving} onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save FAQs'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.length === 0 ? (
               <div className="text-center py-12 text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>No frequently asked questions added yet.</p>
               </div>
            ) : (
               faqs.map((faq, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={faq.id} 
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <button 
                      onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 pr-8">{faq.question}</span>
                      {openId === faq.id ? <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {openId === faq.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 pt-1 text-gray-600 border-t border-gray-100 bg-gray-50/50 whitespace-pre-wrap leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
               ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
