'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardCheck, Shield, FileText, Calculator } from 'lucide-react';
import { JobPicker } from './job-picker';

interface NewServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ServiceType = 'inspection' | 'policy' | 'supplement' | 'quote';

const SERVICES: { type: ServiceType; label: string; description: string; icon: React.ReactNode; route: string }[] = [
  { type: 'inspection', label: 'Inspection', description: 'Start a new roof inspection', icon: <ClipboardCheck className="h-6 w-6" />, route: '/dashboard/inspections/new' },
  { type: 'policy', label: 'Policy Decode', description: 'Decode an insurance policy', icon: <Shield className="h-6 w-6" />, route: '/dashboard/policies/new' },
  { type: 'supplement', label: 'Supplement', description: 'Generate a supplement', icon: <FileText className="h-6 w-6" />, route: '/dashboard/supplements/new' },
  { type: 'quote', label: 'Quote', description: 'Create a retail quote', icon: <Calculator className="h-6 w-6" />, route: '/dashboard/quotes/new' },
];

export function NewServiceModal({ open, onOpenChange }: NewServiceModalProps) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

  const handleSelectService = (type: ServiceType) => {
    setSelectedService(type);
  };

  const handleSelectJob = (jobId: string) => {
    const service = SERVICES.find((s) => s.type === selectedService);
    if (service) {
      router.push(`${service.route}?jobId=${jobId}`);
      onOpenChange(false);
      setSelectedService(null);
    }
  };

  const handleStartFresh = () => {
    const service = SERVICES.find((s) => s.type === selectedService);
    if (service) {
      router.push(service.route);
      onOpenChange(false);
      setSelectedService(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedService(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{selectedService ? 'Select a Job' : 'What would you like to do?'}</DialogTitle>
        </DialogHeader>

        {!selectedService ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {SERVICES.map((service) => (
              <button
                key={service.type}
                onClick={() => handleSelectService(service.type)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors text-center"
              >
                <div className="text-primary">{service.icon}</div>
                <div className="font-medium text-sm">{service.label}</div>
                <div className="text-xs text-muted-foreground">{service.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedService(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
            >
              &larr; Back to services
            </button>
            <JobPicker onSelectJob={handleSelectJob} onStartFresh={handleStartFresh} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
