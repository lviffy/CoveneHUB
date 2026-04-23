'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText } from 'lucide-react';

interface EventNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  notes: string;
}

export default function EventNotesModal({ 
  isOpen, 
  onClose, 
  eventTitle, 
  notes 
}: EventNotesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Event Notes - {eventTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {notes && notes.trim() !== '' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  On-Ground Observations
                </h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {notes}
                </p>
              </div>
              
              <div className="text-xs text-slate-500 italic">
                Notes added by event operations members during the event
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No notes available for this event</p>
              <p className="text-xs text-slate-400 mt-2">
                Event operations members can add notes from their dashboard
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
