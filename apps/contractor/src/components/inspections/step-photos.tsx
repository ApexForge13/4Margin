'use client';

import { useState, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Camera,
} from 'lucide-react';
import type { InspectionPhoto, PhotoCategory } from '@/types/inspection';

interface StepPhotosProps {
  inspectionId: string;
  companyId: string;
  onComplete: (photos: InspectionPhoto[]) => void;
  onBack: () => void;
}

const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: 'elevation', label: 'Elevation' },
  { value: 'roof_overview', label: 'Roof Overview' },
  { value: 'damage', label: 'Damage' },
  { value: 'component', label: 'Component' },
  { value: 'interior_damage', label: 'Interior Damage' },
  { value: 'install', label: 'Install' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  elevation: 'Elevation',
  roof_overview: 'Roof Overview',
  damage: 'Damage',
  component: 'Component',
  interior_damage: 'Interior Damage',
  install: 'Install',
  other: 'Other',
};

type UploadPhase = 'idle' | 'uploading' | 'classifying' | 'done';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function ext(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
}

function groupByCategory(photos: InspectionPhoto[]): Record<PhotoCategory, InspectionPhoto[]> {
  const result = {} as Record<PhotoCategory, InspectionPhoto[]>;
  for (const photo of photos) {
    const cat = (photo.contractor_category ?? photo.ai_category) as PhotoCategory;
    if (!result[cat]) result[cat] = [];
    result[cat].push(photo);
  }
  return result;
}

export function StepPhotos({
  inspectionId,
  companyId,
  onComplete,
  onBack,
}: StepPhotosProps) {
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<PhotoCategory>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (cat: PhotoCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        ['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(f.type)
      );

      if (fileArray.length === 0) return;

      const total = fileArray.length;
      setPhase('uploading');
      setUploadProgress({ done: 0, total });
      setError(null);

      const supabase = getSupabase();
      const insertedIds: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const uuid = crypto.randomUUID();
        const extension = ext(file.name);
        const storagePath = `${companyId}/${inspectionId}/${uuid}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          setError(`Failed to upload ${file.name}: ${uploadError.message}`);
          setPhase('idle');
          return;
        }

        // Insert the photo record via API
        const res = await fetch(`/api/inspections/${inspectionId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_path: storagePath,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            sort_order: photos.length + i,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error ?? 'Failed to save photo record');
          setPhase('idle');
          return;
        }

        const json = await res.json();
        insertedIds.push(json.id);
        setUploadProgress({ done: i + 1, total });
      }

      // Classify photos
      setPhase('classifying');

      const classifyRes = await fetch(`/api/inspections/${inspectionId}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: insertedIds }),
      });

      if (!classifyRes.ok) {
        // Non-fatal: show photos unclassified
        setError('Classification failed — photos saved, categories may need manual assignment.');
      }

      // Refresh the full photo list
      const listRes = await fetch(`/api/inspections/${inspectionId}/photos`);
      if (listRes.ok) {
        const listJson = await listRes.json();
        setPhotos(listJson.photos ?? []);
      }

      setPhase('done');
    },
    [companyId, inspectionId, photos.length]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDelete = async (photoId: string) => {
    const res = await fetch(`/api/inspections/${inspectionId}/photos/${photoId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  };

  const handleReclassify = async (photoId: string, category: PhotoCategory) => {
    const res = await fetch(`/api/inspections/${inspectionId}/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractor_category: category }),
    });
    if (res.ok) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, contractor_category: category } : p))
      );
    }
  };

  const handleCaption = (photoId: string, caption: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, caption } : p)));
  };

  const handleCaptionBlur = async (photoId: string, caption: string) => {
    await fetch(`/api/inspections/${inspectionId}/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    });
  };

  const grouped = groupByCategory(photos);

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
          phase === 'uploading' || phase === 'classifying' ? 'pointer-events-none opacity-70' : ''
        )}
      >
        {phase === 'uploading' && (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              Uploading {uploadProgress.done} of {uploadProgress.total} photos...
            </p>
          </div>
        )}
        {phase === 'classifying' && (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-700">Classifying photos with AI...</p>
          </div>
        )}
        {(phase === 'idle' || phase === 'done') && (
          <div className="space-y-4">
            <Camera className="w-10 h-10 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drag and drop photos here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, or HEIC accepted
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {/* Warnings */}
      {photos.length > 50 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            You have {photos.length} photos. Consider trimming to the most relevant shots.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Photo Grid by Category */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload More
            </Button>
          </div>

          {(Object.entries(grouped) as [PhotoCategory, InspectionPhoto[]][]).map(
            ([category, categoryPhotos]) => {
              const isCollapsed = collapsedCategories.has(category);
              return (
                <Card key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {CATEGORY_LABELS[category]}{' '}
                      <span className="text-muted-foreground font-normal">
                        ({categoryPhotos.length})
                      </span>
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <CardContent className="pt-0 pb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {categoryPhotos.map((photo) => {
                          const lowConfidence =
                            photo.ai_confidence !== null && photo.ai_confidence < 80;
                          const supabase = getSupabase();
                          const { data: urlData } = supabase.storage
                            .from('inspection-photos')
                            .getPublicUrl(photo.storage_path);

                          return (
                            <div
                              key={photo.id}
                              className="space-y-2 border rounded-lg p-2"
                            >
                              {/* Thumbnail */}
                              <div className="relative aspect-square overflow-hidden rounded bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={urlData.publicUrl}
                                  alt={photo.original_filename}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(photo.id)}
                                  className="absolute top-1 right-1 p-1 bg-white/90 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                {lowConfidence && (
                                  <div className="absolute bottom-1 left-1">
                                    <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700 gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Low confidence
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              {/* Category reclassify */}
                              <Select
                                value={photo.contractor_category ?? photo.ai_category}
                                onValueChange={(v) =>
                                  handleReclassify(photo.id, v as PhotoCategory)
                                }
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PHOTO_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Caption */}
                              <Input
                                placeholder="Caption..."
                                value={photo.caption ?? ''}
                                className="h-7 text-xs"
                                onChange={(e) => handleCaption(photo.id, e.target.value)}
                                onBlur={(e) => handleCaptionBlur(photo.id, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            }
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={() => onComplete(photos)} className="gap-2">
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
