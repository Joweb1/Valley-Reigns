import React, { useState, useEffect } from "react";
import { 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Database, 
  ShieldCheck, 
  MessageSquare, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Activity,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { runMessagingTestSuite } from "../lib/chatDiagnostics";
import { getChatTestReports } from "../lib/services";
import { ChatTestSuiteReport, ChatTestScenarioResult } from "../types";
import { useAuth } from "../context/AuthContext";

interface ChatMessagingTesterProps {
  inline?: boolean;
}

export const ChatMessagingTester: React.FC<ChatMessagingTesterProps> = ({ inline = false }) => {
  const { currentUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [totalScenarios, setTotalScenarios] = useState(8);
  const [currentReport, setCurrentReport] = useState<ChatTestSuiteReport | null>(null);
  const [liveScenarios, setLiveScenarios] = useState<ChatTestScenarioResult[]>([]);
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
  const [pastReports, setPastReports] = useState<ChatTestSuiteReport[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"runner" | "history">("runner");

  const loadPastReports = async () => {
    setIsLoadingHistory(true);
    try {
      const reports = await getChatTestReports();
      setPastReports(reports);
    } catch (e) {
      console.warn("Failed to load past test reports:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPastReports();
  }, []);

  const handleRunTests = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLiveScenarios([]);
    setCurrentReport(null);

    const executedByName = currentUser?.displayName || currentUser?.email || "Admin Operator";

    try {
      const report = await runMessagingTestSuite(executedByName, (scenario, currentStep, totalSteps) => {
        setCurrentScenarioIndex(currentStep);
        setTotalScenarios(totalSteps);
        setLiveScenarios(prev => {
          const filtered = prev.filter(s => s.id !== scenario.id);
          return [...filtered, scenario];
        });
      });

      setCurrentReport(report);
      // Auto-expand any failed scenarios, or the first scenario
      const initialExpand: Record<string, boolean> = {};
      report.scenarios.forEach((s, idx) => {
        if (s.status === "failed" || idx === 0) {
          initialExpand[s.id] = true;
        }
      });
      setExpandedScenarios(initialExpand);
      loadPastReports();
    } catch (err) {
      console.error("Test Suite Runner Error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedScenarios(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className={`w-full ${inline ? "p-0" : "bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6"}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              Messaging & Real-Time Chat Diagnostic Suite
            </h2>
            <p className="text-xs text-slate-500">
              End-to-end automated verification of Firestore chat pipeline, auto-claims, delivery speeds, and staff channels.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("runner")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "runner" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Test Runner
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                loadPastReports();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "history" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Run History
            </button>
          </div>

          <button
            type="button"
            onClick={handleRunTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running ({currentScenarioIndex}/{totalScenarios})...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run All Messaging Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {activeTab === "runner" ? (
        <div className="mt-5 space-y-6">
          {/* Active Run Status Bar / Progress */}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900"
            >
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                  Executing Scenario {currentScenarioIndex} of {totalScenarios}
                </span>
                <span className="text-blue-600 font-mono">
                  {Math.round((currentScenarioIndex / totalScenarios) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentScenarioIndex / totalScenarios) * 100}%` }}
                />
              </div>
            </motion.div>
          )}

          {/* Results Scorecard (When report completed) */}
          {currentReport && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 md:p-5 rounded-2xl border ${
                currentReport.overallStatus === "passed"
                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                  : "bg-rose-50/60 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {currentReport.overallStatus === "passed" ? (
                    <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-500 text-white rounded-xl shadow-xs">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {currentReport.overallStatus === "passed"
                        ? "All Messaging Scenarios Passed Successfully"
                        : "Messaging Diagnostics Identified Issues"}
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">
                      Executed in {currentReport.totalDurationMs}ms • Automated Firestore cleanup completed
                    </p>
                  </div>
                </div>

                {/* Metric Badges */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="px-3 py-1.5 bg-white/80 rounded-xl border border-black/5 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Passed</span>
                    <span className="text-sm font-extrabold text-emerald-600">
                      {currentReport.summary.passed} / {currentReport.summary.total}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/80 rounded-xl border border-black/5 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Failed</span>
                    <span className={`text-sm font-extrabold ${currentReport.summary.failed > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {currentReport.summary.failed}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/80 rounded-xl border border-black/5 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Latency</span>
                    <span className="text-sm font-extrabold text-blue-600 font-mono">
                      {currentReport.summary.avgLatencyMs} ms
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scenario Step-by-Step Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Diagnostic Scenarios & Assertion Matrix
            </h4>

            {((currentReport ? currentReport.scenarios : liveScenarios).length === 0 && !isRunning) ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No test run executed yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "Run All Messaging Tests" to test the real-time application messaging flow, auto-claim triggers, latency, and staff channels.
                </p>
              </div>
            ) : (
              (currentReport ? currentReport.scenarios : liveScenarios).map((scenario, sIdx) => {
                const isExpanded = expandedScenarios[scenario.id];
                const isPassed = scenario.status === "passed";
                const isRunningScenario = scenario.status === "running";

                return (
                  <div
                    key={scenario.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isRunningScenario
                        ? "bg-blue-50/40 border-blue-300 shadow-xs"
                        : isPassed
                        ? "bg-white border-slate-200/90 hover:border-slate-300"
                        : "bg-rose-50/30 border-rose-200"
                    }`}
                  >
                    {/* Scenario Header Bar */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(scenario.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isRunningScenario ? (
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        ) : isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-2">
                            <span>{sIdx + 1}. {scenario.name}</span>
                            {scenario.durationMs > 0 && (
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                ({scenario.durationMs}ms)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {scenario.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isRunningScenario
                            ? "bg-blue-100 text-blue-700 animate-pulse"
                            : isPassed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {scenario.status}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Detailed Assertion List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2"
                        >
                          <p className="text-[11px] font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80">
                            <strong>Details:</strong> {scenario.details}
                          </p>

                          {scenario.metrics && (
                            <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                              {scenario.metrics.latencyMs !== undefined && (
                                <span className="px-2 py-1 bg-white rounded-md border border-slate-200 font-mono">
                                  ⏱️ Latency: <strong>{scenario.metrics.latencyMs}ms</strong>
                                </span>
                              )}
                              {scenario.metrics.docId && (
                                <span className="px-2 py-1 bg-white rounded-md border border-slate-200 font-mono text-[10px]">
                                  📄 Doc ID: {scenario.metrics.docId}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Assertions ({scenario.assertions.filter(a => a.passed).length}/{scenario.assertions.length} Passed):
                            </span>
                            {scenario.assertions.map((assertion, aIdx) => (
                              <div
                                key={aIdx}
                                className="flex items-start gap-2 text-xs py-1 px-2 rounded-md bg-white border border-slate-100"
                              >
                                {assertion.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span className={`font-medium ${assertion.passed ? "text-slate-800" : "text-rose-700 font-bold"}`}>
                                    {assertion.name}
                                  </span>
                                  {assertion.error && (
                                    <p className="text-[10px] text-rose-600 font-mono mt-0.5 break-all">
                                      Error: {assertion.error}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit Logs of Prior Diagnostic Runs
            </h4>
            <button
              type="button"
              onClick={loadPastReports}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Refresh History
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading test audit history...
            </div>
          ) : pastReports.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No test runs recorded in database</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Run the diagnostic suite to generate persistent audit reports.
              </p>
            </div>
          ) : (
            pastReports.map((r, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  {r.overallStatus === "passed" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Executed by {r.executedBy || "Admin"} • {new Date(r.timestamp).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {r.summary.passed}/{r.summary.total} Scenarios Passed • Avg Latency: {r.summary.avgLatencyMs}ms • Duration: {r.totalDurationMs}ms
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentReport(r);
                    setActiveTab("runner");
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>View Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
