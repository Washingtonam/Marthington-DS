import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

export default function LegacyCommunicationsRedirect() {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get("tab");
  const destination = legacyTab === "templates" || legacyTab === "dispatch"
    ? "/admin/agents"
    : "/admin/people";
  const params = new URLSearchParams(searchParams);
  params.set("tab", legacyTab === "templates" || legacyTab === "dispatch"
    ? legacyTab
    : legacyTab === "notifications" ? "notifications" : "support");
  return <Navigate to={`${destination}?${params.toString()}`} replace />;
}
