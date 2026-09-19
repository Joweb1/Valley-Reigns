import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChatInbox } from "./ChatInbox";
import { JobPostingForm } from "./JobPostingForm";
import { StaffReportForm } from "./StaffReportForm";
import { Job } from "../types";
import { getJobs } from "../lib/services";

export const StaffDashboardView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const staffTab = (tabParam === "post-job") ? "post-job" : (tabParam === "report" ? "report" : "inbox");
  const [searchQuery] = useState("");
  const [hasActiveChat, setHasActiveChat] = useState(false);

  const refreshJobs = async () => {
    const list = await getJobs();
    setJobs(list);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  const isInbox = staffTab === "inbox";

  return (
    <div className={isInbox ? "w-full flex-1 h-full min-h-0 flex flex-col bg-transparent p-0 m-0 pt-3 sm:pt-4 overflow-hidden" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6"}>
      
      {/* Render selected workspace tabs */}
      <div className={isInbox ? "w-full flex-1 h-full flex flex-col min-h-0 overflow-hidden" : "w-full"}>
        {staffTab === "inbox" && (
          <ChatInbox jobsList={jobs} searchQuery={searchQuery} onActiveChatChange={setHasActiveChat} />
        )}
        
        {staffTab === "post-job" && (
          <div className="max-w-3xl mx-auto">
            <JobPostingForm onJobAdded={refreshJobs} />
          </div>
        )}

        {staffTab === "report" && (
          <div className="py-2">
            <StaffReportForm />
          </div>
        )}
      </div>
    </div>
  );
};
export default StaffDashboardView;
