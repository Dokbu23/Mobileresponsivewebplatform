import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  Eye,
  Sparkles,
  Building2,
  Package,
  MapPin,
  Calendar,
  X,
  Search,
  Activity,
  Layers,
  AlertCircle,
  Loader2,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { getJSON } from '../../lib/api';
import {
  exportReportToExcel,
  exportReportToPdf,
  printReportTab,
  MonthlyReportPayload,
  getReportMonthName,
  getReportFileName,
  getActiveTabLabel,
} from '../../lib/reportExport';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

interface MonthlyTourismReportsProps {
  embedded?: boolean;
}

export function MonthlyTourismReports({ embedded = false }: MonthlyTourismReportsProps) {
  const [reportMonth, setReportMonth] = useState<number>(9); // Default to Sept 2026 where records exist
  const [reportYear, setReportYear] = useState<number>(2026);
  const [activeReportData, setActiveReportData] = useState<MonthlyReportPayload | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'resorts' | 'products'>('summary');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [quickActionLoadingKey, setQuickActionLoadingKey] = useState<string | null>(null);

  // ── DYNAMIC MONTHLY TOURISM REPORTS API RETRIEVAL ──
  const fetchMonthlyReport = async (monthNum: number, yearNum: number, openModalAfter = false): Promise<MonthlyReportPayload | null> => {
    setIsGeneratingReport(true);
    try {
      const res = await getJSON(`/admin/monthly-report?month=${monthNum}&year=${yearNum}`);
      if (res && res.success && res.data) {
        setActiveReportData(res.data);
        if (openModalAfter) {
          setReportModalOpen(true);
        }
        return res.data;
      } else {
        throw new Error(res?.message || 'Failed to retrieve report data');
      }
    } catch (err: any) {
      console.error('Error fetching monthly report:', err);
      toast.error(err?.message || 'Failed to retrieve database report records');
      return null;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Initial load of report for the default selected month
  useEffect(() => {
    fetchMonthlyReport(reportMonth, reportYear, false);
  }, []);

  const handleGenerateReportClick = async () => {
    const data = await fetchMonthlyReport(reportMonth, reportYear, true);
    if (data) {
      toast.success(`Generated official report for ${getReportMonthName(reportMonth)} ${reportYear}`);
    }
  };

  const handleDownloadExcel = async (specificData?: MonthlyReportPayload) => {
    let target = specificData || activeReportData;
    if (!target) {
      target = await fetchMonthlyReport(reportMonth, reportYear, false);
    }
    if (!target) return;

    setIsExportingExcel(true);
    try {
      await exportReportToExcel(target, { activeTab: 'all' });
      toast.success(`Downloaded Excel: ${getReportFileName(target.report_meta.month, target.report_meta.year, 'xlsx')}`);
    } catch (err: any) {
      console.error('Failed to export Excel report:', err);
      toast.error('Failed to export Excel report');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadPdf = async (specificData?: MonthlyReportPayload) => {
    let target = specificData || activeReportData;
    if (!target) {
      target = await fetchMonthlyReport(reportMonth, reportYear, false);
    }
    if (!target) return;

    setIsExportingPdf(true);
    try {
      await exportReportToPdf(target, { activeTab: 'all' });
      toast.success(`Downloaded PDF: ${getReportFileName(target.report_meta.month, target.report_meta.year, 'pdf')}`);
    } catch (err: any) {
      console.error('Failed to export PDF report:', err);
      toast.error('Failed to export PDF report');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── MODAL EXPORT HANDLERS (EXPORTS STRICTLY THE ACTIVE TAB) ──
  const handleModalDownloadExcel = async () => {
    if (!activeReportData) return;
    setIsExportingExcel(true);
    try {
      await exportReportToExcel(activeReportData, {
        activeTab: activeReportTab,
      });
      const fileName = getReportFileName(
        activeReportData.report_meta.month,
        activeReportData.report_meta.year,
        'xlsx',
        activeReportTab
      );
      toast.success(`Downloaded Excel (${getActiveTabLabel(activeReportTab)}): ${fileName}`);
    } catch (err: any) {
      console.error('Failed to export active tab to Excel:', err);
      toast.error('Failed to export active tab to Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleModalDownloadPdf = async () => {
    if (!activeReportData) return;
    setIsExportingPdf(true);
    try {
      await exportReportToPdf(activeReportData, {
        activeTab: activeReportTab,
      });
      const fileName = getReportFileName(
        activeReportData.report_meta.month,
        activeReportData.report_meta.year,
        'pdf',
        activeReportTab
      );
      toast.success(`Downloaded PDF (${getActiveTabLabel(activeReportTab)}): ${fileName}`);
    } catch (err: any) {
      console.error('Failed to export active tab to PDF:', err);
      toast.error('Failed to export active tab to PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleModalPrint = () => {
    if (!activeReportData) return;
    printReportTab(activeReportData, {
      activeTab: activeReportTab,
    });
  };

  // Quick Action for specific month card
  const handleQuickMonthAction = async (monthNum: number, yearNum: number, action: 'preview' | 'excel' | 'pdf') => {
    const key = `${monthNum}-${yearNum}-${action}`;
    setQuickActionLoadingKey(key);
    try {
      setReportMonth(monthNum);
      setReportYear(yearNum);
      const data = await fetchMonthlyReport(monthNum, yearNum, action === 'preview');
      if (!data) return;

      if (action === 'excel') {
        await handleDownloadExcel(data);
      } else if (action === 'pdf') {
        await handleDownloadPdf(data);
      }
    } finally {
      setQuickActionLoadingKey(null);
    }
  };

  // Monthly Reports list populated from recent months
  const monthlyReports = useMemo(() => {
    const curYear = reportYear || 2026;
    const curMonth = reportMonth || 9;
    const list: Array<{ monthNum: number; yearNum: number; label: string }> = [];

    for (let i = 0; i < 4; i++) {
      let m = curMonth - i;
      let y = curYear;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      list.push({
        monthNum: m,
        yearNum: y,
        label: `${getReportMonthName(m)} ${y}`,
      });
    }

    return list;
  }, [reportMonth, reportYear]);

  return (
    <div id="monthly-tourism-reports" className="space-y-6">
      {/* If standalone page (not embedded in dashboard), render prominent page title and breadcrumbs */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/admin/dashboard" className="hover:text-pink-600 transition-colors">
                Admin Dashboard
              </Link>
              <span>/</span>
              <span className="text-pink-600 font-bold">Monthly Tourism Reports</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-xs">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
                  Monthly Tourism Reports
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Municipality of Mansalay, Oriental Mindoro — official database-driven tourism documentation
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/admin/dashboard"
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Reports Container Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-gray-100 dark:border-slate-700/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] space-y-6">
        {/* Header & Subtitle (Shown when embedded in dashboard) */}
        {embedded && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                    Monthly Tourism Reports
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Municipality of Mansalay, Oriental Mindoro — official database-driven tourism documentation
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Control Bar: Month, Year, Generate, Preview, PDF, Excel */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="report-month-select" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Month:
              </label>
              <select
                id="report-month-select"
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-2xs cursor-pointer"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="report-year-select" className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Year:
              </label>
              <select
                id="report-year-select"
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-2xs cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Report Button */}
            <button
              type="button"
              onClick={handleGenerateReportClick}
              disabled={isGeneratingReport}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>

          {/* Export and Preview Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Preview Button */}
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              disabled={!activeReportData}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
              <span>Preview</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={() => handleDownloadPdf()}
              disabled={isExportingPdf || !activeReportData}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                  <span>PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5 text-rose-500" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Download Excel Button */}
            <button
              type="button"
              onClick={() => handleDownloadExcel()}
              disabled={isExportingExcel || !activeReportData}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Download Excel</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Period Highlights Snapshot Card */}
        {activeReportData && (
          <div className="bg-gradient-to-br from-white to-pink-50/20 dark:from-slate-800/90 dark:to-slate-900/90 rounded-2xl p-5 border border-pink-100/80 dark:border-pink-900/40 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-pink-100/60 dark:border-slate-700/60">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-pink-600 dark:text-pink-400">
                  Selected Reporting Period
                </span>
                <h4 className="text-lg sm:text-xl font-black text-gray-900 dark:text-slate-100 mt-1">
                  {activeReportData.report_meta.reporting_period} Tourism Overview
                </h4>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-slate-300">Official Report ID:</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-lg border border-pink-100 dark:border-pink-900/50">
                  DM-MR-{activeReportData.report_meta.year}-{String(activeReportData.report_meta.month).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Metric Highlights Pills (5 Categories) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wide block">
                  New Tourists
                </span>
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 my-1 block leading-tight">
                  {activeReportData.monthly_summary.activity_metrics.new_registered_tourists.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">
                  Registered
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wide block">
                  New Content
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 my-1 block leading-tight">
                  {activeReportData.monthly_summary.activity_metrics.new_content_records.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">
                  Created
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs hover:border-amber-200 dark:hover:border-amber-800 transition-all">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wide block">
                  Updated Content
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 my-1 block leading-tight">
                  {activeReportData.monthly_summary.activity_metrics.updated_content_records.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">
                  Modified
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs hover:border-purple-200 dark:hover:border-purple-800 transition-all">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wide block">
                  Timeline Posts
                </span>
                <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 my-1 block leading-tight">
                  {activeReportData.monthly_summary.activity_metrics.new_timeline_posts.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">
                  Published
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xs hover:border-rose-200 dark:hover:border-rose-800 transition-all col-span-2 sm:col-span-1">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wide block">
                  Wishlist Saves
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 my-1 block leading-tight">
                  {activeReportData.monthly_summary.activity_metrics.wishlist_activity.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">
                  Bookmarks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Monthly Reports List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Recent Monthly Periods
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              Click preview or export on any reporting period
            </span>
          </div>

          <div className="space-y-2.5">
            {monthlyReports.map((reportItem) => {
              const isCurrentActive =
                reportMonth === reportItem.monthNum && reportYear === reportItem.yearNum;
              const isPreviewLoading =
                quickActionLoadingKey === `${reportItem.monthNum}-${reportItem.yearNum}-preview`;
              const isExcelLoading =
                quickActionLoadingKey === `${reportItem.monthNum}-${reportItem.yearNum}-excel`;
              const isPdfLoading =
                quickActionLoadingKey === `${reportItem.monthNum}-${reportItem.yearNum}-pdf`;

              return (
                <div
                  key={reportItem.label}
                  onClick={() => handleQuickMonthAction(reportItem.monthNum, reportItem.yearNum, 'preview')}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group gap-3 ${
                    isCurrentActive
                      ? 'border-pink-300 bg-pink-50/30 shadow-2xs'
                      : 'border-gray-100 hover:border-pink-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isCurrentActive
                          ? 'bg-pink-500 text-white shadow-xs'
                          : 'bg-pink-50 text-pink-600'
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-gray-900 group-hover:text-pink-600 transition-colors">
                          {reportItem.label} Tourism Report
                        </h4>
                        {isCurrentActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        Municipality of Mansalay • Official Monthly Archive
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Quick Preview Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickMonthAction(reportItem.monthNum, reportItem.yearNum, 'preview')}
                      disabled={isPreviewLoading}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="View detailed preview"
                    >
                      {isPreviewLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                      )}
                      <span>Preview</span>
                    </button>

                    {/* Quick PDF Export */}
                    <button
                      type="button"
                      onClick={() => handleQuickMonthAction(reportItem.monthNum, reportItem.yearNum, 'pdf')}
                      disabled={isPdfLoading}
                      className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Export PDF"
                    >
                      {isPdfLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-rose-500" />
                      )}
                      <span>PDF</span>
                    </button>

                    {/* Quick Excel Export */}
                    <button
                      type="button"
                      onClick={() => handleQuickMonthAction(reportItem.monthNum, reportItem.yearNum, 'excel')}
                      disabled={isExcelLoading}
                      className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Export Excel"
                    >
                      {isExcelLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL: COMPREHENSIVE OFFICIAL REPORT PREVIEW ── */}
      {reportModalOpen && activeReportData && (
        <div
          id="report-preview-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setReportModalOpen(false)}
        >
          <div
            id="report-preview-modal-container"
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Clean White & Pink Modern Municipal Header */}
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center shadow-2xs flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-pink-600">
                      DiscoverMansalay Official
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-600 font-semibold border border-pink-100">
                      {activeReportData.report_meta.reporting_period}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mt-1">
                    Monthly Tourism Report
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {activeReportData.report_meta.lgu_title} • Generated by: {activeReportData.report_meta.generated_by.name} ({activeReportData.report_meta.generated_by.email})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer report-no-print print:hidden"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Print Only Banner: Identifies active section on printouts */}
            <div className="hidden report-print-only px-6 py-2.5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                <span>
                  Active Report Section: <strong className="text-pink-600 font-extrabold">{getActiveTabLabel(activeReportTab)}</strong>
                </span>
                <span className="text-gray-500 font-normal text-[11px]">
                  Municipality of Mansalay, Oriental Mindoro
                </span>
              </div>
            </div>

            {/* Modal Navigation Tabs (Clean White & Pink Tab Bar) */}
            <div className="px-6 border-b border-slate-100 bg-white flex items-center justify-between sm:justify-start gap-4 sm:gap-8 overflow-x-auto text-xs font-semibold report-no-print print:hidden">
              <button
                type="button"
                onClick={() => setActiveReportTab('summary')}
                className={`py-3.5 whitespace-nowrap cursor-pointer transition-colors border-b-2 report-no-print print:hidden ${
                  activeReportTab === 'summary'
                    ? 'border-pink-500 text-pink-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                1. Monthly Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveReportTab('resorts')}
                className={`py-3.5 whitespace-nowrap cursor-pointer transition-colors border-b-2 report-no-print print:hidden ${
                  activeReportTab === 'resorts'
                    ? 'border-pink-500 text-pink-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                2. Resorts & Stays ({activeReportData.resort_and_stays.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveReportTab('products')}
                className={`py-3.5 whitespace-nowrap cursor-pointer transition-colors border-b-2 report-no-print print:hidden ${
                  activeReportTab === 'products'
                    ? 'border-pink-500 text-pink-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                3. Community Products ({activeReportData.community_products.length})
              </button>
            </div>

            {/* Modal Body: Active Tab Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800 bg-white">

              {/* ── TAB 1: EXECUTIVE MONTHLY SUMMARY & FINAL COMPARISON ── */}
              {activeReportTab === 'summary' && (
                <div className="space-y-6">
                  {/* Period Metadata Card */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Official Scope</span>
                      <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                        {activeReportData.report_meta.platform_name} — {activeReportData.report_meta.reporting_period}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Start-Inclusive & Next-Month-Exclusive Range: {activeReportData.report_meta.start_date} to {activeReportData.report_meta.end_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Generated</span>
                      <p className="text-xs font-semibold text-gray-700">{activeReportData.report_meta.date_generated}</p>
                    </div>
                  </div>

                  {/* Monthly Activity Highlights */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-pink-500" />
                      <span>Monthly Activity Counts (Strictly within selected month)</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-700 uppercase">New Tourists</span>
                        <h4 className="text-xl font-black text-blue-900 mt-1">
                          {activeReportData.monthly_summary.activity_metrics.new_registered_tourists}
                        </h4>
                        <span className="text-[10px] text-blue-600 font-medium">Registered Accounts</span>
                      </div>
                      <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">New Content</span>
                        <h4 className="text-xl font-black text-emerald-900 mt-1">
                          {activeReportData.monthly_summary.activity_metrics.new_content_records}
                        </h4>
                        <span className="text-[10px] text-emerald-600 font-medium">Creations recorded</span>
                      </div>
                      <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Updated Content</span>
                        <h4 className="text-xl font-black text-amber-900 mt-1">
                          {activeReportData.monthly_summary.activity_metrics.updated_content_records}
                        </h4>
                        <span className="text-[10px] text-amber-600 font-medium">Timestamps verified</span>
                      </div>
                      <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100">
                        <span className="text-[10px] font-bold text-rose-700 uppercase">Wishlist Saves</span>
                        <h4 className="text-xl font-black text-rose-900 mt-1">
                          {activeReportData.monthly_summary.activity_metrics.wishlist_activity}
                        </h4>
                        <span className="text-[10px] text-rose-600 font-medium">Bookmarked items</span>
                      </div>
                    </div>
                  </div>

                  {/* Current-State Totals */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-slate-600" />
                      <span>Current-State Platform Totals (Cumulative)</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Total Tourists</span>
                        <h4 className="text-lg font-black text-gray-900 mt-1">
                          {activeReportData.monthly_summary.current_state_totals.total_registered_tourists}
                        </h4>
                        <span className="text-[10px] text-gray-400">All-time tourist accounts</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Active Resorts</span>
                        <h4 className="text-lg font-black text-gray-900 mt-1">
                          {activeReportData.monthly_summary.current_state_totals.total_active_resorts}
                        </h4>
                        <span className="text-[10px] text-gray-400">Approved accommodations</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Active Enterprises</span>
                        <h4 className="text-lg font-black text-gray-900 mt-1">
                          {activeReportData.monthly_summary.current_state_totals.total_active_enterprises}
                        </h4>
                        <span className="text-[10px] text-gray-400">Community shops</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">360 Virtual Tours</span>
                        <h4 className="text-lg font-black text-gray-900 mt-1">
                          {activeReportData.monthly_summary.current_state_totals.destinations_with_360_tours}
                        </h4>
                        <span className="text-[10px] text-gray-400">Panoramic tour scenes</span>
                      </div>
                    </div>
                  </div>

                  {/* Final Summary Comparison Table */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                      Monthly Activity vs. Cumulative Status Comparison
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase">
                            <th className="pb-2">Metric Entity</th>
                            <th className="pb-2 text-right">Activity in Month</th>
                            <th className="pb-2 text-right">Current-State Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Tourists / Users</td>
                            <td className="py-2 text-right font-bold text-blue-600">
                              +{activeReportData.monthly_summary.activity_metrics.new_registered_tourists}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">
                              {activeReportData.monthly_summary.current_state_totals.total_registered_tourists}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Resort & Accommodation Profiles</td>
                            <td className="py-2 text-right font-bold text-emerald-600">
                              +{activeReportData.monthly_summary.activity_metrics.new_resorts_registered}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">
                              {activeReportData.monthly_summary.current_state_totals.total_active_resorts}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Community Enterprises</td>
                            <td className="py-2 text-right font-bold text-emerald-600">
                              +{activeReportData.monthly_summary.activity_metrics.new_enterprises_registered}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">
                              {activeReportData.monthly_summary.current_state_totals.total_active_enterprises}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Tourism Content Items</td>
                            <td className="py-2 text-right font-bold text-amber-600">
                              +{activeReportData.monthly_summary.activity_metrics.new_content_records}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">
                              {activeReportData.monthly_summary.current_state_totals.total_attractions_listed + activeReportData.monthly_summary.current_state_totals.total_products_listed + activeReportData.monthly_summary.current_state_totals.total_events_listed}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Timeline / Social Posts</td>
                            <td className="py-2 text-right font-bold text-purple-600">
                              +{activeReportData.monthly_summary.activity_metrics.new_timeline_posts}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">
                              {activeReportData.resort_and_stays.reduce((acc, r) => acc + r.timeline_posts_month, 0) + activeReportData.community_products.reduce((acc, p) => acc + p.promotional_posts, 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Wishlist Saves</td>
                            <td className="py-2 text-right font-bold text-rose-600">
                              +{activeReportData.monthly_summary.activity_metrics.wishlist_activity}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">-</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold text-gray-800">Inquiries Received</td>
                            <td className="py-2 text-right font-bold text-indigo-600">
                              +{activeReportData.monthly_summary.activity_metrics.inquiries_submitted}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-600">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: RESORTS & STAYS ACTIVITY TABLE (CLEAN WHITE & PINK DASHBOARD) ── */}
              {activeReportTab === 'resorts' && (
                <div className="bg-white rounded-2xl border border-pink-100/70 p-5 shadow-2xs space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        Resorts & Accommodations Activity ({activeReportData.resort_and_stays.length} Resorts)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Summary of resort listings, associated owners, rooms cataloged, 360 virtual tours, and inquiries.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-pink-100/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-pink-50/40 text-slate-700 text-xs font-bold border-b border-pink-100/60">
                        <tr>
                          <th className="py-3 px-4 font-bold">Resort Name</th>
                          <th className="py-3 px-4 font-bold">Owner / Contact</th>
                          <th className="py-3 px-4 font-bold">Location</th>
                          <th className="py-3 px-4 text-right font-bold">Total Rooms</th>
                          <th className="py-3 px-4 text-right font-bold">New Rooms (Mo)</th>
                          <th className="py-3 px-4 text-right font-bold">Timeline Posts</th>
                          <th className="py-3 px-4 text-center font-bold">360 Virtual Tour</th>
                          <th className="py-3 px-4 text-right font-bold">Wishlist Saves</th>
                          <th className="py-3 px-4 text-right font-bold">Inquiries</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pink-100/40 bg-white">
                        {activeReportData.resort_and_stays.map((r, idx) => (
                          <tr key={idx} className="hover:bg-pink-50/20 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 text-xs sm:text-sm">
                              {r.resort_name}
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <div className="font-medium text-slate-800">{r.owner_name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {r.phone && r.phone !== 'Not Provided' ? r.phone : 'Not Provided'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs">
                              {r.location}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-xs sm:text-sm">
                              {r.total_rooms}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-xs sm:text-sm text-pink-600">
                              +{r.new_rooms_month}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-600 text-xs font-medium">
                              {r.timeline_posts_month}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {r.has_virtual_tour ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-600 font-bold text-[11px] border border-pink-100">
                                  Yes ({r.vt_scene_count} scenes)
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-xs">None</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-xs sm:text-sm text-pink-600">
                              {r.wishlist_saves_month}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-xs sm:text-sm text-pink-600">
                              {r.inquiries_month}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 4: COMMUNITY PRODUCTS ACTIVITY TABLE ── */}
              {activeReportTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Community Products Activity ({activeReportData.community_products.length} Products)
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Artisan crafts, delicacies, and local products with prices, stock, promotional posts, and saves.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Promotion Platform (Direct Contact Order Mode)
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800 text-white text-[11px] font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Product Name</th>
                            <th className="py-2.5 px-3">Enterprise / Producer</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Price</th>
                            <th className="py-2.5 px-3 text-right">Stock</th>
                            <th className="py-2.5 px-3 text-center">Month Activity</th>
                            <th className="py-2.5 px-3 text-right">Promo Posts</th>
                            <th className="py-2.5 px-3 text-right">Wishlist Saves</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {activeReportData.community_products.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-gray-900">{p.product_name}</td>
                              <td className="py-2.5 px-3 text-gray-600">{p.enterprise_name}</td>
                              <td className="py-2.5 px-3 text-gray-600">{p.category}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                                ₱{p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-700">{p.stock}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    p.action_in_month.includes('New')
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : p.action_in_month.includes('Updated')
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {p.action_in_month}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-purple-600">{p.promotional_posts}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-600">{p.wishlist_saves}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 report-no-print print:hidden">
              <span className="text-xs text-slate-500 font-medium">
                Active Target: <strong className="text-pink-600 font-bold">{getActiveTabLabel(activeReportTab)}</strong>
              </span>

              <div className="flex items-center gap-2.5 report-no-print print:hidden">
                <button
                  type="button"
                  onClick={handleModalPrint}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Print active report tab"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleModalDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-4 py-2 bg-white border border-pink-400 hover:bg-pink-50 text-pink-600 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Export active tab to PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-600" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-pink-600" />
                  )}
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleModalDownloadExcel}
                  disabled={isExportingExcel}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Export active tab to Excel"
                >
                  {isExportingExcel ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                  )}
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Official Print Document Footer */}
            <div className="hidden report-print-only px-6 py-3 border-t border-gray-200 text-center text-[10px] text-gray-500">
              DiscoverMansalay — Tourism Promotion Platform  |  Official Documentation  |  Municipality of Mansalay, Oriental Mindoro
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
