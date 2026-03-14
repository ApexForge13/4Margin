'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';

interface InlineEditFieldProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}

export function InlineEditField({ value, placeholder, onSave, className, inputClassName }: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    if (editValue.trim() === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue.trim());
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setEditValue(value); setEditing(false); }
        }}
        disabled={saving}
        className={inputClassName}
      />
    );
  }

  return (
    <button
      onClick={() => { setEditValue(value); setEditing(true); }}
      className={`group flex items-center gap-1 text-left hover:text-primary transition-colors ${className || ''}`}
    >
      <span className={value ? '' : 'text-muted-foreground italic'}>
        {value || placeholder || 'Click to add'}
      </span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
