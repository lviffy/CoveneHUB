"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
export default function SettlementModal({ isOpen, onClose, onSuccess, event }) {
  const [formData, setFormData] = useState({
    transaction_reference: "",
    transfer_date: new Date().toISOString().split("T")[0],
    // Today's date
    payment_method: "bank_transfer",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: event.id,
          ...formData,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create settlement");
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
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    setFormData({
      transaction_reference: "",
      transfer_date: new Date().toISOString().split("T")[0],
      payment_method: "bank_transfer",
      notes: "",
    });
    setError(null);
    setSuccess(false);
    onClose();
  };
  return /*#__PURE__*/ React.createElement(
    Dialog,
    {
      open: isOpen,
      onOpenChange: handleClose,
    },
    /*#__PURE__*/ React.createElement(
      DialogContent,
      {
        className: "sm:max-w-[550px]",
      },
      /*#__PURE__*/ React.createElement(
        DialogHeader,
        null,
        /*#__PURE__*/ React.createElement(
          DialogTitle,
          null,
          "Mark Settlement as Paid",
        ),
        /*#__PURE__*/ React.createElement(
          DialogDescription,
          null,
          "Record the payment transfer to the event operations team for ",
          /*#__PURE__*/ React.createElement("strong", null, event.title),
          ". This will lock the financial data for this event.",
        ),
      ),
      success
        ? /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "py-8 text-center",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4",
              },
              /*#__PURE__*/ React.createElement(CheckCircle2, {
                className: "h-8 w-8 text-green-600",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "h3",
              {
                className: "text-lg font-semibold text-gray-900 mb-2",
              },
              "Settlement Recorded!",
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-gray-500",
              },
              "The payment has been marked as settled.",
            ),
          )
        : /*#__PURE__*/ React.createElement(
            "form",
            {
              onSubmit: handleSubmit,
              className: "space-y-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "bg-blue-50 border border-blue-200 rounded-lg p-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center justify-between",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  null,
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-sm text-blue-700 font-medium",
                    },
                    "Net Payout Amount",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-xs text-blue-600 mt-1",
                    },
                    "Amount to be paid to event operations",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-2xl font-bold text-blue-900",
                  },
                  formatCurrency(event.net_payout),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-2",
              },
              /*#__PURE__*/ React.createElement(
                Label,
                {
                  htmlFor: "transaction_reference",
                },
                "Transaction Reference ",
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-red-500",
                  },
                  "*",
                ),
              ),
              /*#__PURE__*/ React.createElement(Input, {
                id: "transaction_reference",
                placeholder: "UTR Number, Transfer ID, or Check Number",
                value: formData.transaction_reference,
                onChange: (e) =>
                  setFormData({
                    ...formData,
                    transaction_reference: e.target.value,
                  }),
                required: true,
                disabled: loading,
              }),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-gray-500",
                },
                "Enter the bank transfer reference number or transaction ID",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-2",
              },
              /*#__PURE__*/ React.createElement(
                Label,
                {
                  htmlFor: "transfer_date",
                },
                "Transfer Date ",
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-red-500",
                  },
                  "*",
                ),
              ),
              /*#__PURE__*/ React.createElement(Input, {
                id: "transfer_date",
                type: "date",
                value: formData.transfer_date,
                onChange: (e) =>
                  setFormData({
                    ...formData,
                    transfer_date: e.target.value,
                  }),
                max: new Date().toISOString().split("T")[0],
                required: true,
                disabled: loading,
              }),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-gray-500",
                },
                "Date when the payment was transferred",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-2",
              },
              /*#__PURE__*/ React.createElement(
                Label,
                {
                  htmlFor: "payment_method",
                },
                "Payment Method",
              ),
              /*#__PURE__*/ React.createElement(
                Select,
                {
                  value: formData.payment_method,
                  onValueChange: (value) =>
                    setFormData({
                      ...formData,
                      payment_method: value,
                    }),
                  disabled: loading,
                },
                /*#__PURE__*/ React.createElement(
                  SelectTrigger,
                  null,
                  /*#__PURE__*/ React.createElement(SelectValue, null),
                ),
                /*#__PURE__*/ React.createElement(
                  SelectContent,
                  null,
                  /*#__PURE__*/ React.createElement(
                    SelectItem,
                    {
                      value: "bank_transfer",
                    },
                    "Bank Transfer (NEFT/RTGS/IMPS)",
                  ),
                  /*#__PURE__*/ React.createElement(
                    SelectItem,
                    {
                      value: "upi",
                    },
                    "UPI",
                  ),
                  /*#__PURE__*/ React.createElement(
                    SelectItem,
                    {
                      value: "check",
                    },
                    "Check",
                  ),
                  /*#__PURE__*/ React.createElement(
                    SelectItem,
                    {
                      value: "cash",
                    },
                    "Cash",
                  ),
                  /*#__PURE__*/ React.createElement(
                    SelectItem,
                    {
                      value: "other",
                    },
                    "Other",
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-2",
              },
              /*#__PURE__*/ React.createElement(
                Label,
                {
                  htmlFor: "notes",
                },
                "Notes (Optional)",
              ),
              /*#__PURE__*/ React.createElement(Textarea, {
                id: "notes",
                placeholder:
                  "Add any additional notes about this settlement...",
                value: formData.notes,
                onChange: (e) =>
                  setFormData({
                    ...formData,
                    notes: e.target.value,
                  }),
                rows: 3,
                disabled: loading,
              }),
            ),
            error &&
              /*#__PURE__*/ React.createElement(
                Alert,
                {
                  variant: "destructive",
                },
                /*#__PURE__*/ React.createElement(AlertCircle, {
                  className: "h-4 w-4",
                }),
                /*#__PURE__*/ React.createElement(
                  AlertDescription,
                  null,
                  error,
                ),
              ),
            /*#__PURE__*/ React.createElement(
              Alert,
              null,
              /*#__PURE__*/ React.createElement(AlertCircle, {
                className: "h-4 w-4",
              }),
              /*#__PURE__*/ React.createElement(
                AlertDescription,
                null,
                /*#__PURE__*/ React.createElement("strong", null, "Important:"),
                " Once marked as settled, the financial data for this event will be locked and cannot be modified.",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              DialogFooter,
              null,
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  onClick: handleClose,
                  disabled: loading,
                },
                "Cancel",
              ),
              event.settlement_status === "settled"
                ? /*#__PURE__*/ React.createElement(
                    Button,
                    {
                      type: "button",
                      disabled: true,
                      className:
                        "bg-green-600 hover:bg-green-600 cursor-not-allowed",
                    },
                    /*#__PURE__*/ React.createElement(CheckCircle2, {
                      className: "mr-2 h-4 w-4",
                    }),
                    "Already Settled",
                  )
                : /*#__PURE__*/ React.createElement(
                    Button,
                    {
                      type: "submit",
                      disabled:
                        loading ||
                        !formData.transaction_reference ||
                        !formData.transfer_date,
                      className: "bg-[#195ADC] hover:bg-[#1451c4]",
                    },
                    loading
                      ? /*#__PURE__*/ React.createElement(
                          React.Fragment,
                          null,
                          /*#__PURE__*/ React.createElement(Loader2, {
                            className: "mr-2 h-4 w-4 animate-spin",
                          }),
                          "Recording Settlement...",
                        )
                      : /*#__PURE__*/ React.createElement(
                          React.Fragment,
                          null,
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "mr-2 h-4 w-4",
                          }),
                          "Mark as Paid",
                        ),
                  ),
            ),
          ),
    ),
  );
}
