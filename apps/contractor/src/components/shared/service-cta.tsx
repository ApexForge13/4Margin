import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ServiceCTAProps {
  icon: React.ReactNode;
  message: string;
  actionLabel: string;
  href: string;
  greyedOut?: boolean;
}

export function ServiceCTA({ icon, message, actionLabel, href, greyedOut }: ServiceCTAProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-center ${greyedOut ? 'opacity-40' : ''}`}>
      <div className="text-muted-foreground mb-3">{icon}</div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {!greyedOut && (
        <Button asChild variant="outline">
          <Link href={href}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
