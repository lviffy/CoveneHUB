"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
export default function EventNotesModal({
  isOpen,
  onClose,
  eventTitle,
  notes,
}) {
  return /*#__PURE__*/ React.createElement(
    Dialog,
    {
      open: isOpen,
      onOpenChange: onClose,
    },
    /*#__PURE__*/ React.createElement(
      DialogContent,
      {
        className: "max-w-2xl max-h-[80vh]",
      },
      /*#__PURE__*/ React.createElement(
        DialogHeader,
        null,
        /*#__PURE__*/ React.createElement(
          DialogTitle,
          {
            className: "flex items-center gap-2",
          },
          /*#__PURE__*/ React.createElement(FileText, {
            className: "h-5 w-5 text-blue-600",
          }),
          "Event Notes - ",
          eventTitle,
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "mt-4",
        },
        notes && notes.trim() !== ""
          ? /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-slate-50 rounded-lg p-4 border border-slate-200",
                },
                /*#__PURE__*/ React.createElement(
                  "h3",
                  {
                    className: "text-sm font-semibold text-slate-700 mb-2",
                  },
                  "On-Ground Observations",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className:
                      "text-sm text-slate-600 whitespace-pre-wrap leading-relaxed",
                  },
                  notes,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs text-slate-500 italic",
                },
                "Notes added by event operations members during the event",
              ),
            )
          : /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-center py-12",
              },
              /*#__PURE__*/ React.createElement(FileText, {
                className: "h-12 w-12 mx-auto mb-3 text-slate-300",
              }),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-slate-500",
                },
                "No notes available for this event",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-slate-400 mt-2",
                },
                "Event operations members can add notes from their dashboard",
              ),
            ),
      ),
    ),
  );
}
