import React, { useState, useEffect, useMemo } from 'react';
import { formatBSDate, formatBSDateTime } from '../lib/nepaliDate';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { User, Phone, Mail, MapPin, Calendar, Clock, CheckCircle2, XCircle, Trash2, Edit2, Save, X, ArrowUpDown, ArrowUp, ArrowDown, Settings, Plus, Download } from 'lucide-react';

export default function AdminAdmissions() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [admissionToDelete, setAdmissionToDelete] = useState<{ id: string, name: string } | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Form Config State
  const [formFields, setFormFields] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribe = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch Admission Data
        const q = query(collection(db, 'admissions'), orderBy('submittedAt', 'desc'));
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const records: any[] = [];
          querySnapshot.forEach((docSnap) => {
            records.push({ id: docSnap.id, ...docSnap.data() });
          });
          setAdmissions(records);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching admissions: ", error);
          setLoading(false);
        });

        // Fetch Config Fields
        const fetchFormConfig = async () => {
          const configDoc = await getDoc(doc(db, 'settings', 'admissionFormConfig'));
          if (configDoc.exists() && configDoc.data().fields) {
            setFormFields(configDoc.data().fields);
          } else {
            setFormFields([
                { id: 'studentName', label: 'Student Full Name', type: 'text', required: true },
                { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
                { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
                { id: 'parentName', label: 'Parent/Guardian Name', type: 'text', required: true },
                { id: 'contactNumber', label: 'Contact Number', type: 'tel', required: true },
                { id: 'email', label: 'Email Address', type: 'email', required: false },
                { id: 'address', label: 'Residential Address', type: 'textarea', required: true },
                { id: 'gradeAppliedFor', label: 'Grade Applied For', type: 'select', options: ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2'], required: true },
                { id: 'previousSchool', label: 'Previous School Attended (If any)', type: 'text', required: false }
            ]);
          }
        };
        fetchFormConfig();
      } else {
        setAdmissions([]);
        setLoading(false);
      }
    });

    return () => { unsubscribe(); unsubAuth(); };
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'admissions', id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    if (!admissionToDelete) return;
    try {
      await deleteDoc(doc(db, 'admissions', admissionToDelete.id));
      setAdmissionToDelete(null);
    } catch (error) {
      console.error("Error deleting record: ", error);
      alert("Failed to delete record.");
    }
  };

  const handleEditClick = (admission: any) => {
    setEditingId(admission.id);
    setEditData(admission);
  };

  const handleSaveEdit = async () => {
    try {
      // Exclude metadata from update
      const { id, submittedAt, status, ...updatePayload } = editData;
      await updateDoc(doc(db, 'admissions', editingId!), updatePayload);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving edits: ", error);
      alert("Failed to save changes.");
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAdmissions = useMemo(() => {
    const sortableData = [...admissions];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        // Handle Date sorting specifically
        if (sortConfig.key === 'submittedAt') {
          aValue = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : new Date(a.submittedAt).getTime();
          bValue = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : new Date(b.submittedAt).getTime();
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [admissions, sortConfig]);

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-3 h-3 inline-block ml-1 text-blue-600" /> : 
      <ArrowDown className="w-3 h-3 inline-block ml-1 text-blue-600" />;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle Firestore timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatBSDateTime(date);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading admissions data...</div>;
  }

  const handleExportCSV = () => {
    if (admissions.length === 0) {
      alert("No data to export");
      return;
    }

    // Build headers based on form fields plus standard ones
    const dynamicHeaders = formFields.map(f => f.label);
    const standardHeaders = ['Date Submitted', 'Status'];
    const csvHeaders = [...dynamicHeaders, ...standardHeaders];

    // Build rows
    const rows = admissions.map(adm => {
      const rowData = formFields.map(f => {
        // Enclose in quotes to handle commas inside text
        const raw = adm[f.id] || '';
        return `"${String(raw).replace(/"/g, '""')}"`;
      });
      // Date and Status
      const dateRaw = adm.submittedAt ? (adm.submittedAt.toDate ? adm.submittedAt.toDate() : new Date(adm.submittedAt)) : new Date();
      rowData.push(`"${formatBSDateTime(dateRaw)}"`);
      rowData.push(`"${adm.status || 'Pending'}"`);
      return rowData.join(',');
    });

    const csvContent = 
      "Shikshantar Academy\n" + 
      "Admission List Report\n\n" + 
      csvHeaders.join(',') + "\n" + 
      rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Admission_List_${formatBSDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 py-2 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1e293b]">Admission Requests</h2>
          <p className="text-xs text-gray-500 mt-1">Manage and respond to new student applications.</p>
        </div>
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="bg-[#f8fafc] px-4 py-2 flex items-center rounded border border-gray-200 text-sm font-bold text-[#1e3a8a]">
            Total Applications: {admissions.length}
          </div>
          <button 
            onClick={handleExportCSV}
            className="bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] hover:bg-[#dcfce7] px-3 py-2 rounded flex items-center gap-2 text-sm font-bold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4"/> Export CSV List
          </button>
        </div>
      </div>

      {admissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Admission Requests</h3>
          <p className="text-sm text-gray-500 mt-1">When parents fill out the admission form, it will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold select-none">
                <th className="p-4 cursor-pointer hover:bg-gray-100 group transition-colors" onClick={() => handleSort('submittedAt')}>
                  Date {getSortIcon('submittedAt')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 group transition-colors" onClick={() => handleSort('studentName')}>
                  Student Info {getSortIcon('studentName')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 group transition-colors" onClick={() => handleSort('parentName')}>
                  Parent Details {getSortIcon('parentName')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 group transition-colors" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </th>
                <th className="p-4">
                  Scholarship
                </th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedAdmissions.map((admission) => (
                <React.Fragment key={admission.id}>
                  {editingId === admission.id ? (
                    <tr className="bg-blue-50/40">
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(admission.submittedAt)}</div>
                      </td>
                      <td className="p-4 align-top space-y-2" colSpan={4}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                          {Object.keys(editData).filter(key => !['id', 'status', 'submittedAt', 'scholarshipStatus'].includes(key)).map(key => (
                            <div key={key}>
                              <label className="text-[0.6rem] uppercase text-gray-500 font-bold block mb-1">{formFields.find(f => f.id === key)?.label || key}</label>
                              <input type="text" value={editData[key] || ''} onChange={e => setEditData({...editData, [key]: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
                            </div>
                          ))}
                          <div>
                            <label className="text-[0.6rem] uppercase text-gray-500 font-bold block mb-1">Scholarship Status</label>
                            <select value={editData.scholarshipStatus || 'Not Provided'} onChange={e => setEditData({...editData, scholarshipStatus: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-500">
                              <option value="Not Provided">Not Provided</option>
                              <option value="Provided">Provided</option>
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top border-l border-blue-100 text-center">
                        <div className="flex flex-col gap-2">
                          <button onClick={handleSaveEdit} className="bg-green-600 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 hover:bg-green-700 shadow-sm">
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 hover:bg-gray-300 shadow-sm">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 text-xs text-gray-500 whitespace-nowrap align-top">
                        <div className="flex border border-gray-200 bg-white rounded px-2 py-1 w-fit items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(admission.submittedAt)}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-[#1e293b] text-base">{admission.studentName}</div>
                        <div className="text-sm font-semibold text-blue-600 mb-1">Grade: {admission.gradeAppliedFor}</div>
                        <div className="flex items-start gap-1 text-xs text-gray-500 mt-2 max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{admission.address}</span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1">
                          <User className="w-4 h-4 text-gray-400" />
                          {admission.parentName}
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <a href={`tel:${admission.contactNumber}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                            <Phone className="w-3.5 h-3.5 text-gray-400" /> {admission.contactNumber}
                          </a>
                          {admission.email && (
                            <a href={`mailto:${admission.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                              <Mail className="w-3.5 h-3.5 text-gray-400" /> {admission.email}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <select 
                          value={admission.status || 'Pending'} 
                          onChange={(e) => handleUpdateStatus(admission.id, e.target.value)}
                          className={`text-xs font-bold px-2 py-1.5 rounded-full border outline-none cursor-pointer w-full text-center ${
                            admission.status === 'Pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 
                            admission.status === 'Contacted' ? 'bg-blue-50 text-blue-800 border-blue-200' : 
                            admission.status === 'Admitted' ? 'bg-green-50 text-green-800 border-green-200' : 
                            'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          <option value="Pending">🕒 Pending</option>
                          <option value="Contacted">📞 Contacted</option>
                          <option value="Admitted">✅ Admitted</option>
                          <option value="Rejected">❌ Rejected</option>
                        </select>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${admission.scholarshipStatus === 'Provided' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {admission.scholarshipStatus || 'Not Provided'}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditClick(admission)} className="p-2 text-blue-600 hover:bg-blue-50 rounded bg-blue-50/50 transition-colors tooltip relative group/btn flex items-center gap-1 font-bold text-xs">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => setAdmissionToDelete({ id: admission.id, name: admission.studentName || 'Unknown Student' })} className="p-2 text-red-600 hover:bg-red-50 rounded bg-red-50/50 transition-colors tooltip flex items-center gap-1 font-bold text-xs">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {admissionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 text-center">Delete Admission Record</h3>
              <p className="text-sm font-medium text-gray-600 text-center mt-2">
                Are you sure you want to permanently delete the admission record for <strong>{admissionToDelete.name}</strong>?
              </p>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setAdmissionToDelete(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 text-sm font-black text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm shadow-red-200"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
