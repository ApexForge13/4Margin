'use client';

import { Activity, FileText, CheckCircle, AlertCircle, Edit, Plus } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { Badge } from '@/components/ui/badge';

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface JobActivityLogProps {
  activities: ActivityEntry[];
}

function getActionIcon(action: string) {
  if (action.includes('create') || action.includes('add')) return <Plus className="h-3.5 w-3.5" />;
  if (action.includes('update') || action.includes('edit')) return <Edit className="h-3.5 w-3.5" />;
  if (action.includes('complete') || action.includes('approve') || action.includes('won'))
    return <CheckCircle className="h-3.5 w-3.5" />;
  if (action.includes('deny') || action.includes('lost') || action.includes('error'))
    return <AlertCircle className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

function getActionIconColor(action: string): string {
  if (action.includes('complete') || action.includes('approve') || action.includes('won'))
    return 'text-green-600 bg-green-50';
  if (action.includes('deny') || action.includes('lost') || action.includes('error'))
    return 'text-red-600 bg-red-50';
  if (action.includes('create') || action.includes('add'))
    return 'text-blue-600 bg-blue-50';
  return 'text-muted-foreground bg-muted';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function JobActivityLog({ activities }: JobActivityLogProps) {
  return (
    <CollapsibleSection
      title="Activity"
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      badge={
        activities.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {activities.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={false}
    >
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No activity recorded yet.
        </p>
      ) : (
        <ol className="relative pl-6 pt-2 space-y-4">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-4 bottom-2 w-px bg-border" />

          {activities.map((entry) => (
            <li key={entry.id} className="relative flex items-start gap-3">
              {/* Icon dot */}
              <div
                className={`absolute -left-6 flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${getActionIconColor(entry.action)}`}
              >
                {getActionIcon(entry.action)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {relativeTime(entry.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </CollapsibleSection>
  );
}
