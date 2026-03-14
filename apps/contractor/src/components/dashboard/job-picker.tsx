'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MapPin } from 'lucide-react';

interface JobRow {
  id: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  homeowner_name: string | null;
  job_type: string;
  updated_at: string;
}

interface JobPickerProps {
  onSelectJob: (jobId: string) => void;
  onStartFresh: () => void;
}

export function JobPicker({ onSelectJob, onStartFresh }: JobPickerProps) {
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function fetchJobs() {
      setLoading(true);
      let query = supabase
        .from('jobs')
        .select('id, property_address, property_city, property_state, homeowner_name, job_type, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (search.trim()) {
        query = query.or(`property_address.ilike.%${search}%,homeowner_name.ilike.%${search}%`);
      }

      const { data } = await query;
      setJobs(data || []);
      setLoading(false);
    }
    fetchJobs();
  }, [search]);

  const jobTypeBadgeColor: Record<string, string> = {
    insurance: 'bg-blue-100 text-blue-800',
    retail: 'bg-green-100 text-green-800',
    hybrid: 'bg-purple-100 text-purple-800',
    repair: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address or homeowner name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No jobs found</div>
        ) : (
          jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors flex items-start gap-3"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{job.property_address}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {job.homeowner_name && <span>{job.homeowner_name}</span>}
                  {job.property_city && job.property_state && (
                    <span>{job.property_city}, {job.property_state}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${jobTypeBadgeColor[job.job_type] || 'bg-gray-100 text-gray-800'}`}>
                {job.job_type}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="border-t pt-3">
        <Button variant="outline" onClick={onStartFresh} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Start Fresh
        </Button>
      </div>
    </div>
  );
}
