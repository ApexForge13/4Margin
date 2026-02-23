"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodesTable } from "./codes-table";
import { CarriersTable } from "./carriers-table";
import { TeamTable } from "./team-table";

export interface XactimateCode {
  id: string;
  code: string;
  category: string;
  description: string;
  unit: string;
  default_justification: string | null;
  irc_reference: string | null;
  commonly_missed: boolean;
  notes: string | null;
  created_at: string;
}

export interface Carrier {
  id: string;
  name: string;
  claims_email: string | null;
  claims_phone: string | null;
  claims_fax: string | null;
  claims_portal_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AdminTabsProps {
  codes: XactimateCode[];
  carriers: Carrier[];
  team: TeamMember[];
}

export function AdminTabs({ codes, carriers, team }: AdminTabsProps) {
  return (
    <Tabs defaultValue="codes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="codes">
          Xactimate Codes ({codes.length})
        </TabsTrigger>
        <TabsTrigger value="carriers">
          Carriers ({carriers.length})
        </TabsTrigger>
        <TabsTrigger value="team">
          Team ({team.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="codes">
        <CodesTable codes={codes} />
      </TabsContent>

      <TabsContent value="carriers">
        <CarriersTable carriers={carriers} />
      </TabsContent>

      <TabsContent value="team">
        <TeamTable team={team} />
      </TabsContent>
    </Tabs>
  );
}
