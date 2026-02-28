import { getPolicyChecks } from "./actions";
import { PolicyChecksList } from "@/components/policy-checks/policy-checks-list";

export default async function PolicyChecksPage() {
  const checks = await getPolicyChecks();

  return <PolicyChecksList initialChecks={checks} />;
}
