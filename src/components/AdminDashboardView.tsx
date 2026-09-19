import React, { useState, useEffect } from "react";
import { AdminPanel } from "./AdminPanel";
import { Job } from "../types";
import { getJobs } from "../lib/services";

export const AdminDashboardView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  const refreshJobs = async () => {
    const list = await getJobs();
    setJobs(list);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 pt-10 sm:pt-14 pb-8 sm:pb-12 space-y-8">
      <AdminPanel jobsList={jobs} />
    </div>
  );
};
export default AdminDashboardView;
