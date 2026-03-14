'use client';

import { FolderOpen, FileIcon } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  name: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
}

interface JobDocumentsSectionProps {
  documents: Document[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function JobDocumentsSection({ documents }: JobDocumentsSectionProps) {
  return (
    <CollapsibleSection
      title="Documents"
      icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
      badge={
        documents.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {documents.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={false}
    >
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="divide-y pt-1">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name || doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(doc.created_at)}
                  {doc.file_size != null && ` · ${formatBytes(doc.file_size)}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  );
}
