'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event: {
    id: string;
    title: string;
    net_payout: number;
    settlement_status?: string | null;
  };
}

export default function SettlementModal({
  isOpen,
  onClose,
  onSuccess,
  event,
}: SettlementModalProps) {
  const [formData, setFormData] = useState({
    transaction_reference: '',
    transfer_date: new Date().toISOString().split('T')[0], // Today's date
    payment_method: 'bank_transfer',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create settlement');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        // Refresh data after modal closes
        setTimeout(() => {
          onSuccess();
        }, 100);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      transaction_reference: '',
      transfer_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      notes: '',
    });
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Mark Settlement as Paid</DialogTitle>
          <DialogDescription>
            Record the payment transfer to the event operations team for <strong>{event.title}</strong>.
            This will lock the financial data for this event.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Settlement Recorded!
            </h3>
            <p className="text-gray-500">
              The payment has been marked as settled.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Settlement Amount Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Net Payout Amount</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Amount to be paid to event operations
                  </p>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(event.net_payout)}
                </div>
              </div>
            </div>

            {/* Transaction Reference */}
            <div className="space-y-2">
              <Label htmlFor="transaction_reference">
                Transaction Reference <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transaction_reference"
                placeholder="UTR Number, Transfer ID, or Check Number"
                value={formData.transaction_reference}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_reference: e.target.value })
                }
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Enter the bank transfer reference number or transaction ID
              </p>
            </div>

            {/* Transfer Date */}
            <div className="space-y-2">
              <Label htmlFor="transfer_date">
                Transfer Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transfer_date"
                type="date"
                value={formData.transfer_date}
                onChange={(e) =>
                  setFormData({ ...formData, transfer_date: e.target.value })
                }
                max={new Date().toISOString().split('T')[0]}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Date when the payment was transferred
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this settlement..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Once marked as settled, the financial data for this
                event will be locked and cannot be modified.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              {event.settlement_status === 'settled' ? (
                <Button
                  type="button"
                  disabled
                  className="bg-green-600 hover:bg-green-600 cursor-not-allowed"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Already Settled
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !formData.transaction_reference || !formData.transfer_date}
                  className="bg-[#195ADC] hover:bg-[#1451c4]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording Settlement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
