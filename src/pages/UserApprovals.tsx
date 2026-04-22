import React, { useState, useEffect } from 'react';
import { Shield, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, updateDoc } from 'firebase/firestore';

export default function UserApprovals() {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  
  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList: any[] = [];
      snapshot.forEach((docSnap) => {
        uList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsersList(uList);
      setIsUsersLoading(false);
    }, (error) => {
      console.error("Firebase read users error:", error);
      setStatus({ type: 'error', message: 'Failed to fetch users. You might not have permission.' });
      setIsUsersLoading(false);
    });
    return () => unsubUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to upgrade this user to ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setStatus({ type: 'success', message: `User role upgraded to ${newRole} successfully.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to upgrade user role.' });
    }
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  const getFilteredUsers = () => {
    if (!userSearchQuery) return usersList;
    return usersList.filter(u => {
      const emailMatch = String(u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());
      const roleMatch = String(u.role || '').toLowerCase().includes(userSearchQuery.toLowerCase());
      const phoneMatch = String(u.phone || '').toLowerCase().includes(userSearchQuery.toLowerCase());
      return emailMatch || roleMatch || phoneMatch;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#e5e7eb] pb-4 mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1f2937] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#3b82f6]" />
              Staff & User Management
            </h2>
            <p className="text-xs text-[#64748b] mt-1">Upgrade user roles (like "student" to "teacher") and manage staff access.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by email or role..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#cbd5e1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] bg-[#f8fafc]"
            />
          </div>
        </div>

        {status.type && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
            status.type === 'success' ? 'bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]' : 'bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {status.message}
          </div>
        )}

        {isUsersLoading ? (
          <div className="p-8 text-center text-[#64748b]">Loading users database...</div>
        ) : (
          <div className="border border-[#e5e7eb] rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                  <th className="p-3 font-bold text-[#475569]">Email</th>
                  <th className="p-3 font-bold text-[#475569]">Role</th>
                  <th className="p-3 font-bold text-[#475569] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {getFilteredUsers().length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-[#64748b]">No users found matching your search.</td>
                  </tr>
                )}
                {getFilteredUsers().map(user => (
                  <tr key={user.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="p-3 font-medium text-[#1f2937]">{user.email || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${
                        user.role === 'admin' ? 'bg-[#fee2e2] text-[#991b1b]' :
                        user.role === 'teacher' ? 'bg-[#fef3c7] text-[#92400e]' :
                        'bg-[#e0f2fe] text-[#0369a1]'
                      }`}>
                        {user.role || 'student'}
                      </span>
                    </td>
                    <td className="p-3 flex justify-end gap-2">
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => updateUserRole(user.id, 'admin')}
                          className="text-xs bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] px-3 py-1 rounded hover:bg-[#fee2e2] transition-colors font-bold"
                        >
                          Make Admin
                        </button>
                      )}
                      {user.role !== 'teacher' && (
                        <button 
                          onClick={() => updateUserRole(user.id, 'teacher')}
                          className="text-xs bg-[#fffbeb] text-[#92400e] border border-[#fde68a] px-3 py-1 rounded hover:bg-[#fef3c7] transition-colors font-bold"
                        >
                          Make Teacher
                        </button>
                      )}
                      {user.role !== 'student' && (
                        <button 
                          onClick={() => updateUserRole(user.id, 'student')}
                          className="text-xs bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] px-3 py-1 rounded hover:bg-[#e0f2fe] transition-colors font-bold"
                        >
                          Revoke Staff
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
