import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Camera, AlertCircle, CheckCircle2, LogOut, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { updatePassword, signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Profile() {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  
  const userRole = localStorage.getItem('userRole') || 'student';

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             const data = docSnap.data();
             let fetchName = data.fullName || data.name || '';
             let fetchPhone = data.phone || '';
             let fetchAddress = data.address || '';
             let fetchDob = data.dob || '';
             let fetchClass = data.class || data.studentClass || data.role || '';
             let fetchStudentId = data.studentId || '';
             let fetchGuardianName = data.guardianName || '';
             let fetchGuardianPhone = data.guardianPhone || '';

             if (data.children && data.children.length > 0) {
               fetchName = fetchName || data.children[0].name || '';
               fetchPhone = fetchPhone || data.children[0].phone || '';
               fetchAddress = fetchAddress || data.children[0].address || '';
               fetchDob = fetchDob || data.children[0].dob || '';
               fetchClass = fetchClass || data.children[0].studentClass || '';
               fetchStudentId = fetchStudentId || data.children[0].studentId || '';
             }
             setName(fetchName || auth.currentUser.email || '');
             setEmail(auth.currentUser.email || data.email || '');
             setPhone(fetchPhone);
             setAddress(fetchAddress);
             setDob(fetchDob);
             setStudentClass(fetchClass);
             setStudentId(fetchStudentId);
             setGuardianName(fetchGuardianName);
             setGuardianPhone(fetchGuardianPhone);
             setAvatarUrl(data.avatarUrl || '');
          } else if (auth.currentUser) {
            setEmail(auth.currentUser.email || '');
            setName(auth.currentUser.email || '');
          }
        } catch (e) {
          console.error("Error fetching profile", e);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (auth.currentUser) {
        // Update avatar and name in Firestore
        const docRef = doc(db, 'users', auth.currentUser.uid);
        
        const updateData: any = {
          avatarUrl: avatarUrl,
          fullName: name,
          phone: phone,
          address: address,
          dob: dob,
        };

        if (userRole === 'student') {
          updateData.class = studentClass;
          updateData.studentId = studentId;
          updateData.guardianName = guardianName;
          updateData.guardianPhone = guardianPhone;
        }

        await updateDoc(docRef, updateData);

        setMessage('Profile updated successfully!');
      } else {
        throw new Error('No authenticated user found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found');
      if (!user.email) throw new Error('User email not found');
      if (!currentPassword) throw new Error('Current password is required');
      if (!password) throw new Error('New password cannot be empty');
      if (password !== confirmPassword) throw new Error('New passwords do not match');
      
      if (password.length < 8) throw new Error('New password must be at least 8 characters');
      if (!/[A-Z]/.test(password)) throw new Error('New password must contain at least one uppercase letter');
      if (!/[a-z]/.test(password)) throw new Error('New password must contain at least one lowercase letter');
      if (!/[0-9]/.test(password)) throw new Error('New password must contain at least one number');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await reauthenticateWithCredential(user, credential);
      } catch (authError: any) {
        throw new Error('Current password does not match.');
      }

      await updatePassword(user, password);
      
      // Log out and redirect
      await signOut(auth);
      localStorage.removeItem('userRole');
      window.location.href = '/login'; // hard redirect to wipe state and go to login

    } catch (err: any) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-[#1e3a8a] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3 relative z-10">
          <User className="w-8 h-8 opacity-80" /> My Profile
        </h1>
        <p className="text-blue-200 font-medium relative z-10">Manage your avatar and security preferences.</p>
      </div>

      {(message || error) && (
        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold shadow-sm ${message ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
           {message ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5" />}
           {message || error}
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 relative z-10">
        <form onSubmit={handleUpdateProfile} className="space-y-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-300" />
                )}
              </div>
            </div>
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Avatar Image URL (Optional)</label>
              <div className="relative">
                <Camera className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Details Section */}
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Email</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 outline-none cursor-not-allowed"
                      value={email}
                      readOnly
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Phone</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Address</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                 </div>
                 
                 {userRole === 'student' && (
                   <>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Class</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Student ID</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Guardian Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Guardian Phone</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-blue-500"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                        />
                     </div>
                   </>
                 )}
                 {(userRole === 'admin' || userRole === 'teacher') && (
                   <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Role</label>
                     <input
                       type="text"
                       className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 outline-none cursor-not-allowed capitalize"
                       value={userRole}
                       readOnly
                     />
                   </div>
                 )}
             </div>
          </div>

          <div className="pt-2 flex flex-col md:flex-row gap-4 items-center">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 w-full px-8 py-3.5 bg-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Profile</>}
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 w-full px-8 py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-gray-500" /> Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                 <Lock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Change Password</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Requires re-login</p>
              </div>
            </div>

            {pwdError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl mb-6 flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" /> {pwdError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="w-full px-6 py-3.5 bg-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pwdLoading ? 'Updating...' : <><LogOut className="w-4 h-4" /> Update & Logout</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

