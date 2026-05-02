import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Send, Loader2, Search, FileText, Settings, X, Plus, Save } from 'lucide-react';
import { auth } from '../firebase';
const logoImage = 'https://i.postimg.cc/SxGS5WxY/logo.png';

export default function Admission() {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formFields, setFormFields] = useState<any[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form Config State
  const [isFormConfigOpen, setIsFormConfigOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
       const user = auth.currentUser;
       if (user) {
         const userDoc = await getDoc(doc(db, 'users', user.uid));
         if (userDoc.exists() && userDoc.data().role === 'admin') {
           setIsAdmin(true);
         }
       }
    };
    checkAdmin();

    const fetchFields = async () => {
      try {
        const docRef = doc(db, 'settings', 'admissionFormConfig');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().fields) {
          setFormFields(docSnap.data().fields);
          // Initialize state with empty strings for all fields
          const initialData: Record<string, string> = {};
          docSnap.data().fields.forEach((f: any) => {
            initialData[f.id] = '';
            if (f.type === 'select' && f.options?.length > 0) {
              initialData[f.id] = f.options[0];
            }
          });
          setFormData(initialData);
        } else {
          // Fallback Default Fields
          const defaultFields = [
            { id: 'studentName', label: 'Student Full Name', type: 'text', required: true },
            { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
            { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
            { id: 'parentName', label: 'Parent/Guardian Name', type: 'text', required: true },
            { id: 'contactNumber', label: 'Contact Number', type: 'tel', required: true },
            { id: 'email', label: 'Email Address', type: 'email', required: false },
            { id: 'address', label: 'Residential Address', type: 'textarea', required: true },
            { id: 'gradeAppliedFor', label: 'Grade Applied For', type: 'select', options: ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3'], required: true },
            { id: 'previousSchool', label: 'Previous School Attended (If any)', type: 'text', required: false }
          ];
          setFormFields(defaultFields);
          const initialData: Record<string, string> = { gender: 'Male', gradeAppliedFor: 'Nursery' };
          defaultFields.forEach(f => {
            if (f.type !== 'select') initialData[f.id] = '';
          });
          setFormData(initialData);
        }
      } catch (error) {
        console.error("Error fetching form fields:", error);
      } finally {
        setIsLoadingFields(false);
      }
    };
    fetchFields();
  }, []);

  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    // Contact Number Validation if present in dynamic fields
    if (formData.contactNumber) {
      const cleanNumber = formData.contactNumber?.replace(/[\s-]/g, '') || '';
      if (cleanNumber.length > 0 && cleanNumber.length < 10) {
        setStatus({ type: 'error', message: 'Please enter a valid contact number (at least 10 digits).' });
        setIsSubmitting(false);
        return;
      }
    }

    // Prepare data for submission, ensuring tel fields have +977 prefix
    const submissionData = { ...formData };
    formFields.forEach(field => {
      if (field.type === 'tel' && submissionData[field.id]) {
         submissionData[field.id] = `+977 ${submissionData[field.id]}`;
      }
    });

    try {
      await addDoc(collection(db, 'admissions'), {
        ...submissionData,
        status: 'Pending',
        submittedAt: serverTimestamp()
      });
      
      setStatus({ type: 'success', message: 'Admission form submitted successfully! We will contact you soon.' });
      
      // Reset form
      const resetData: Record<string, string> = {};
      formFields.forEach((f: any) => {
        resetData[f.id] = '';
        if (f.type === 'select' && f.options?.length > 0) {
          resetData[f.id] = f.options[0];
        }
      });
      setFormData(resetData);
    } catch (error) {
      console.error('Error submitting form: ', error);
      setStatus({ type: 'error', message: 'Failed to submit form. Please make sure database rules allow writing to admissions collection, or try again later.' });
    }
    
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddField = () => {
    setFormFields([...formFields, { id: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, options: [] }]);
  };

  const handleUpdateField = (index: number, key: string, value: any) => {
    const newFields = [...formFields];
    newFields[index] = { ...newFields[index], [key]: value };
    if (key === 'label' && newFields[index].id.startsWith('field_')) {
      newFields[index].id = value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `field_${Date.now()}`;
    }
    setFormFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'admissionFormConfig'), { fields: formFields });
      alert("Form layout updated successfully!");
      setIsFormConfigOpen(false);
    } catch (error) {
      console.error("Error saving form config", error);
      alert("Failed to save layout.");
    } finally {
      setSavingConfig(false);
    }
  };

  const logoUrl = logoImage;

  if (isLoadingFields) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a] mb-4" />
        <p className="text-gray-500">Loading Form Layout...</p>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl p-8 shadow-sm border border-[#e5e7eb] max-w-4xl mx-auto overflow-hidden">
      
      {/* Background Watermark */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url('${logoUrl}')`,
          backgroundPosition: 'center',
          backgroundSize: '50%',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div className="flex flex-col items-center sm:items-start flex-1 min-w-[250px]">
            <div className="flex items-center gap-3 mb-2">
              <img src={logoUrl} alt="Shikshantar Academy Logo" className="w-10 h-10 object-contain rounded-full border border-gray-200 shadow-sm" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#1e3a8a] tracking-wide uppercase">Shikshantar Academy</h1>
            </div>
            <h2 className="text-xl font-bold text-[#374151] mb-2">Online Admission Form</h2>
            <p className="text-[#6b7280] text-sm text-center sm:text-left">Please fill out the form below to apply for admission to Shikshantar Academy.</p>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            {isAdmin && (
              <button 
                onClick={() => setIsFormConfigOpen(true)}
                className="bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] hover:bg-[#e2e8f0] px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold transition-colors shadow-sm"
              >
                <Settings className="w-4 h-4"/> Edit Form Fields
              </button>
            )}
          </div>
        </div>

        {status.type === 'success' && (
          <div className="mb-6 bg-[#d1fae5] border border-[#34d399] text-[#065f46] px-4 py-3 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#059669]" />
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

      {status.type === 'error' && (
        <div className="mb-6 bg-[#fee2e2] border border-[#f87171] text-[#991b1b] px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#dc2626]" />
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formFields.map((field) => (
            <div key={field.id} className={field.type === 'textarea' ? "md:col-span-2" : ""}>
              <label htmlFor={field.id} className="block text-sm font-bold text-[#374151] mb-1">
                {field.label} {field.required && <span className="text-[#dc2626]">*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  id={field.id}
                  name={field.id}
                  value={formData[field.id] || ''}
                  onChange={handleChange}
                  required={field.required}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] disabled:bg-[#f3f4f6]"
                  rows={3}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  disabled={isSubmitting}
                ></textarea>
              ) : field.type === 'select' ? (
                <select
                  id={field.id}
                  name={field.id}
                  value={formData[field.id] || ''}
                  onChange={handleChange}
                  required={field.required}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] disabled:bg-[#f3f4f6]"
                >
                  {(field.options || []).map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'tel' ? (
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-[#d1d5db] bg-gray-50 text-gray-600 sm:text-sm font-bold">
                    +977
                  </span>
                  <input
                    type="tel"
                    id={field.id}
                    name={field.id}
                    value={formData[field.id] || ''}
                    onChange={(e) => {
                       const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                       setFormData(prev => ({ ...prev, [field.id]: val }));
                    }}
                    required={field.required}
                    disabled={isSubmitting}
                    maxLength={10}
                    className="flex-1 w-full px-3 py-2 border border-[#d1d5db] rounded-r shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] disabled:bg-[#f3f4f6]"
                    placeholder="Enter 10-digit number"
                  />
                </div>
              ) : (
                <input
                  type={field.type}
                  id={field.id}
                  name={field.id}
                  value={formData[field.id] || ''}
                  onChange={handleChange}
                  required={field.required}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] disabled:bg-[#f3f4f6]"
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>

        {!isAdmin && (
          <div className="pt-4 border-t border-[#e5e7eb] flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${isSubmitting ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#1e3a8a] text-white hover:bg-[#1e40af]'}`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </form>

      {/* Form Configuration Modal (Admin Only) */}
      {isAdmin && isFormConfigOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Configure Admission Form</h2>
                <p className="text-xs text-gray-500">Customize the fields parents will see on this application.</p>
              </div>
              <button type="button" onClick={() => setIsFormConfigOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 bg-gray-50">
              <div className="space-y-4">
                {formFields.map((field, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-start relative group">
                    <button type="button" onClick={() => handleRemoveField(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"><X className="w-3 h-3"/></button>
                    
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Field Label</label>
                      <input type="text" value={field.label} onChange={(e) => handleUpdateField(idx, 'label', e.target.value)} className="w-full text-sm border-b border-gray-300 py-1 outline-none focus:border-blue-500 font-bold" />
                    </div>
                    
                    <div className="w-32 shrink-0">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Input Type</label>
                      <select value={field.type} onChange={(e) => handleUpdateField(idx, 'type', e.target.value)} className="w-full text-sm border-b border-gray-300 py-1 outline-none focus:border-blue-500 bg-transparent">
                        <option value="text">Text (Short)</option>
                        <option value="textarea">Text (Long)</option>
                        <option value="tel">Phone (+977)</option>
                        <option value="email">Email</option>
                        <option value="date">Date</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 mt-4 shrink-0">
                      <input type="checkbox" id={`req-${idx}`} checked={field.required} onChange={(e) => handleUpdateField(idx, 'required', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <label htmlFor={`req-${idx}`} className="text-sm font-bold text-gray-700">Required</label>
                    </div>

                    {field.type === 'select' && (
                      <div className="w-full mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Dropdown Options (Comma separated)</label>
                        <input type="text" value={(field.options || []).join(', ')} onChange={(e) => handleUpdateField(idx, 'options', e.target.value.split(',').map((s:string)=>s.trim()).filter((s:string)=>s))} className="w-full text-sm border-b border-gray-300 py-1 outline-none focus:border-blue-500 bg-transparent" placeholder="Option 1, Option 2, Option 3..." />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button type="button" onClick={handleAddField} className="mt-6 w-full border-2 border-dashed border-gray-300 text-gray-500 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 hover:border-gray-400 transition-colors">
                <Plus className="w-4 h-4"/> Add New Form Field
              </button>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
              <button type="button" onClick={() => setIsFormConfigOpen(false)} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="button" disabled={savingConfig} onClick={handleSaveConfig} className="bg-[#1e3a8a] text-white px-5 py-2 font-bold rounded flex items-center gap-2 hover:bg-[#1e40af] disabled:opacity-50">
                <Save className="w-4 h-4"/> {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
