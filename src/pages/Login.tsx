import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User, Phone, MapPin, Calendar, BookOpen, ArrowLeft } from 'lucide-react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

type Role = 'student' | 'teacher' | 'admin';
type View = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export default function Login({ setIsAuthenticated }: { setIsAuthenticated: (val: boolean) => void }) {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('login');
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  
  // OTP State
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Registration specific fields
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const code = searchParams.get('oobCode');
    if (mode === 'resetPassword' && code) {
      setOobCode(code);
      setView('reset');
    }
  }, [searchParams]);

  const validatePhone = (num: string) => {
    return /^(98|97)\d{8}$/.test(num);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        setView('verify');
        setLoading(false);
        return;
      }

      // Store role in localStorage since we can't use Firestore yet
      localStorage.setItem('userRole', role);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      setError('Email or password is incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Phone number must be 10 digits and start with 98 or 97');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      
      // Store role temporarily to know what they registered as
      localStorage.setItem('userRole', role);
      
      // Sign out immediately as per requirements
      await signOut(auth);
      
      setView('verify');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('User already exists. Please sign in');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!oobCode) {
      setError('Invalid or missing reset code.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage('Password has been reset successfully! You can now log in.');
      setTimeout(() => {
        setView('login');
        setPassword('');
        setConfirmPassword('');
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      localStorage.setItem('userRole', role);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phone.startsWith('+') ? phone : `+977${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setMessage('OTP sent to your phone!');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otpCode);
      setMessage('Phone verified successfully! You can now reset your password.');
      setView('reset');
    } catch (err: any) {
      setError('Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'verify') {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" 
            alt="School Background" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-xl p-8 shadow-lg border border-white/40 text-center relative z-10">
          <Mail className="w-16 h-16 text-[#1e3a8a] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Verify Your Email</h2>
          <p className="text-[#4b5563] mb-6">
            We have sent you a verification email to <span className="font-bold text-[#1f2937]">{email}</span>. Please verify it and log in.
          </p>
          <button
            onClick={() => {
              setView('login');
              setPassword('');
            }}
            className="w-full bg-[#1e3a8a] text-white font-medium py-3 px-4 rounded-lg hover:bg-[#1e3a8a]/90 transition-colors shadow-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" 
          alt="School Background" 
          className="w-full h-full object-cover opacity-30"
        />
      </div>

      <div className="w-full max-w-md bg-white/75 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/50 relative z-10 my-8">
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 bg-[#1e3a8a] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#1f2937]">
            {view === 'forgot' && 'Reset Password'}
            {view === 'reset' && 'Create New Password'}
            {(view === 'login' || view === 'register') && 'Welcome to Shikshantar Academy'}
          </h2>
          <p className="text-sm text-[#4b5563] mt-1 font-medium">
            {view === 'login' && 'Sign in to your account'}
            {view === 'register' && 'Create a new account'}
            {view === 'forgot' && 'Enter your email to receive a reset link'}
            {view === 'reset' && 'Enter your new password below'}
          </p>
        </div>

        {/* Role Selector (only for login and register) */}
        {(view === 'login' || view === 'register') && (
          <div className="flex p-1 bg-white/50 backdrop-blur-sm rounded-lg mb-6 border border-white/40 shadow-inner">
            {(['student', 'teacher', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all ${
                  role === r 
                    ? 'bg-white text-[#1e3a8a] shadow-sm' 
                    : 'text-[#4b5563] hover:text-[#1f2937]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-600 rounded-lg text-sm text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50/90 backdrop-blur-sm border border-green-200 text-green-700 rounded-lg text-sm text-center font-medium shadow-sm">
            {message}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button 
                type="button" 
                onClick={() => { 
                  // If they just want to see the reset UI without a code, we can let them see it for demo purposes, 
                  // but normally they need the email link. We'll show the 'forgot' view first.
                  setView('forgot'); 
                  setError(''); 
                  setMessage(''); 
                }}
                className="text-xs text-[#1e3a8a] hover:underline font-bold"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a8a] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Signing in...' : `Sign in as ${role}`}
            </button>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-gray-600 font-medium">Or continue with</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm text-gray-700 font-bold py-2.5 px-4 rounded-lg text-sm border border-white/60 hover:bg-white transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>

            <p className="text-center text-sm text-[#4b5563] mt-4 font-medium">
              Don't have an account?{' '}
              <button type="button" onClick={() => { setView('register'); setError(''); }} className="text-[#1e3a8a] font-bold hover:underline">
                Register here
              </button>
            </p>
          </form>
        )}

        {view === 'forgot' && (
          <div className="space-y-4">
            <div className="flex p-1 bg-white/50 backdrop-blur-sm rounded-lg mb-6 border border-white/40 shadow-inner">
              <button
                type="button"
                onClick={() => { setResetMethod('email'); setError(''); setMessage(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all ${
                  resetMethod === 'email' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-[#4b5563] hover:text-[#1f2937]'
                }`}
              >
                Reset via Email
              </button>
              <button
                type="button"
                onClick={() => { setResetMethod('phone'); setError(''); setMessage(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all ${
                  resetMethod === 'phone' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-[#4b5563] hover:text-[#1f2937]'
                }`}
              >
                Reset via Phone OTP
              </button>
            </div>

            {resetMethod === 'email' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-[#6b7280]" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                      placeholder="Enter email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a8a] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-70 shadow-md"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={confirmationResult ? handleVerifyOTP : handleSendPhoneOTP} className="space-y-4">
                <div id="recaptcha-container"></div>
                {!confirmationResult ? (
                  <>
                    <div>
                      <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-[#6b7280]" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                          placeholder="98XXXXXXXX"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#1e3a8a] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-70 shadow-md"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Enter OTP</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-[#6b7280]" />
                        </div>
                        <input
                          type="text"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm tracking-widest font-bold"
                          placeholder="123456"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </>
                )}
              </form>
            )}

            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setMessage(''); setConfirmationResult(null); }} 
                className="text-[#1e3a8a] font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
            
            {/* Demo link to show the reset password UI if they don't have a real code */}
            <div className="mt-6 pt-4 border-t border-gray-200/50 text-center">
              <p className="text-xs text-gray-500 mb-2">Have a reset code?</p>
              <button 
                type="button" 
                onClick={() => { setView('reset'); setError(''); setMessage(''); }} 
                className="text-xs text-[#f97316] font-bold hover:underline"
              >
                Enter New Password Directly
              </button>
            </div>
          </div>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>

            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setMessage(''); }} 
                className="text-[#1e3a8a] font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Enter full name" />
              </div>
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Father's Name</label>
                  <input type="text" required value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="block w-full px-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Father's name" />
                </div>
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Mother's Name</label>
                  <input type="text" required value={motherName} onChange={(e) => setMotherName(e.target.value)} className="block w-full px-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Mother's name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Date of Birth</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-[#6b7280]" />
                      </div>
                      <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Class</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BookOpen className="h-4 w-4 text-[#6b7280]" />
                      </div>
                      <select required value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm appearance-none">
                        <option value="" disabled>Select Class</option>
                        <option value="Playgroup">Playgroup</option>
                        <option value="Nursery">Nursery</option>
                        <option value="LKG">LKG</option>
                        <option value="UKG">UKG</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <option key={num} value={num.toString()}>Class {num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-[#6b7280]" />
                    </div>
                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Full address" />
                  </div>
                </div>
              </>
            )}

            {role === 'teacher' && (
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Teaching Level</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <select required value={teachingLevel} onChange={(e) => setTeachingLevel(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm appearance-none">
                    <option value="" disabled>Select Level</option>
                    <option value="Pre-Primary">Pre-Primary</option>
                    <option value="Primary">Primary</option>
                    <option value="Lower Secondary">Lower Secondary</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input 
                  type="tel" 
                  required 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" 
                  placeholder="98XXXXXXXX or 97XXXXXXXX" 
                  maxLength={10}
                  pattern="^(98|97)\d{8}$"
                  title="Phone number must be exactly 10 digits and start with 98 or 97"
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Enter email" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="••••••••" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Registering...' : `Register as ${role}`}
            </button>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-gray-600 font-medium">Or register with</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm text-gray-700 font-bold py-2.5 px-4 rounded-lg text-sm border border-white/60 hover:bg-white transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>

            <p className="text-center text-sm text-[#4b5563] mt-4 font-medium">
              Already have an account?{' '}
              <button type="button" onClick={() => { setView('login'); setError(''); }} className="text-[#1e3a8a] font-bold hover:underline">
                Sign in here
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
