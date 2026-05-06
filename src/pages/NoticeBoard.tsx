import React, { useState, useEffect, useRef } from 'react';
import { formatBSDate } from '../lib/nepaliDate';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, Timestamp, arrayUnion, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Megaphone, Pin, AlertCircle, FileText, Calendar, Clock, Eye, Edit2, Trash2, Copy, Archive, Plus, X, Search, Filter, Image as ImageIcon, Bold, Italic, List, Underline, ChevronRight, XCircle, CheckCircle } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const CLASSES = ['PG', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(c => `Class ${c}`);
const TARGET_OPTIONS = ['All', 'Admin Only', 'Students Only', 'Teachers Only', 'Guest User', ...CLASSES];

export default function NoticeBoard() {
  const role = auth.currentUser ? (localStorage.getItem('userRole') || 'student') : 'guest';
  const studentClass = localStorage.getItem('studentClass') || '';
  const currentUserId = auth.currentUser?.uid || 'guest';

  const [allNotices, setAllNotices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAudience, setFilterAudience] = useState('All');
  const [filterStatus, setFilterStatus] = useState(role === 'admin' ? 'Published' : 'All');
  
  const [loading, setLoading] = useState(true);

  // Create/Edit Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    priority: 'Normal',
    targets: ['Admin Only'],
    isPinned: false,
    status: 'Published'
  });

  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // For non-admins/teachers, we MUST filter by status=='Published' to satisfy security rules query check
      const isPrivileged = user && (role === 'admin' || role === 'teacher');
      
      let q = query(collection(db, 'notices'), orderBy('date', 'desc'));
      
      unsub = onSnapshot(q, (snap) => {
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!isPrivileged) {
           docs = docs.filter((d: any) => d.status === 'Published');
        }
        setAllNotices(docs);
        setLoading(false);
      }, (err: any) => {
        if (isPrivileged && err?.message?.includes('Missing or insufficient permissions')) {
          localStorage.removeItem('userRole');
          window.location.reload();
        } else {
          console.warn("NoticeBoard fetch error:", err.message);
          setLoading(false);
        }
      });
    });

    return () => { unsub(); unsubAuth(); };
  }, [role]);

  // Filter & Sort logic
  let visibleNotices = allNotices;

  // Role based filtering
  if (role !== 'admin') {
     visibleNotices = visibleNotices.filter(n => {
        if (n.status !== 'Published') return false;
        // Check Expiry
        if (n.validUntil && new Date(n.validUntil) < new Date()) return false;
        
        if (role === 'teacher') {
           return n.targets?.includes('All') || n.targets?.includes('Teachers Only');
        } else if (role === 'student') {
           return n.targets?.includes('All') || n.targets?.includes('Students Only') || n.targets?.includes(`Class ${studentClass}`);
        } else {
           // guest
           return n.targets?.includes('Guest User');
        }
     });
  }

  // Active User Filters
  if (searchQuery) {
     visibleNotices = visibleNotices.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }
  if (filterPriority !== 'All') {
     if (filterPriority === 'Unread') {
        visibleNotices = visibleNotices.filter(n => !n.readBy?.includes(currentUserId));
     } else {
        visibleNotices = visibleNotices.filter(n => n.priority === filterPriority);
     }
  }
  if (filterAudience !== 'All' && role === 'admin') {
     visibleNotices = visibleNotices.filter(n => n.targets?.includes(filterAudience));
  }
  if (role === 'admin' && filterStatus !== 'All') {
     visibleNotices = visibleNotices.filter(n => n.status === filterStatus);
  }

  // Sorting
  visibleNotices.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
      return 0; // fallback to original firebase datestamp order
  });

  const handleSaveNotice = async (statusOverride?: string) => {
      const finalStatus = statusOverride || formData.status;
      if (!formData.title || !formData.message || formData.targets.length === 0) {
          alert('Title, message and targets are required.');
          return;
      }
      
      const payload = {
          ...formData,
          status: finalStatus,
          timestamp: Timestamp.now(),
          authorId: currentUserId,
          readBy: [] // reset reads if drastically edited? No, keep it as is if editing
      };

      try {
          if (editingId) {
             const existing = allNotices.find(n => n.id === editingId);
             await updateDoc(doc(db, 'notices', editingId), { 
                 ...payload, 
                 readBy: existing?.readBy || [] 
             });
          } else {
             await addDoc(collection(db, 'notices'), payload);
          }
          setIsPanelOpen(false);
          setEditingId(null);
          alert(`Notice ${finalStatus.toLowerCase()} successfully!`);
      } catch (err) {
          console.error(err);
          alert('Error saving notice');
      }
  };

  const handleDuplicate = async (notice: any) => {
      try {
        const { id, readBy, views, timestamp, ...rest } = notice;
        await addDoc(collection(db, 'notices'), {
            ...rest,
            title: `${rest.title} (Copy)`,
            status: 'Draft',
            timestamp: Timestamp.now(),
            readBy: []
        });
      } catch (err) {
         console.error(err);
      }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Are you sure? This notice will be removed for all users.")) {
         await deleteDoc(doc(db, 'notices', id));
      }
  };

  const markAsRead = async (id: string, currentReadBy: string[]) => {
      if (!currentReadBy?.includes(currentUserId) && role !== 'admin') {
         if (currentUserId !== 'guest') {
             try {
                 await updateDoc(doc(db, 'notices', id), {
                     readBy: arrayUnion(currentUserId)
                 });
             } catch (err) {
                 console.warn("Could not mark as read remotely, updating locally only.");
             }
         }
      }
  };

  const openNoticePanel = (notice?: any) => {
      if (notice) {
          setEditingId(notice.id);
          setFormData({
              title: notice.title, message: notice.message, date: notice.date,
              validUntil: notice.validUntil || '', priority: notice.priority,
              targets: notice.targets || ['All'], isPinned: notice.isPinned || false,
              status: notice.status
          });
      } else {
          setEditingId(null);
          setFormData({
              title: '', message: '', date: new Date().toISOString().split('T')[0],
              validUntil: '', priority: 'Normal', targets: ['All'], isPinned: false, status: 'Published'
          });
      }
      setIsPanelOpen(true);
  };

  // Stats for Admin
  const totalPublished = allNotices.filter(n => n.status === 'Published').length;
  const urgentActive = allNotices.filter(n => n.priority === 'Urgent' && n.status === 'Published').length;
  const currentMonthCount = allNotices.filter(n => n.date.startsWith(new Date().toISOString().slice(0,7))).length;
  // A rough unread estimate for admin (assuming total students = 100 for now as an example, since we can't easily count total targeted users accurately without a huge query)
  // We'll just sum all missing reads based on a rough 50 student baseline for UI sake
  const unreadRoughCount = allNotices.reduce((acc, curr) => acc + (curr.status === 'Published' && curr.readBy?.length === 0 ? 1 : 0), 0);

  return (
    <div className="relative h-full flex flex-col pb-20 md:pb-0">
      
      {/* HEADER SECTION */}
      {role === 'admin' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2"><Megaphone className="w-5 h-5 text-blue-500"/><span className="text-sm font-bold text-gray-500">Total Published</span></div>
                <div className="text-2xl font-black text-gray-900">{totalPublished}</div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2"><AlertCircle className="w-5 h-5 text-red-500"/><span className="text-sm font-bold text-gray-500">Urgent Active</span></div>
                <div className="text-2xl font-black text-gray-900">{urgentActive}</div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2"><Calendar className="w-5 h-5 text-green-500"/><span className="text-sm font-bold text-gray-500">This Month</span></div>
                <div className="text-2xl font-black text-gray-900">{currentMonthCount}</div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2"><Eye className="w-5 h-5 text-orange-500"/><span className="text-sm font-bold text-gray-500">Zero Reads</span></div>
                <div className="text-2xl font-black text-gray-900">{unreadRoughCount}</div>
             </div>
          </div>
      ) : (
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h1 className="text-2xl font-bold text-gray-900">Notice Board {role === 'student' && studentClass ? `— ${studentClass}` : ''}</h1>
                <p className="text-sm text-gray-500 mt-1">Stay updated with the latest announcements.</p>
             </div>
             <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                {allNotices.filter(n => !n.readBy?.includes(currentUserId) && n.status === 'Published').length} New Notices
             </div>
          </div>
      )}

      {/* FILTER BAR SECTION */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search notices..." 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
         </div>
         <div className="flex overflow-x-auto gap-2 w-full pb-2 md:pb-0 scrollbar-hide">
            {['All', 'Urgent', 'Normal', 'Unread'].map(f => (
               <button 
                  key={f} 
                  onClick={() => setFilterPriority(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filterPriority === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               >
                 {f}
               </button>
            ))}
            {role === 'admin' && (
               <select 
                  className="px-4 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-gray-600 border-none outline-none appearance-none"
                  value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
               >
                  <option value="All">All Status</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
               </select>
            )}
         </div>
      </div>

      {/* NOTICES LIST */}
      <div className="flex flex-col gap-4">
         {loading ? (
             <div className="bg-white rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm border border-gray-200">
                 <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-gray-500 font-medium tracking-wide">Loading notices...</p>
             </div>
         ) : visibleNotices.length === 0 ? (
            <div className="bg-white rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm border border-gray-200">
               <FileText className="w-16 h-16 text-gray-300 mb-4" />
               <h3 className="text-xl font-bold text-gray-900 mb-1">No notices found</h3>
               <p className="text-gray-500">There are no notices matching your criteria right now. Check back later!</p>
            </div>
         ) : (
            visibleNotices.map(notice => {
               const isExpanded = expandedNoticeId === notice.id;
               const isUrgent = notice.priority === 'Urgent';
               const isUnread = !notice.readBy?.includes(currentUserId) && role !== 'admin';
               const isDraft = notice.status === 'Draft';

               return (
                 <div 
                    key={notice.id} 
                    className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden relative cursor-pointer ${isUrgent ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-blue-200'} ${isExpanded ? 'ring-2 ring-blue-500' : ''} `}
                    onClick={() => {
                        if (!isExpanded) {
                           setExpandedNoticeId(notice.id);
                        } else {
                           setExpandedNoticeId(null);
                        }
                    }}
                 >
                    {/* Left Border Accent */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUrgent ? 'bg-red-500' : isDraft ? 'bg-gray-400' : 'bg-blue-500'}`}></div>
                    
                    {/* Unread Dot */}
                    {isUnread && <div className="absolute right-4 top-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}

                    <div className="p-5 pl-6">
                       <div className="flex flex-wrap items-center gap-2 mb-2 pr-6">
                          {notice.isPinned && <Pin className="w-4 h-4 text-orange-500 fill-orange-500" />}
                          {isUrgent && <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">Urgent</span>}
                          {isDraft && <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">Draft</span>}
                          {notice.targets?.slice(0, 3).map((t: string) => (
                             <span key={t} className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded">{t}</span>
                          ))}
                          {notice.targets?.length > 3 && <span className="text-xs text-gray-500">+{notice.targets.length - 3} more</span>}
                       </div>

                       <h3 className={`text-lg font-bold mb-1 pr-6 ${isUrgent ? 'text-red-900' : 'text-gray-900'}`}>{notice.title}</h3>
                       
                       <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-3 gap-2 flex-wrap">
                          <div className="flex items-center gap-4">
                             <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>Posted: {formatBSDate(notice.date)}</span>
                             {notice.validUntil && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>Valid until: {formatBSDate(notice.validUntil)}</span>}
                          </div>
                          {isUnread && (
                             <button
                               onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notice.id, notice.readBy || []);
                               }}
                               className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full font-bold transition-colors shrink-0 flex items-center gap-1"
                             >
                                <CheckCircle className="w-3.5 h-3.5" /> Mark as Read
                             </button>
                          )}
                       </div>

                       {isExpanded ? (
                          <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in-0 duration-300">
                             <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: notice.message }}></div>
                             
                             {/* Admin Actions */}
                             {role === 'admin' && (
                                <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                                   <button onClick={() => openNoticePanel(notice)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-bold transition-colors"><Edit2 className="w-4 h-4"/> Edit</button>
                                   <button onClick={() => handleDuplicate(notice)} className="flex items-center gap-1.5 px-3 py-1.5 text-primary text-gray-600 hover:bg-gray-100 rounded text-sm font-bold transition-colors"><Copy className="w-4 h-4"/> Duplicate</button>
                                   <button onClick={() => handleDelete(notice.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-sm font-bold transition-colors ml-auto"><Trash2 className="w-4 h-4"/> Delete</button>
                                </div>
                             )}
                          </div>
                       ) : (
                          <div className="text-sm text-gray-600 line-clamp-2 mt-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: notice.message }}></div>
                       )}
                    </div>
                 </div>
               );
            })
         )}
      </div>

      {/* ADMIN FLOATING CREATE BUTTON */}
      {role === 'admin' && (
         <button 
            onClick={() => openNoticePanel()}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_8px_30px_rgba(37,99,235,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
         >
            <Plus className="w-6 h-6" />
         </button>
      )}

      {/* CREATE/EDIT PANEL (Drawer on Desktop, Modal on Mobile) */}
      {isPanelOpen && role === 'admin' && (
         <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm animate-in fade-in-0">
            <div className="bg-white w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
               {/* Header */}
               <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0 text-primary">
                  <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Notice' : 'Create New Notice'}</h2>
                  <button onClick={() => setIsPanelOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               {/* Scrollable Form */}
               <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Notice Title <span className="text-red-500">*</span></label>
                     <input 
                        type="text" 
                        maxLength={100}
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Annual Sports Day 2081 Announcement"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                     />
                     <div className="text-right text-xs text-gray-400 mt-1">{formData.title.length}/100</div>
                  </div>

                  <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Notice Date</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                     </div>
                     <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Valid Until (Optional)</label>
                        <input type="date" value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                     </div>
                  </div>

                  {/* Priority & Pins row */}
                  <div className="flex flex-wrap gap-4 p-4 border-primary text-primary rounded-xl border border-gray-100">
                     <div className="flex-1 min-w-[150px]">
                         <label className="block text-sm font-bold text-gray-700 mb-2">Priority Level</label>
                         <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
                             <button onClick={() => setFormData({...formData, priority: 'Normal'})} className={`flex-1 py-1.5 text-sm font-bold ${formData.priority === 'Normal' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:opacity-90'}`}>Normal</button>
                             <button onClick={() => setFormData({...formData, priority: 'Urgent'})} className={`flex-1 py-1.5 text-sm font-bold ${formData.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:opacity-90'}`}>Urgent</button>
                         </div>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-auto md:ml-auto">
                        <input type="checkbox" id="pinnedStatus" checked={formData.isPinned} onChange={e => setFormData({...formData, isPinned: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                        <label htmlFor="pinnedStatus" className="text-sm font-bold text-gray-700 flex items-center gap-1 cursor-pointer select-none"><Pin className="w-4 h-4 text-orange-500"/> Pin Notice to Top</label>
                     </div>
                  </div>

                  {/* Target Audience */}
                  <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Target Audience <span className="text-red-500">*</span></label>
                     <div className="flex flex-wrap gap-2">
                        {TARGET_OPTIONS.map(opt => (
                           <button 
                             key={opt}
                             onClick={() => {
                                 let newTargets = [...formData.targets];
                                 if (opt === 'All') { 
                                    newTargets = newTargets.filter(t => t === 'Guest User'); 
                                    newTargets.push('All'); 
                                 }
                                 else if (opt === 'Guest User') {
                                    if (newTargets.includes('Guest User')) {
                                       newTargets = newTargets.filter(t => t !== 'Guest User');
                                    } else {
                                       newTargets.push('Guest User');
                                    }
                                 }
                                 else {
                                    newTargets = newTargets.filter(t => t !== 'All'); 
                                    if (newTargets.includes(opt)) newTargets = newTargets.filter(t => t !== opt);
                                    else newTargets.push(opt);
                                 }
                                 if (newTargets.length === 0) newTargets = ['Admin Only'];
                                 setFormData({...formData, targets: newTargets});
                             }}
                             className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${formData.targets.includes(opt) ? 'bg-gray-800 text-white border-gray-800 scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                           >
                              {opt}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Rich Text Area */}
                  <div className="flex flex-col flex-1 min-h-[250px]">
                     <label className="block text-sm font-bold text-gray-700 mb-1">Message Body <span className="text-red-500">*</span></label>
                     <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col flex-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                        <ReactQuill
                           theme="snow"
                           value={formData.message}
                           onChange={(content) => setFormData({...formData, message: content})}
                           className="flex-1 w-full h-[300px] mb-12"
                           modules={{
                              toolbar: [
                                ['bold', 'italic', 'underline'],
                                [{'list': 'ordered'}, {'list': 'bullet'}, { 'align': [] }],
                              ]
                           }}
                        />
                     </div>
                  </div>
               </div>

               {/* Footer */}
               <div className="border-t border-gray-100 p-4 bg-white shrink-0 flex justify-end gap-3 rounded-b-xl">
                  {formData.status === 'Draft' || !editingId ? (
                      <button onClick={() => handleSaveNotice('Draft')} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm transition-colors">
                         Save Draft
                      </button>
                  ) : null}
                  <button onClick={() => handleSaveNotice('Published')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-md transition-colors selection:flex items-center gap-2">
                     Publish Notice
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
