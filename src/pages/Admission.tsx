import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';

export default function Admission() {
  const [formData, setFormData] = useState({
    studentName: '',
    dateOfBirth: '',
    gender: 'Male',
    parentName: '',
    contactNumber: '',
    email: '',
    address: '',
    gradeAppliedFor: 'Nursery',
    previousSchool: ''
  });

  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    // Contact Number Validation
    const phoneRegex = /^[+]?[0-9\s-]{10,15}$/;
    const cleanNumber = formData.contactNumber.replace(/[\s-]/g, '');
    if (cleanNumber.length < 10) {
      setStatus({ type: 'error', message: 'Please enter a valid contact number (at least 10 digits).' });
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'admissions'), {
        ...formData,
        status: 'Pending',
        submittedAt: serverTimestamp()
      });
      
      setStatus({ type: 'success', message: 'Admission form submitted successfully! We will contact you soon.' });
      setFormData({
        studentName: '',
        dateOfBirth: '',
        gender: 'Male',
        parentName: '',
        contactNumber: '',
        email: '',
        address: '',
        gradeAppliedFor: 'Nursery',
        previousSchool: ''
      });
    } catch (error) {
      console.error('Error submitting form: ', error);
      setStatus({ type: 'error', message: 'Failed to submit form. Please make sure database rules allow writing to admissions collection, or try again later.' });
    }
    
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const logoUrl = "https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE";

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
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1e3a8a] mb-2 tracking-wide uppercase">Shikshantar Academy</h1>
          <h2 className="text-xl font-bold text-[#374151] mb-2">Online Admission Form</h2>
          <p className="text-[#6b7280] text-sm">Please fill out the form below to apply for admission to Shikshantar Academy.</p>
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
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Student's Full Name *</label>
            <input required type="text" name="studentName" value={formData.studentName} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" placeholder="Enter full name" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Date of Birth *</label>
            <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Grade Applied For *</label>
            <select name="gradeAppliedFor" value={formData.gradeAppliedFor} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]">
              <option value="Playgroup">Playgroup</option>
              <option value="Nursery">Nursery</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
              <option value="1">Class 1</option>
              <option value="2">Class 2</option>
              <option value="3">Class 3</option>
              <option value="4">Class 4</option>
              <option value="5">Class 5</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Parent/Guardian Name *</label>
            <input required type="text" name="parentName" value={formData.parentName} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" placeholder="Enter parent's name" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Contact Number *</label>
            <input required type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} pattern="[+]?[0-9\s-]{10,15}" title="Please enter a valid 10-digit phone number" className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" placeholder="Enter 10-digit phone number" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#374151] mb-1">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" placeholder="Enter email address (optional)" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#374151] mb-1">Full Address *</label>
            <textarea required name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" placeholder="Enter full residential address"></textarea>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#374151] mb-1">Previous School Attended (If any)</label>
            <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="w-full px-3 py-2 border border-[#d1d5db] rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]" placeholder="Enter previous school name" />
          </div>
        </div>

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
      </form>
      </div>
    </div>
  );
}
