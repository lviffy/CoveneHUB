'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RazorpayCheckoutProps {
  eventId: string;
  ticketsCount: number;
  autoTrigger?: boolean;
  onReady?: () => void;
  onSuccess?: (bookingId: string, paymentId: string, bookingCode?: string) => void;
  onFailure?: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayCheckout({
  eventId,
  ticketsCount,
  autoTrigger = false,
  onReady,
  onSuccess,
  onFailure,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setError('Failed to load Razorpay checkout.');
      setShowErrorModal(true);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (autoTrigger && scriptLoaded && !hasAutoTriggered && !loading) {
      setHasAutoTriggered(true);
      void initiatePayment();
    }
  }, [autoTrigger, hasAutoTriggered, loading, scriptLoaded]);

  const initiatePayment = async () => {
    if (!scriptLoaded) {
      const message = 'Payment gateway is still loading. Please try again.';
      setError(message);
      setShowErrorModal(true);
      onFailure?.(message);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketsCount,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.orderId) {
        throw new Error(orderData.error || orderData.details || 'Failed to create payment order.');
      }

      const razorpayKey = orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error('Razorpay public key is missing. Please check payment configuration.');
      }

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ConveneHub',
        description: `${orderData.bookingDetails.event.title} - ${ticketsCount} Ticket(s)`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.bookingDetails.name,
          email: orderData.bookingDetails.email,
          contact: orderData.bookingDetails.contact,
        },
        theme: {
          color: '#2563eb',
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }

            setLoading(false);
            onSuccess?.(
              verifyData.booking_id,
              verifyData.payment_id,
              verifyData.booking_code
            );
          } catch (verifyError: any) {
            const message = verifyError?.message || 'Payment verification failed.';
            setLoading(false);
            setError(message);
            setShowErrorModal(true);
            onFailure?.(message);
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await fetch('/api/payments/fail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: orderData.orderId,
                  reason: 'Payment cancelled by user',
                }),
              });
            } catch {
              // Ignore cleanup errors here and surface the cancellation state.
            }

            const message = 'Payment cancelled. Your pending booking was removed.';
            setLoading(false);
            setError(message);
            setShowErrorModal(true);
            onFailure?.(message);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', async (response: any) => {
        try {
          await fetch('/api/payments/fail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: orderData.orderId,
              reason: response?.error?.reason || 'Payment failed',
              error_code: response?.error?.code,
              error_description: response?.error?.description,
            }),
          });
        } catch {
          // Ignore cleanup errors and show the original payment failure.
        }

        const message = response?.error?.description || 'Payment failed. Please try again.';
        setLoading(false);
        setError(message);
        setShowErrorModal(true);
        onFailure?.(message);
      });

      onReady?.();
      razorpay.open();
    } catch (paymentError: any) {
      const message = paymentError?.message || 'Failed to start Razorpay checkout.';
      setLoading(false);
      setError(message);
      setShowErrorModal(true);
      onFailure?.(message);
    }
  };

  return (
    <>
      {!autoTrigger && (
        <Button
          type="button"
          onClick={() => void initiatePayment()}
          disabled={loading || !scriptLoaded}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl"
        >
          {loading ? 'Opening Razorpay...' : 'Pay With Razorpay'}
        </Button>
      )}

      {showErrorModal && error && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Issue</h3>
                  <p className="text-sm text-gray-500">Razorpay could not complete the checkout.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowErrorModal(false)}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 leading-relaxed">{error}</p>
            </div>

            <div className="p-6 pt-0">
              <Button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
