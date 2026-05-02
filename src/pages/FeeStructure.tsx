import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Edit2, Save, X, Plus, Trash2, Search, Award, User as UserIcon } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface AcademicFee {
  id: string;
  className: string;
  admission: string;
  tuition: string;
  annual: string;
}

interface TransportFee {
  id: string;
  className: string;
  route: string;
  fee: string;
}

interface LabFee {
  id: string;
  className: string;
  subject: string;
  fee: string;
}

interface FeeStructureData {
  academic: AcademicFee[];
  transportation: TransportFee[];
  lab: LabFee[];
  scholarshipPolicy?: string;
}

const defaultData: FeeStructureData = {
  academic: [
    { id: '1', className: 'Nursery', admission: '5000', tuition: '1500', annual: '3000' },
    { id: '2', className: 'LKG', admission: '5000', tuition: '1500', annual: '3000' },
    { id: '3', className: 'UKG', admission: '5000', tuition: '1500', annual: '3000' },
    { id: '4', className: 'Class 1', admission: '6000', tuition: '1800', annual: '3500' },
    { id: '5', className: 'Class 2', admission: '6000', tuition: '1800', annual: '3500' },
    { id: '6', className: 'Class 3', admission: '6000', tuition: '1800', annual: '3500' },
    { id: '7', className: 'Class 4', admission: '7000', tuition: '2000', annual: '4000' },
    { id: '8', className: 'Class 5', admission: '7000', tuition: '2000', annual: '4000' },
    { id: '9', className: 'Class 6', admission: '8000', tuition: '2500', annual: '5000' },
    { id: '10', className: 'Class 7', admission: '8000', tuition: '2500', annual: '5000' },
    { id: '11', className: 'Class 8', admission: '8000', tuition: '2500', annual: '5000' },
    { id: '12', className: 'Class 9', admission: '10000', tuition: '3000', annual: '6000' },
    { id: '13', className: 'Class 10', admission: '10000', tuition: '3000', annual: '6000' },
  ],
  transportation: [
    { id: '1', className: 'All Classes', route: '0-5 km', fee: '1000' },
    { id: '2', className: 'All Classes', route: '5-10 km', fee: '1500' },
    { id: '3', className: 'All Classes', route: '10+ km', fee: '2000' },
  ],
  lab: [
    { id: '1', className: 'Class 1 to 10', subject: 'Computer', fee: '500' },
    { id: '2', className: 'Class 9 to 10', subject: 'Science', fee: '600' },
  ],
  scholarshipPolicy: `<p>The academy provides scholarships to outstanding students based on their class performance and terminal exam results.</p><br><ul><li><strong>1st Position</strong>: Students securing the 1st position with more than 90% in terminal exams receive a full/partial scholarship.</li><li><strong>2nd &amp; 3rd Position</strong>: Students securing 2nd or 3rd position with more than 85% in terminal exams are eligible for a merit discount.</li></ul><br><p>Discounts will be automatically assessed by administration after the final terminal exams, and updated on the student's individual fee structure.</p>`
};

const FeeStructure = () => {
  const [data, setData] = useState<FeeStructureData>(defaultData);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<FeeStructureData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scholarship/Discount State
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [discountType, setDiscountType] = useState('Merit');
  const [valueType, setValueType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountMessage, setDiscountMessage] = useState({ type: '', text: '' });

  const [policyEditMode, setPolicyEditMode] = useState(false);
  const [tempPolicy, setTempPolicy] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);

  const isAdmin = localStorage.getItem('userRole') === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'fee_structure'), (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as FeeStructureData);
        if (!editMode) {
          setEditedData(docSnap.data() as FeeStructureData);
        }
      } else {
        setData(defaultData);
        if (!editMode) {
          setEditedData(defaultData);
        }
      }
      setLoading(false);
    }, (error) => {
      console.warn("Could not fetch fee structure:", error);
      setData(defaultData);
      if (!editMode) setEditedData(defaultData);
      setLoading(false);
    });
    return () => unsub();
  }, [editMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'fee_structure'), editedData);
      setEditMode(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditedData(data);
    setEditMode(false);
  };

  const resetToDefault = () => {
    if (window.confirm("Are you sure you want to restore the default fee structure? This will overwrite your current draft.")) {
      setEditedData(defaultData);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      const updatedData = { ...data, scholarshipPolicy: tempPolicy };
      await setDoc(doc(db, 'settings', 'fee_structure'), updatedData, { merge: true });
      setPolicyEditMode(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    } finally {
      setSavingPolicy(false);
    }
  };

  const addAcademicRow = () => {
    setEditedData({
      ...editedData,
      academic: [...editedData.academic, { id: generateId(), className: '', admission: '', tuition: '', annual: '' }]
    });
  };

  const addTransportRow = () => {
    setEditedData({
      ...editedData,
      transportation: [...editedData.transportation, { id: generateId(), className: '', route: '', fee: '' }]
    });
  };

  const addLabRow = () => {
    setEditedData({
      ...editedData,
      lab: [...editedData.lab, { id: generateId(), className: '', subject: '', fee: '' }]
    });
  };

  const handleSearchStudents = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedStudent(null);
    setDiscountMessage({ type: '', text: '' });
    
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((user: any) => 
           (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      setSearchResults(results);
      if (results.length === 0) {
        setDiscountMessage({ type: 'error', text: 'No students found matching your search.' });
      }
    } catch (error) {
      console.error("Error searching students", error);
      setDiscountMessage({ type: 'error', text: 'Error searching for students.' });
    } finally {
      setSearching(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!selectedStudent || !discountValue) return;
    setApplyingDiscount(true);
    setDiscountMessage({ type: '', text: '' });
    
    try {
      await updateDoc(doc(db, 'users', selectedStudent.id), {
        discount: {
          type: discountType,
          valueType: valueType,
          value: Number(discountValue),
          updatedAt: new Date().toISOString()
        }
      });
      setDiscountMessage({ type: 'success', text: `Successfully applied ${discountType} discount to ${selectedStudent.firstName} ${selectedStudent.lastName || ''}` });
      setSelectedStudent(null);
      setDiscountValue('');
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error("Error applying discount", error);
      setDiscountMessage({ type: 'error', text: 'Error applying discount. Please try again.' });
    } finally {
      setApplyingDiscount(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading fee structure...</div>;
  }

  const currentData = editMode ? editedData : data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a8a]">Academy Fee Structure</h2>
          <p className="text-sm text-slate-600 mt-1">Comprehensive fee details for all classes</p>
        </div>
        {isAdmin && (
          <div>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Fee Structure
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={resetToDefault}
                  className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  disabled={saving}
                >
                  Reset Defaults
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  disabled={saving}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  disabled={saving}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Academic Fees */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
        <div className="p-6 border-b border-[#e2e8f0] bg-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#1e3a8a]">Academic Fees</h3>
          {editMode && (
            <button onClick={addAcademicRow} className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          )}
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="pb-4 font-semibold text-slate-700">Class</th>
                <th className="pb-4 font-semibold text-slate-700">Admission Fee</th>
                <th className="pb-4 font-semibold text-slate-700">Monthly Tuition</th>
                <th className="pb-4 font-semibold text-slate-700">Annual Charges</th>
                {editMode && <th className="pb-4 font-semibold text-slate-700 w-10"></th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {currentData.academic.map((row, index) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-3">
                    {editMode ? (
                      <input className="w-full border p-2 rounded" value={row.className} onChange={(e) => {
                        const newAcademic = [...editedData.academic];
                        newAcademic[index].className = e.target.value;
                        setEditedData({ ...editedData, academic: newAcademic });
                      }} />
                    ) : <span className="font-medium text-slate-800">{row.className}</span>}
                  </td>
                  <td className="py-3">
                    {editMode ? (
                      <input className="w-full border p-2 rounded" value={row.admission} onChange={(e) => {
                        const newAcademic = [...editedData.academic];
                        newAcademic[index].admission = e.target.value;
                        setEditedData({ ...editedData, academic: newAcademic });
                      }} />
                    ) : <span className="text-slate-600">Rs. {row.admission}</span>}
                  </td>
                  <td className="py-3">
                    {editMode ? (
                      <input className="w-full border p-2 rounded" value={row.tuition} onChange={(e) => {
                        const newAcademic = [...editedData.academic];
                        newAcademic[index].tuition = e.target.value;
                        setEditedData({ ...editedData, academic: newAcademic });
                      }} />
                    ) : <span className="text-slate-600">Rs. {row.tuition}</span>}
                  </td>
                  <td className="py-3">
                    {editMode ? (
                      <input className="w-full border p-2 rounded" value={row.annual} onChange={(e) => {
                        const newAcademic = [...editedData.academic];
                        newAcademic[index].annual = e.target.value;
                        setEditedData({ ...editedData, academic: newAcademic });
                      }} />
                    ) : <span className="text-slate-600">Rs. {row.annual}</span>}
                  </td>
                  {editMode && (
                    <td className="py-3 text-right">
                      <button onClick={() => {
                        const newAcademic = editedData.academic.filter((_, i) => i !== index);
                        setEditedData({ ...editedData, academic: newAcademic });
                      }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  )}
                </tr>
              ))}
              {currentData.academic.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No academic fees data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Transportation Fees */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
          <div className="p-6 border-b border-[#e2e8f0] bg-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#1e3a8a]">Transportation Fees</h3>
            {editMode && (
              <button onClick={addTransportRow} className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            )}
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className="pb-4 font-semibold text-slate-700 w-1/3">Class</th>
                  <th className="pb-4 font-semibold text-slate-700 w-1/3">Route</th>
                  <th className="pb-4 font-semibold text-slate-700 w-1/3 text-right">Monthly Fee</th>
                  {editMode && <th className="pb-4 font-semibold text-slate-700 w-10"></th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {currentData.transportation.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3">
                      {editMode ? (
                        <input className="w-full border p-2 rounded" value={row.className} onChange={(e) => {
                          const newTransport = [...editedData.transportation];
                          newTransport[index].className = e.target.value;
                          setEditedData({ ...editedData, transportation: newTransport });
                        }} />
                      ) : <span className="font-medium text-slate-800">{row.className}</span>}
                    </td>
                    <td className="py-3">
                      {editMode ? (
                        <input className="w-full border p-2 rounded" value={row.route} onChange={(e) => {
                          const newTransport = [...editedData.transportation];
                          newTransport[index].route = e.target.value;
                          setEditedData({ ...editedData, transportation: newTransport });
                        }} />
                      ) : <span className="text-slate-600">{row.route}</span>}
                    </td>
                    <td className="py-3 text-right">
                      {editMode ? (
                        <input className="w-full border p-2 rounded text-right" value={row.fee} onChange={(e) => {
                          const newTransport = [...editedData.transportation];
                          newTransport[index].fee = e.target.value;
                          setEditedData({ ...editedData, transportation: newTransport });
                        }} />
                      ) : <span className="text-slate-600">Rs. {row.fee}</span>}
                    </td>
                    {editMode && (
                      <td className="py-3 text-right">
                        <button onClick={() => {
                          const newTransport = editedData.transportation.filter((_, i) => i !== index);
                          setEditedData({ ...editedData, transportation: newTransport });
                        }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    )}
                  </tr>
                ))}
                {currentData.transportation.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-500">No transportation fees data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lab Fees */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
          <div className="p-6 border-b border-[#e2e8f0] bg-slate-50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#1e3a8a]">Lab Fees</h3>
            {editMode && (
              <button onClick={addLabRow} className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            )}
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className="pb-4 font-semibold text-slate-700 w-1/3">Class</th>
                  <th className="pb-4 font-semibold text-slate-700 w-1/3">Subject</th>
                  <th className="pb-4 font-semibold text-slate-700 w-1/3 text-right">Monthly/Annual Fee</th>
                  {editMode && <th className="pb-4 font-semibold text-slate-700 w-10"></th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {currentData.lab.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3">
                      {editMode ? (
                        <input className="w-full border p-2 rounded" value={row.className} onChange={(e) => {
                          const newLab = [...editedData.lab];
                          newLab[index].className = e.target.value;
                          setEditedData({ ...editedData, lab: newLab });
                        }} />
                      ) : <span className="font-medium text-slate-800">{row.className}</span>}
                    </td>
                    <td className="py-3">
                      {editMode ? (
                        <input className="w-full border p-2 rounded" value={row.subject} onChange={(e) => {
                          const newLab = [...editedData.lab];
                          newLab[index].subject = e.target.value;
                          setEditedData({ ...editedData, lab: newLab });
                        }} />
                      ) : <span className="text-slate-600">{row.subject}</span>}
                    </td>
                    <td className="py-3 text-right">
                      {editMode ? (
                        <input className="w-full border p-2 rounded text-right" value={row.fee} onChange={(e) => {
                          const newLab = [...editedData.lab];
                          newLab[index].fee = e.target.value;
                          setEditedData({ ...editedData, lab: newLab });
                        }} />
                      ) : <span className="text-slate-600">Rs. {row.fee}</span>}
                    </td>
                    {editMode && (
                      <td className="py-3 text-right">
                        <button onClick={() => {
                          const newLab = editedData.lab.filter((_, i) => i !== index);
                          setEditedData({ ...editedData, lab: newLab });
                        }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    )}
                  </tr>
                ))}
                {currentData.lab.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-500">No lab fees data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scholarship Policies Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-blue-200 bg-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-[#1e3a8a]" />
            <h3 className="text-xl font-bold text-[#1e3a8a]">Scholarship & Discount Policy</h3>
          </div>
          {isAdmin && !editMode && (
             <div>
                {policyEditMode ? (
                   <div className="flex gap-2">
                      <button onClick={handleSavePolicy} disabled={savingPolicy} className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 hover:bg-[#1e40af]">
                         {savingPolicy ? 'Saving...' : <><Save className="w-4 h-4"/> Save</>}
                      </button>
                      <button onClick={() => setPolicyEditMode(false)} className="bg-white text-gray-700 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 hover:bg-gray-50 border border-gray-300">
                         <X className="w-4 h-4"/> Cancel
                      </button>
                   </div>
                ) : (
                   <button onClick={() => { setTempPolicy(data.scholarshipPolicy || defaultData.scholarshipPolicy || ''); setPolicyEditMode(true); }} className="text-[#1e3a8a] bg-blue-50 px-3 py-1.5 rounded border border-[#1e3a8a]/20 shadow-sm text-sm font-bold flex items-center gap-1 hover:bg-blue-200 transition-colors">
                      <Edit2 className="w-4 h-4"/> Edit Policy
                   </button>
                )}
             </div>
          )}
        </div>
        <div className="p-6 text-slate-800 text-sm">
          {editMode || policyEditMode ? (
            <div className="bg-white rounded border border-gray-300 overflow-hidden">
               <style>{`.ql-editor { min-height: 150px; font-family: inherit; font-size: inherit; }`}</style>
               <ReactQuill 
                  theme="snow" 
                  value={policyEditMode ? tempPolicy : editedData.scholarshipPolicy} 
                  onChange={(val) => {
                     if (policyEditMode) setTempPolicy(val);
                     else setEditedData({ ...editedData, scholarshipPolicy: val });
                  }} 
                  modules={{
                     toolbar: [
                       ['bold', 'italic', 'underline'],
                       [{'list': 'ordered'}, {'list': 'bullet'}, { 'align': [] }],
                     ]
                  }}
               />
            </div>
          ) : (
             <div className="prose prose-sm max-w-none text-slate-800" 
                  dangerouslySetInnerHTML={{ __html: data.scholarshipPolicy || defaultData.scholarshipPolicy || '' }} />
          )}
        </div>
      </div>

      {/* Scholarship & Discounts Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden mt-8">
          <div className="p-6 border-b border-[#e2e8f0] bg-slate-50 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#1e3a8a]" />
            <h3 className="text-xl font-bold text-[#1e3a8a]">Scholarships & Discounts Allocation</h3>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-6">Search for a student to assign or update their fee scholarships and discounts.</p>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <button
                onClick={handleSearchStudents}
                disabled={searching || !searchTerm.trim()}
                className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1e40af] disabled:opacity-50 transition-colors"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {discountMessage.text && (
              <div className={`p-4 rounded-lg mb-6 text-sm ${discountMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {discountMessage.text}
              </div>
            )}

            {searchResults.length > 0 && !selectedStudent && (
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {searchResults.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3">
                              {student.firstName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                            </div>
                            <div className="text-sm font-medium text-slate-900">{student.firstName} {student.lastName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="text-[#1e3a8a] hover:text-[#1e40af]"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedStudent && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-900">Configure Discount for {selectedStudent.firstName} {selectedStudent.lastName}</h4>
                    <p className="text-sm text-blue-700">{selectedStudent.email}</p>
                    {selectedStudent.discount && (
                      <p className="text-xs font-medium text-amber-600 mt-2">
                        Current Active: {selectedStudent.discount.type} ({selectedStudent.discount.value}{selectedStudent.discount.valueType === 'Percentage' ? '%' : ' Rs.'})
                      </p>
                    )}
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-slate-500 hover:text-slate-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scholarship / Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="block w-full border border-slate-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="Merit">Merit Scholarship</option>
                      <option value="Merit - 1st Position (>90%)">Merit - 1st Position (&gt;90%)</option>
                      <option value="Merit - 2nd/3rd Position (>85%)">Merit - 2nd/3rd Position (&gt;85%)</option>
                      <option value="Need-based">Need-based Assistance</option>
                      <option value="Sibling">Sibling Discount</option>
                      <option value="Employee Child">Employee Child</option>
                      <option value="Custom">Custom Override</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Value Type</label>
                    <select
                      value={valueType}
                      onChange={(e) => setValueType(e.target.value)}
                      className="block w-full border border-slate-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Fixed">Fixed Amount (Rs.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                    <input
                      type="number"
                      min="0"
                      max={valueType === 'Percentage' ? 100 : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={valueType === 'Percentage' ? 'e.g. 50' : 'e.g. 1000'}
                      className="block w-full border border-slate-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyDiscount}
                    disabled={!discountValue || applyingDiscount}
                    className="px-6 py-2 bg-[#1e3a8a] border border-transparent rounded-lg text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    {applyingDiscount ? 'Applying...' : 'Apply to Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructure;

