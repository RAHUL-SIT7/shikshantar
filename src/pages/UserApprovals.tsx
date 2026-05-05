import React, { useState, useEffect } from 'react';
import { Shield, Search, CheckCircle2, AlertCircle, User, Mail, Smartphone, BadgeCheck, MoreHorizontal, Trash2, Edit3, X, Filter, UserPlus, Users, UserCheck, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, collection, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize a secondary Firebase app to create users without signing out the admin
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

interface UserProfile {
  id: string;
  email?: string;
  role?: 'student' | 'teacher' | 'admin';
  fullName?: string;
  phone?: string;
  studentId?: string;
  class?: string;
  active?: boolean;
  status?: string;
}

export default function UserApprovals() {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    let unsubUsers = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const uList: UserProfile[] = [];
          snapshot.forEach((docSnap) => {
            uList.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
          });
          setUsersList(uList);
          setIsUsersLoading(false);
        }, (error) => {
          console.error("Firebase read users error:", error);
          setStatus({ type: 'error', message: 'Failed to fetch users database.' });
          setIsUsersLoading(false);
        });
      } else {
        setUsersList([]);
        setIsUsersLoading(false);
      }
    });

    return () => { unsubUsers(); unsubAuth(); };
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.role === 'student' && editingUser.studentId) {
      if (!/^SA\d+([A-Z]*\d*)*$/i.test(editingUser.studentId)) {
        setStatus({ type: 'error', message: 'Student ID must follow the format SA[Class][Roll Number] (e.g., SA1001)' });
        setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        return;
      }
    }

    try {
      const { id, ...updateData } = editingUser;
      await updateDoc(doc(db, 'users', id), updateData as any);
      setStatus({ type: 'success', message: `User ${editingUser.fullName || editingUser.email} updated successfully.` });
      setEditingUser(null);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to update user details.' });
    }
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  const setRole = async (userId: string, newRole: 'admin' | 'teacher' | 'student') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setStatus({ type: 'success', message: `Role changed to ${newRole}.` });
    } catch (error) {
      setStatus({ type: 'error', message: 'Update failed.' });
    }
    setTimeout(() => setStatus({ type: null, message: '' }), 3000);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setStatus({ type: 'success', message: 'User profile deleted successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete user.' });
    }
    setUserToDelete(null);
    setTimeout(() => setStatus({ type: null, message: '' }), 6000);
  };

  const getFilteredUsers = () => {
    return usersList.filter(u => {
      const matchesSearch = 
        String(u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.studentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.phone || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const isPending = u.status === 'pending';
      let matchesRole = false;
      if (roleFilter === 'all') matchesRole = true;
      else if (roleFilter === 'pending') matchesRole = isPending;
      else matchesRole = u.role === roleFilter && !isPending;
      
      return matchesSearch && matchesRole;
    });
  };

  const stats = {
    total: usersList.filter(u => u.status !== 'pending').length,
    teachers: usersList.filter(u => u.role === 'teacher' && u.status !== 'pending').length,
    admins: usersList.filter(u => u.role === 'admin' && u.status !== 'pending').length,
    students: usersList.filter(u => u.role === 'student' && u.status !== 'pending').length,
    pending: usersList.filter(u => u.status === 'pending').length,
  };

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'teacher' as const,
    phone: '',
    class: '',
    studentId: '',
    guardianName: '',
    address: '',
    section: '',
    scholarshipStatus: 'Not Provided',
    scholarshipAmount: 0
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      setStatus({ type: 'error', message: 'A valid Email is mandatory.' });
      return;
    }

    if (!newUser.password || newUser.password.length < 8 || !/[A-Z]/.test(newUser.password) || !/[a-z]/.test(newUser.password) || !/[0-9]/.test(newUser.password)) {
       setStatus({ type: 'error', message: 'Password must be at least 8 characters long, and contain an uppercase letter, lowercase letter, and a number.' });
       return;
    }

    if (!newUser.fullName) {
      setStatus({ type: 'error', message: 'Full Legal Name is mandatory.' });
      return;
    }

    if (!newUser.phone || !/^(98|97)\d{8}$/.test(newUser.phone)) {
      setStatus({ type: 'error', message: 'Phone number is mandatory, must be 10 digits and start with 98 or 97.' });
      return;
    }

    if (!newUser.address) {
      setStatus({ type: 'error', message: 'Address is mandatory.' });
      return;
    }

    if (!newUser.guardianName) {
      setStatus({ type: 'error', message: 'Guardian / Parent\'s Name is mandatory.' });
      return;
    }

    if (newUser.role === 'student') {
      if (!newUser.studentId) {
        setStatus({ type: 'error', message: 'Student ID is mandatory for students.' });
        return;
      }
      if (!/^SA\d+([A-Z]*\d*)*$/i.test(newUser.studentId)) {
        setStatus({ type: 'error', message: 'Student ID must follow the format SA[Class][Roll Number] (e.g., SA1001)' });
        return;
      }
      if (!newUser.class) {
        setStatus({ type: 'error', message: 'Assigned Class is mandatory for students.' });
        return;
      }
    } else {
      if (!newUser.studentId) {
        setStatus({ type: 'error', message: 'Staff ID is mandatory.' });
        return;
      }
    }

    setIsCreating(true);
    try {
      // Create user auth account without signing current admin out
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      const docId = userCredential.user.uid;
      
      // Store in users collection
      const userProfilePayload: any = {
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        active: true,
        createdAt: new Date().toISOString()
      };
      if (newUser.phone) userProfilePayload.phone = `+977-${newUser.phone}`;
      if (newUser.studentId) userProfilePayload.studentId = newUser.studentId;
      if (newUser.class) userProfilePayload.class = newUser.class;
      if (newUser.guardianName) userProfilePayload.guardianName = newUser.guardianName;
      if (newUser.address) userProfilePayload.address = newUser.address;
      if (newUser.section) userProfilePayload.section = newUser.section;

      if (newUser.role === 'student') {
        userProfilePayload.scholarshipStatus = newUser.scholarshipStatus;
        if (newUser.scholarshipStatus === 'Provided') {
          userProfilePayload.scholarshipAmount = Number(newUser.scholarshipAmount) || 0;
        } else {
          userProfilePayload.scholarshipAmount = 0;
        }
      }

      await setDoc(doc(db, 'users', docId), userProfilePayload);
      
      // Immediately sign out the secondary auth so it can be used again cleanly
      await secondaryAuth.signOut();

      setStatus({ type: 'success', message: `${newUser.role.toUpperCase()} account created successfully. They can now log in.` });
      setIsCreatingUser(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'teacher', phone: '', class: '', studentId: '', guardianName: '', address: '', section: '' });
    } catch (error: any) {
      console.error(error);
      let errMsg = error.message || 'Failed to create user account.';
      if (error.code === 'auth/email-already-in-use' || String(error.message).includes('auth/email-already-in-use')) {
         errMsg = 'An account with this email address already exists. Please use a different email.';
      }
      setStatus({ type: 'error', message: errMsg });
    } finally {
      setIsCreating(false);
    }
    setTimeout(() => setStatus({ type: null, message: '' }), 4000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1e3a8a] flex items-center gap-2">
            <Shield className="w-8 h-8 text-orange-500" />
            Administrative User Management
          </h1>
          <p className="text-gray-500 font-medium">Control system access, roles, and administrative privileges.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
            <p className="text-xl font-black text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-center min-w-[100px] cursor-pointer" onClick={() => setRoleFilter('pending')}>
            <p className="text-[10px] font-bold text-red-500 uppercase">Pending</p>
            <p className="text-xl font-black text-gray-800">{stats.pending}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-blue-500 uppercase">Teachers</p>
            <p className="text-xl font-black text-gray-800">{stats.teachers}</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-orange-500 uppercase">Admins</p>
            <p className="text-xl font-black text-gray-800">{stats.admins}</p>
          </div>
        </div>
      </div>

      {status.type && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] p-4 min-w-[300px] rounded-xl flex items-center justify-between text-sm font-bold shadow-2xl animate-in slide-in-from-top duration-300 ${
          status.type === 'success' ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{status.message}</span>
          </div>
          <button type="button" onClick={() => setStatus({type: null, message: ''})} className="ml-4 p-1 hover:bg-black/5 rounded"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* Main Container */}
      <section className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name, email, ID or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsCreatingUser(true)}
              className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1e40af] transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add New User</span>
            </button>
            <div className="flex items-center gap-2 bg-white px-3 py-2 border border-gray-200 rounded-xl">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-sm font-bold text-gray-700 focus:outline-none bg-transparent"
              >
                <option value="all">All Roles</option>
                <option value="pending">Pending Approvals</option>
                <option value="admin">Administrators</option>
                <option value="teacher">Teachers</option>
                <option value="student">Students</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto min-h-[400px]">
          {isUsersLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold animate-pulse">Loading Identity Data...</p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="p-4 px-6 uppercase tracking-wider">User Information</th>
                  <th className="p-4 px-6 uppercase tracking-wider">Contact & ID</th>
                  <th className="p-4 px-6 uppercase tracking-wider">System Role</th>
                  <th className="p-4 px-6 text-right uppercase tracking-wider">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {getFilteredUsers().length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-gray-400">
                       <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
                       <p className="font-bold">No users found matching your filters</p>
                    </td>
                  </tr>
                ) : getFilteredUsers().map(user => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                          user.role === 'admin' ? 'bg-orange-500' : user.role === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}>
                          {user.fullName ? user.fullName.charAt(0) : user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-[0.9rem] flex items-center gap-1">
                            {user.fullName || 'New User'}
                            {user.role === 'admin' && <ShieldCheck className="w-3 h-3 text-orange-500" />}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 px-6">
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-gray-600 flex items-center gap-1"><Smartphone className="w-3 h-3 text-gray-400" /> {user.phone || '--'}</p>
                        <p className="text-gray-400">ID: <span className="text-blue-600 font-mono font-bold capitalize">{user.studentId || 'N/A'}</span></p>
                      </div>
                    </td>
                    <td className="p-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider w-fit border ${
                          user.status === 'pending' ? 'bg-red-50 text-red-700 border-red-200' :
                          user.role === 'admin' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          user.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {user.status === 'pending' ? 'PENDING APPROVAL' : user.role}
                        </span>
                        {user.class && <span className="text-[10px] text-gray-400 font-bold ml-1">Class {user.class}</span>}
                      </div>
                    </td>
                    <td className="p-4 px-6 text-right">
                       <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setViewingUser(user)}
                            className="p-1.5 bg-gray-100 hover:bg-emerald-100 text-gray-500 hover:text-emerald-700 rounded-lg transition-all"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-700 rounded-lg transition-all"
                            title="Edit Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <div className="w-px h-4 bg-gray-200 mx-1"></div>
                          
                          {user.status === 'pending' ? (
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'users', user.id), { status: 'active' });
                                  setStatus({ type: 'success', message: 'User approved securely.' });
                                } catch (e) {
                                  setStatus({ type: 'error', message: 'Failed to approve.' });
                                }
                              }}
                              className="px-3 py-1 bg-green-500 text-white font-bold text-xs rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Approve
                            </button>
                          ) : user.role === 'admin' ? (
                            <div className="px-3 py-1 bg-gray-100 text-gray-500 font-bold text-xs rounded-lg">Admin</div>
                          ) : (
                            <div className="flex gap-1">
                               <button 
                                 onClick={() => setRole(user.id, 'admin')} 
                                 disabled={user.role === 'admin'}
                                 className={`px-2 py-1 text-[9px] font-black rounded border transition-all ${user.role === 'admin' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200 hover:bg-orange-50'}`}
                               >ADM</button>
                               <button 
                                 onClick={() => setRole(user.id, 'teacher')} 
                                 disabled={user.role === 'teacher'}
                                 className={`px-2 py-1 text-[9px] font-black rounded border transition-all ${user.role === 'teacher' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-500 border-blue-200 hover:bg-blue-50'}`}
                               >TCH</button>
                               <button 
                                 onClick={() => setRole(user.id, 'student')} 
                                 disabled={user.role === 'student'}
                                 className={`px-2 py-1 text-[9px] font-black rounded border transition-all ${user.role === 'student' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-500 border-emerald-200 hover:bg-emerald-50'}`}
                               >STD</button>
                            </div>
                          )}

                          {user.role !== 'admin' && (
                            <button 
                              onClick={() => setUserToDelete({ id: user.id, name: user.fullName || user.email || '' })}
                              className="p-1.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all ml-2"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 relative">
              <h2 className="text-xl font-black flex items-center gap-2">
                <User className="w-6 h-6" /> User Profile
              </h2>
              <p className="text-emerald-100 text-xs font-medium mt-1">Detailed identity information</p>
              <button 
                onClick={() => setViewingUser(null)} 
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-sm ${
                  viewingUser.role === 'admin' ? 'bg-orange-500' : viewingUser.role === 'teacher' ? 'bg-blue-500' : 'bg-emerald-500'
                }`}>
                  {viewingUser.fullName ? viewingUser.fullName.charAt(0) : viewingUser.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewingUser.fullName || 'No Name Provided'}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      viewingUser.role === 'admin' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      viewingUser.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {viewingUser.role}
                    </span>
                    {viewingUser.class && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-bold">Class {viewingUser.class}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
                  <p className="font-medium text-gray-800 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400"/> {viewingUser.email}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Phone</p>
                  <p className="font-medium text-gray-800 flex items-center gap-2"><Smartphone className="w-4 h-4 text-gray-400"/> {viewingUser.phone || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">School Identification</p>
                  <p className="font-mono font-bold text-blue-600 flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-gray-400"/> {viewingUser.studentId || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Status</p>
                  <p className="font-medium text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> {viewingUser.active !== false ? 'Active' : 'Inactive'}</p>
                </div>
              </div>

              <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100">
                <button 
                  onClick={() => setViewingUser(null)} 
                  className="w-full py-3.5 text-sm font-black bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-2xl transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#1e3a8a] text-white p-6 relative shrink-0">
              <h2 className="text-xl font-black">Edit User Profile</h2>
              <p className="text-blue-200 text-xs font-medium">Updating identity of {editingUser.email}</p>
              <button 
                onClick={() => setEditingUser(null)} 
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editingUser.fullName || ''}
                    onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" 
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={editingUser.phone || ''}
                    onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" 
                    placeholder="+977-..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">System Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 appearance-none"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Designated Class</label>
                  <input 
                    type="text" 
                    value={editingUser.class || ''}
                    onChange={e => setEditingUser({...editingUser, class: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" 
                    placeholder="e.g. 10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">School Identification (ID)</label>
                <input 
                  type="text" 
                  value={editingUser.studentId || ''}
                  onChange={e => setEditingUser({...editingUser, studentId: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-600" 
                  placeholder="EX: SA-2024-001"
                />
              </div>

              {editingUser.role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Scholarship Status</label>
                    <select 
                      value={editingUser.scholarshipStatus || 'Not Provided'}
                      onChange={e => setEditingUser({...editingUser, scholarshipStatus: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 appearance-none"
                    >
                      <option value="Not Provided">Not Provided</option>
                      <option value="Provided">Provided</option>
                    </select>
                  </div>
                  {editingUser.scholarshipStatus === 'Provided' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Discount Amount/Month (NRs.)</label>
                      <input 
                        type="number" 
                        value={editingUser.scholarshipAmount || ''}
                        onChange={e => setEditingUser({...editingUser, scholarshipAmount: Number(e.target.value)})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" 
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)} 
                  className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 text-sm font-black bg-[#1e3a8a] text-white rounded-2xl shadow-lg hover:bg-[#1e40af] transition-transform active:scale-95"
                >
                  Save Profile Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreatingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#1e3a8a] text-white p-6 relative shrink-0">
              <button 
                onClick={() => setIsCreatingUser(false)} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5"/>
              </button>
              <h3 className="text-xl font-black pr-10">Register New System Profile</h3>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Initialize account for student or staff</p>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Email (Required)</label>
                  <input 
                    required
                    type="email" 
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    placeholder="official@school.com"
                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none"
                  />
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Temporary Password (Required)</label>
                  <div className="relative">
                    <input 
                      required
                      type={showTempPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Set initial password"
                      className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 pr-12 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowTempPassword(!showTempPassword)} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 focus:outline-none"
                    >
                      {showTempPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name (Required)</label>
                  <input 
                    required
                    type="text" 
                    value={newUser.fullName}
                    onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                    placeholder="Enter full name"
                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student ID / Staff ID (Required)</label>
                  <input 
                    required
                    type="text" 
                    value={newUser.studentId}
                    onChange={e => setNewUser({...newUser, studentId: e.target.value})}
                    placeholder="ID Number (e.g. 1001)"
                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Class (Required for Students)</label>
                  <input 
                    type="text" 
                    value={newUser.class}
                    onChange={e => setNewUser({...newUser, class: e.target.value})}
                    placeholder="e.g. 10"
                    disabled={newUser.role !== 'student'}
                    className={`w-full ${newUser.role !== 'student' ? 'bg-gray-100 text-gray-400' : 'bg-gray-50'} border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Section/Division (Optional)</label>
                  <input 
                    type="text" 
                    value={newUser.section}
                    onChange={e => setNewUser({...newUser, section: e.target.value})}
                    placeholder="e.g. A"
                    disabled={newUser.role !== 'student'}
                    className={`w-full ${newUser.role !== 'student' ? 'bg-gray-100 text-gray-400' : 'bg-gray-50'} border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Guardian / Parent's Name (Required)</label>
                  <input 
                    required
                    type="text" 
                    value={newUser.guardianName}
                    onChange={e => setNewUser({...newUser, guardianName: e.target.value})}
                    placeholder="Enter parent's name"
                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address (Required)</label>
                  <input 
                    required
                    type="text" 
                    value={newUser.address}
                    onChange={e => setNewUser({...newUser, address: e.target.value})}
                    placeholder="Enter permanent address"
                    className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Phone (Required)</label>
                  <div className="flex bg-gray-50 border-gray-100 border rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <div className="px-4 py-4 bg-gray-100 text-gray-500 font-bold text-sm border-r border-gray-200">
                      +977
                    </div>
                    <input 
                      required
                      type="text" 
                      value={newUser.phone}
                      onChange={e => setNewUser({...newUser, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      placeholder="98********"
                      className="w-full bg-transparent px-5 py-4 text-sm font-bold text-gray-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {newUser.role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Scholarship Status</label>
                    <select 
                      value={newUser.scholarshipStatus || 'Not Provided'}
                      onChange={e => setNewUser({...newUser, scholarshipStatus: e.target.value})}
                      className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none appearance-none"
                    >
                      <option value="Not Provided">Not Provided</option>
                      <option value="Provided">Provided</option>
                    </select>
                  </div>
                  {newUser.scholarshipStatus === 'Provided' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Discount Amount/Month (NRs.)</label>
                      <input 
                        type="number" 
                        value={newUser.scholarshipAmount || ''}
                        onChange={e => setNewUser({...newUser, scholarshipAmount: Number(e.target.value)})}
                        className="w-full bg-gray-50 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all border outline-none" 
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsCreatingUser(false)} 
                  className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors disabled:opacity-50"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-4 text-sm font-black bg-[#1e3a8a] text-white rounded-2xl shadow-lg hover:bg-[#1e40af] transition-transform active:scale-95 disabled:opacity-70"
                >
                  {isCreating ? 'Creating...' : 'Initialize User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 text-center">Delete User Account</h3>
              <p className="text-sm font-medium text-gray-600 text-center mt-2">
                Are you sure you want to permanently delete the profile for <strong>{userToDelete.name}</strong>?
              </p>
            </div>
            <div className="p-6 bg-red-50/30 text-xs font-bold text-red-800 text-center border-b border-red-100">
              Note: This removes their profile from the database, but their login credentials must be manually deleted from your Firebase Auth Console if you want to completely block sign-ins.
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteUser}
                className="flex-1 py-3 text-sm font-black text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm shadow-red-200"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
