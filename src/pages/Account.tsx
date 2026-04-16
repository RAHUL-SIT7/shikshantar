import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Account() {
  const [showNotification, setShowNotification] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      alert("Please select a payment method");
      return;
    }
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {showNotification && (
        <div className="col-span-1 md:col-span-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] p-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Payment processed. Notification sent to guardian.
        </div>
      )}

      {/* Account Summary */}
      <section className="col-span-1 bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
          <span>Fees & Payments</span>
          <span className="bg-[#fee2e2] text-[#b91c1c] px-2 py-1 rounded text-[0.65rem]">Due: NRs. 20,000</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="text-[0.8rem] opacity-70">Annual Tuition</span>
          <span className="text-[0.8rem] font-semibold">NRs. 50,000</span>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-[0.8rem] opacity-70">Paid Amount</span>
          <span className="text-[0.8rem] font-semibold">NRs. 30,000</span>
        </div>
        
        <div className="my-3 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
          <div className="w-[60%] h-full bg-[#f97316] rounded-full"></div>
        </div>
        
        <div className="text-[0.7rem] text-[#6b7280] mb-2 mt-4">Pay with:</div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button 
            type="button"
            onClick={() => setPaymentMethod('esewa')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'esewa' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            eSewa
          </button>
          <button 
            type="button"
            onClick={() => setPaymentMethod('khalti')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'khalti' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            Khalti
          </button>
          <button 
            type="button"
            onClick={() => setPaymentMethod('nabil')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'nabil' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            Nabil
          </button>
          <button 
            type="button"
            onClick={() => setPaymentMethod('nic')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'nic' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            NIC Asia
          </button>
          <button 
            type="button"
            onClick={() => setPaymentMethod('siddh')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'siddh' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            Siddharth
          </button>
          <button 
            type="button"
            onClick={() => setPaymentMethod('nimb')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'nimb' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            NIMB
          </button>
          <button 
            type="button"
            onClick={() => setPaymentMethod('nmb')}
            className={`w-12 h-10 rounded border flex items-center justify-center text-[0.6rem] font-bold transition-colors ${paymentMethod === 'nmb' ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' : 'bg-[#f9fafb] border-[#e5e7eb] text-[#1f2937]'}`}
          >
            NMB
          </button>
        </div>

        <form onSubmit={handlePayment}>
          <div className="mb-3">
            <input
              type="number"
              defaultValue={10000}
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded text-sm bg-[#f9fafb]"
              placeholder="Amount"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#1e3a8a] text-white font-medium py-2 px-4 rounded text-sm"
          >
            Make Payment
          </button>
        </form>
      </section>

      {/* Installments */}
      <section className="col-span-1 md:col-span-2 bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4">Installment Details</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.85rem]">
            <thead>
              <tr>
                <th className="text-left p-2 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Installment</th>
                <th className="text-left p-2 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Due Date</th>
                <th className="text-right p-2 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Amount</th>
                <th className="text-center p-2 border-b border-[#e5e7eb] text-[#6b7280] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b border-[#f9fafb]">First Installment</td>
                <td className="p-2 border-b border-[#f9fafb]">2081-01-15</td>
                <td className="p-2 border-b border-[#f9fafb] text-right">NRs. 15,000</td>
                <td className="p-2 border-b border-[#f9fafb] text-center"><span className="text-[#10b981] text-xs font-bold">Paid</span></td>
              </tr>
              <tr>
                <td className="p-2 border-b border-[#f9fafb]">Second Installment</td>
                <td className="p-2 border-b border-[#f9fafb]">2081-04-15</td>
                <td className="p-2 border-b border-[#f9fafb] text-right">NRs. 15,000</td>
                <td className="p-2 border-b border-[#f9fafb] text-center"><span className="text-[#10b981] text-xs font-bold">Paid</span></td>
              </tr>
              <tr>
                <td className="p-2 border-b border-[#f9fafb]">Third Installment</td>
                <td className="p-2 border-b border-[#f9fafb]">2081-07-15</td>
                <td className="p-2 border-b border-[#f9fafb] text-right">NRs. 10,000</td>
                <td className="p-2 border-b border-[#f9fafb] text-center"><span className="text-[#b91c1c] text-xs font-bold">Due</span></td>
              </tr>
              <tr>
                <td className="p-2 border-b border-[#f9fafb]">Fourth Installment</td>
                <td className="p-2 border-b border-[#f9fafb]">2081-10-15</td>
                <td className="p-2 border-b border-[#f9fafb] text-right">NRs. 10,000</td>
                <td className="p-2 border-b border-[#f9fafb] text-center"><span className="text-[#b91c1c] text-xs font-bold">Due</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
