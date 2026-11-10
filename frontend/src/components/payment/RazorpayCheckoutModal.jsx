import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, CreditCard, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';

export function RazorpayCheckoutModal({ isOpen, onClose, session, onPaymentSuccess }) {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [step, setStep] = useState('summary'); // 'summary' | 'processing' | 'success' | 'failed'
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [verifiedTx, setVerifiedTx] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [testPaymentMethod, setTestPaymentMethod] = useState('upi');

  useEffect(() => {
    if (isOpen) {
      setStep('summary');
      setOrderData(null);
      setVerifiedTx(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!session) return null;

  const handleInitiateOrder = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // Step 1: Request order from Flask backend
      const res = await api.createPaymentOrder(session.id);
      setOrderData(res);

      // Check if real Razorpay script is loaded and we have real non-placeholder keys
      if (window.Razorpay && !res.is_test_mode) {
        const options = {
          key: res.razorpay_key_id,
          amount: res.amount_paise,
          currency: res.currency,
          name: 'Campus Skill Exchange',
          description: `Session Fee: ${session.title}`,
          order_id: res.order_id,
          handler: async function (response) {
            await handleVerifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#4f46e5',
          },
        };

        const rzpInstance = new window.Razorpay(options);
        rzpInstance.on('payment.failed', function (failResp) {
          setStep('failed');
          setErrorMessage(failResp.error.description || 'Payment failed at gateway.');
        });
        rzpInstance.open();
        setLoading(false);
      } else {
        // Test simulation checkout step
        setStep('simulate_checkout');
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      setStep('failed');
      setErrorMessage(err.message || 'Failed to initialize payment order.');
    }
  };

  const handleSimulatePayment = async () => {
    if (!orderData) return;
    setLoading(true);
    try {
      const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Verified test signature format accepted by backend in test mode
      const mockSignature = `mock_sig_${orderData.order_id}_${mockPaymentId}`;

      await handleVerifyPayment(orderData.order_id, mockPaymentId, mockSignature);
    } catch (err) {
      setLoading(false);
      setStep('failed');
      setErrorMessage(err.message || 'Verification failed.');
    }
  };

  const handleVerifyPayment = async (orderId, paymentId, signature) => {
    setLoading(true);
    setStep('processing');
    try {
      const verifyRes = await api.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });

      setVerifiedTx(verifyRes.transaction);
      setStep('success');
      setLoading(false);
      success('Payment verified successfully!');
      if (onPaymentSuccess) {
        onPaymentSuccess(verifyRes.transaction);
      }
    } catch (err) {
      setLoading(false);
      setStep('failed');
      setErrorMessage(err.message || 'Cryptographic signature verification failed.');
      error(err.message || 'Payment verification failed.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Secure Session Checkout">
      {step === 'summary' && (
        <div className="space-y-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Session Summary
            </div>
            <h4 className="text-base font-bold text-slate-900">{session.title}</h4>
            <div className="mt-2 text-xs text-slate-600 space-y-1">
              <div>
                <span className="font-medium text-slate-700">Mentor:</span> {session.mentor_name}
              </div>
              <div>
                <span className="font-medium text-slate-700">Skill:</span> {session.skill_name}
              </div>
              <div>
                <span className="font-medium text-slate-700">Mode:</span>{' '}
                <span className="capitalize">{session.mode}</span> ({session.meeting_info})
              </div>
              <div>
                <span className="font-medium text-slate-700">Date:</span>{' '}
                {new Date(session.scheduled_start).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          {/* Pricing calculation */}
          <div className="border-t border-b border-slate-200/80 py-3 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Mentorship Session Fee</span>
              <span>₹{session.fee_inr?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Platform Service Charge</span>
              <span className="text-emerald-600 font-medium">₹0.00 (Free Campus Tier)</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="text-indigo-600 text-lg">₹{session.fee_inr?.toFixed(2)} INR</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              256-bit encrypted checkout. Powered by Razorpay. Amounts stored in integer paise.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitiateOrder}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Order...
                </>
              ) : (
                <>
                  Proceed to Pay ₹{session.fee_inr?.toFixed(2)}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'simulate_checkout' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Razorpay Test Environment Checkout
            </div>
            <p>
              Order <code className="bg-white/80 px-1 py-0.5 rounded font-mono">{orderData?.order_id}</code> generated via backend API. Select test payment instrument below:
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Select Payment Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTestPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                  testPaymentMethod === 'upi'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                📱 UPI / QR (Instant)
              </button>
              <button
                type="button"
                onClick={() => setTestPaymentMethod('card')}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                  testPaymentMethod === 'card'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                💳 Debit / Credit Card
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Payee Mentor:</span>
              <span className="font-semibold">{session.mentor_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-bold text-slate-900">₹{orderData?.amount_inr} INR</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setStep('summary')}
              className="btn-secondary"
              disabled={loading}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Signature...
                </>
              ) : (
                <>
                  Authorize & Pay ₹{orderData?.amount_inr}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-8 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h4 className="text-base font-semibold text-slate-800">Verifying Payment Signature...</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Contacting the backend server to cryptographically authenticate the HMAC-SHA256 signature with secret credentials.
          </p>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Payment Confirmed!</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Your transaction has been securely verified and logged on the blockchain/ledger.
            </p>
          </div>

          {verifiedTx && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono font-semibold text-slate-800">#{verifiedTx.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Gateway Order ID</span>
                <span className="font-mono text-slate-700">{verifiedTx.gateway_order_id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Gateway Payment ID</span>
                <span className="font-mono text-slate-700">{verifiedTx.gateway_payment_id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-emerald-700">₹{verifiedTx.amount_inr?.toFixed(2)} INR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status</span>
                <span className="font-semibold text-emerald-600 uppercase">Paid & Verified</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Done & Return to Sessions
            </button>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Payment Failed</h4>
            <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
            <button
              type="button"
              onClick={() => setStep('summary')}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
