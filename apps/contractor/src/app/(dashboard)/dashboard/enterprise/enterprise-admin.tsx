"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageTab } from "./usage-tab";
import { OfficesTab } from "./offices-tab";
import { UsersTab } from "./users-tab";
import { DomainsTab } from "./domains-tab";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  office_id: string | null;
}

interface Office {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
}

interface Domain {
  id: string;
  domain: string;
  created_at: string;
}

interface UsageRecord {
  id: string;
  user_id: string;
  office_id: string | null;
  record_type: string;
  billing_period_start: string;
  is_overage: boolean;
  created_at: string;
}

interface Props {
  companyName: string;
  limits: {
    monthly_decode_limit: number | null;
    monthly_supplement_limit: number | null;
  };
  users: User[];
  offices: Office[];
  domains: Domain[];
  usageRecords: UsageRecord[];
}

export function EnterpriseAdmin({
  companyName,
  limits,
  users,
  offices,
  domains,
  usageRecords,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{companyName}</h2>
        <p className="text-sm text-muted-foreground">
          Enterprise account management
        </p>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="offices">
            Offices ({offices.length})
          </TabsTrigger>
          <TabsTrigger value="users">
            Team ({users.length})
          </TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <UsageTab
            records={usageRecords}
            users={users}
            offices={offices}
            limits={limits}
          />
        </TabsContent>

        <TabsContent value="offices">
          <OfficesTab offices={offices} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab users={users} offices={offices} />
        </TabsContent>

        <TabsContent value="domains">
          <DomainsTab domains={domains} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
