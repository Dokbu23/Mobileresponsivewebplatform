import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MonthlyReportPayload {
  report_meta: {
    platform_name: string;
    report_title: string;
    lgu_title: string;
    reporting_period: string;
    month: number;
    year: number;
    start_date: string;
    end_date: string;
    date_generated: string;
    generated_by: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
  };
  monthly_summary: {
    activity_metrics: {
      new_registered_tourists: number;
      new_resorts_registered: number;
      new_enterprises_registered: number;
      new_content_records: number;
      updated_content_records: number;
      new_timeline_posts: number;
      events_scheduled_in_month: number;
      wishlist_activity: number;
      inquiries_submitted: number;
    };
    current_state_totals: {
      total_registered_tourists: number;
      total_active_resorts: number;
      total_active_enterprises: number;
      total_attractions_listed: number;
      total_products_listed: number;
      total_resort_rooms_listed: number;
      total_events_listed: number;
      destinations_with_360_tours: number;
      all_time_users: number;
    };
  };
  tourism_content_activity: Array<{
    id: number;
    type: string;
    title: string;
    category: string;
    owner_or_enterprise: string;
    action: string;
    date: string;
    raw_date: string;
    status: string;
  }>;
  resort_and_stays: Array<{
    resort_id: number;
    resort_name: string;
    owner_name: string;
    email: string;
    phone: string;
    location: string;
    listing_status: string;
    is_active: boolean;
    total_rooms: number;
    new_rooms_month: number;
    updated_rooms_month: number;
    timeline_posts_month: number;
    has_virtual_tour: boolean;
    vt_scene_count: number;
    wishlist_saves_month: number;
    inquiries_month: number;
  }>;
  community_products: Array<{
    product_id: number;
    product_name: string;
    enterprise_name: string;
    category: string;
    price: number;
    stock: number;
    status: string;
    action_in_month: string;
    created_at: string;
    updated_at: string;
    promotional_posts: number;
    wishlist_saves: number;
    inquiries: number;
    direct_order_mode: string;
  }>;
  tourist_engagement: {
    wishlist_saves_in_month: number;
    wishlist_saves_by_type: {
      attractions: number;
      accommodations: number;
      products: number;
      events: number;
    };
    inquiries_in_month: number;
    monthly_views_tracking_status: string;
    search_queries_status: string;
    contact_clicks_status: string;
    top_destinations_lifetime: Array<{
      name: string;
      category: string;
      views: number;
      type: string;
    }>;
  };
  itinerary_activity: {
    official_itineraries_count: number;
    official_itineraries_list: Array<{
      id: number;
      title: string;
      category: string;
      location: string;
    }>;
    user_custom_itineraries_status: string;
    ai_itineraries_status: string;
    frequently_selected_destinations: Array<{
      name: string;
      category: string;
      location: string;
    }>;
  };
  inquiry_summary: {
    total_inquiries: number;
    by_recipient_type: {
      to_resorts: number;
      to_enterprises: number;
      to_admin: number;
    };
    details: Array<{
      id: number;
      date: string;
      sender_name: string;
      sender_role: string;
      recipient_name: string;
      recipient_role: string;
      message_snippet: string;
      is_read: boolean;
    }>;
  };
  activity_trends: Array<{
    week: string;
    new_users: number;
    tourism_posts: number;
    wishlists: number;
    inquiries: number;
  }>;
}

export interface ReportExportOptions {
  activeTab?: 'summary' | 'content' | 'resorts' | 'products' | 'engagement' | 'trends' | 'all';
  contentFilterType?: string;
  contentSearchQuery?: string;
}

export const TAB_FILE_SLUGS: Record<string, string> = {
  summary: 'Monthly_Summary',
  content: 'Tourism_Content',
  resorts: 'Resorts_and_Stays',
  products: 'Community_Products',
  engagement: 'Engagement_and_Inquiries',
  trends: 'Trends_and_Itineraries',
};

export const TAB_LABELS: Record<string, string> = {
  summary: 'Monthly Summary',
  content: 'Tourism Content Activity',
  resorts: 'Resorts & Stays Activity',
  products: 'Community Products Activity',
  engagement: 'Engagement & Inquiries',
  trends: 'Trends & Itineraries',
};

export function getActiveTabLabel(tabKey?: string): string {
  if (!tabKey || tabKey === 'all') return 'Comprehensive Monthly Report';
  return TAB_LABELS[tabKey] || tabKey;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getReportMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] || `Month_${monthNumber}`;
}

export function getReportFileName(
  month: number,
  year: number,
  ext: 'xlsx' | 'pdf',
  tabKey?: string
): string {
  const monthName = getReportMonthName(month);
  const tabSlug = tabKey && tabKey !== 'all' && TAB_FILE_SLUGS[tabKey] ? `${TAB_FILE_SLUGS[tabKey]}_` : '';
  return `DiscoverMansalay_Monthly_Report_${tabSlug}${monthName}_${year}.${ext}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT WORKBOOK STYLES & BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

const primaryHeaderColor = 'FF1E293B'; // Slate 800
const zebraColor = 'FFF8FAFC';         // Slate 50
const borderColor = 'FFE2E8F0';        // Slate 200

const applyTableBorders = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: borderColor } },
    left: { style: 'thin', color: { argb: borderColor } },
    bottom: { style: 'thin', color: { argb: borderColor } },
    right: { style: 'thin', color: { argb: borderColor } },
  };
};

const addOfficialHeader = (
  ws: ExcelJS.Worksheet,
  report: MonthlyReportPayload,
  subtitle: string,
  mergeCols = 6
) => {
  const endColLetter = String.fromCharCode(64 + Math.max(3, Math.min(26, mergeCols)));

  ws.mergeCells(`A1:${endColLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = 'DiscoverMansalay — Official Monthly Tourism Report';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 28;

  ws.mergeCells(`A2:${endColLetter}2`);
  const lguCell = ws.getCell('A2');
  lguCell.value = `${report.report_meta.lgu_title}  |  ${subtitle}`;
  lguCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  lguCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(2).height = 18;

  ws.mergeCells(`A3:${endColLetter}3`);
  const metaCell = ws.getCell('A3');
  metaCell.value = `Reporting Period: ${report.report_meta.reporting_period}   •   Generated: ${report.report_meta.date_generated}   •   Authorized By: ${report.report_meta.generated_by.name} (${report.report_meta.generated_by.email})`;
  metaCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFE11D48' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(3).height = 18;

  ws.addRow([]); // Blank spacer row
  ws.getRow(4).height = 10;
};

const styleTableHeader = (row: ExcelJS.Row) => {
  row.height = 25;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: primaryHeaderColor },
    };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    applyTableBorders(cell);
  });
};

const autoSizeColumns = (ws: ExcelJS.Worksheet, minWidth = 14, maxWidth = 48) => {
  ws.columns.forEach((col) => {
    let maxLen = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : '';
      if (cell.row > 4 && val.length > maxLen) {
        maxLen = Math.min(val.length + 3, maxWidth);
      }
    });
    col.width = maxLen;
  });
};

// 1. Worksheet Builder: Monthly Summary
function buildSummaryWorksheet(wb: ExcelJS.Workbook, report: MonthlyReportPayload) {
  const ws = wb.addWorksheet('Monthly Summary', {
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Executive Tourism & Activity Summary', 3);

  // Table 1: Activity this month
  const actHeader = ws.addRow(['Metric Description', 'Classification', 'Count / Total']);
  styleTableHeader(actHeader);

  const actRows = [
    ['New Tourists Registered', 'Monthly Activity', report.monthly_summary.activity_metrics.new_registered_tourists],
    ['New Resort Businesses Registered', 'Monthly Activity', report.monthly_summary.activity_metrics.new_resorts_registered],
    ['New Enterprises Registered', 'Monthly Activity', report.monthly_summary.activity_metrics.new_enterprises_registered],
    ['New Tourism Content Created', 'Monthly Activity', report.monthly_summary.activity_metrics.new_content_records],
    ['Tourism Content Updated', 'Monthly Activity', report.monthly_summary.activity_metrics.updated_content_records],
    ['New Timeline / Enterprise Posts', 'Monthly Activity', report.monthly_summary.activity_metrics.new_timeline_posts],
    ['Events Scheduled Within Month', 'Monthly Activity', report.monthly_summary.activity_metrics.events_scheduled_in_month],
    ['Wishlist Saves Recorded', 'Monthly Activity', report.monthly_summary.activity_metrics.wishlist_activity],
    ['Direct Inquiries Submitted', 'Monthly Activity', report.monthly_summary.activity_metrics.inquiries_submitted],
  ];

  actRows.forEach((item, idx) => {
    const row = ws.addRow(item);
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(3).numFmt = '#,##0';

    row.eachCell((cell) => {
      applyTableBorders(cell);
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
    });
  });

  ws.addRow([]);
  ws.addRow([]);

  // Table 2: Cumulative Platform Totals
  const curHeader = ws.addRow(['Current-State Metric', 'Classification', 'Cumulative Total']);
  styleTableHeader(curHeader);

  const curRows = [
    ['Total Registered Tourists', 'Current-State Total', report.monthly_summary.current_state_totals.total_registered_tourists],
    ['Active Approved Resorts', 'Current-State Total', report.monthly_summary.current_state_totals.total_active_resorts],
    ['Active Approved Enterprises', 'Current-State Total', report.monthly_summary.current_state_totals.total_active_enterprises],
    ['Total Attractions Listed', 'Current-State Total', report.monthly_summary.current_state_totals.total_attractions_listed],
    ['Total Community Products', 'Current-State Total', report.monthly_summary.current_state_totals.total_products_listed],
    ['Total Resort Rooms & Stays', 'Current-State Total', report.monthly_summary.current_state_totals.total_resort_rooms_listed],
    ['Total Events Cataloged', 'Current-State Total', report.monthly_summary.current_state_totals.total_events_listed],
    ['Properties with 360 Virtual Tours', 'Current-State Total', report.monthly_summary.current_state_totals.destinations_with_360_tours],
    ['Total Registered User Accounts', 'Current-State Total', report.monthly_summary.current_state_totals.all_time_users],
  ];

  curRows.forEach((item, idx) => {
    const row = ws.addRow(item);
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(3).numFmt = '#,##0';

    row.eachCell((cell) => {
      applyTableBorders(cell);
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
    });
  });

  autoSizeColumns(ws, 18, 50);
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 2. Worksheet Builder: Tourism Content Activity (supports filters)
function buildContentWorksheet(
  wb: ExcelJS.Workbook,
  report: MonthlyReportPayload,
  contentList?: Array<MonthlyReportPayload['tourism_content_activity'][0]>,
  filterSubtitle?: string
) {
  const ws = wb.addWorksheet('Tourism Content Activity', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  const subtitle = filterSubtitle
    ? `Content Activity (${filterSubtitle})`
    : 'Content Creations & Record Updates';

  addOfficialHeader(ws, report, subtitle, 8);

  const cHeader = ws.addRow([
    'Content ID', 'Content Type', 'Title / Name', 'Category',
    'Associated Owner / Enterprise', 'Action Performed', 'Activity Date & Time', 'Status'
  ]);
  styleTableHeader(cHeader);

  const records = contentList || report.tourism_content_activity;

  if (records.length === 0) {
    const emptyRow = ws.addRow(['-', '-', 'No content records match the active filter for this reporting period.', '-', '-', '-', '-', '-']);
    emptyRow.height = 24;
    emptyRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    records.forEach((item, idx) => {
      const row = ws.addRow([
        item.id,
        item.type,
        item.title,
        item.category,
        item.owner_or_enterprise,
        item.action,
        item.date,
        item.status.toUpperCase(),
      ]);
      row.height = 22;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      row.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  autoSizeColumns(ws, 12, 45);
  ws.autoFilter = `A5:H${Math.max(6, 5 + records.length)}`;
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 3. Worksheet Builder: Resort & Stays Activity
function buildResortsWorksheet(wb: ExcelJS.Workbook, report: MonthlyReportPayload) {
  const ws = wb.addWorksheet('Resort & Stays Activity', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Accommodations, Rooms, Virtual Tours & Inquiries', 12);

  const rHeader = ws.addRow([
    'Resort ID', 'Resort Name', 'Owner / Representative', 'Contact Phone', 'Location / Barangay',
    'Total Rooms', 'New Rooms (Mo)', 'Updated Rooms (Mo)', 'Timeline Posts', 'Virtual Tour', 'Wishlist Saves', 'Inquiries Received'
  ]);
  styleTableHeader(rHeader);

  if (report.resort_and_stays.length === 0) {
    const emptyRow = ws.addRow(['-', 'No registered resort profiles found.', '-', '-', '-', 0, 0, 0, 0, 'No', 0, 0]);
    emptyRow.height = 24;
  } else {
    report.resort_and_stays.forEach((r, idx) => {
      const row = ws.addRow([
        r.resort_id,
        r.resort_name,
        r.owner_name,
        r.phone,
        r.location,
        r.total_rooms,
        r.new_rooms_month,
        r.updated_rooms_month,
        r.timeline_posts_month,
        r.has_virtual_tour ? `Yes (${r.vt_scene_count} scenes)` : 'Not Configured',
        r.wishlist_saves_month,
        r.inquiries_month,
      ]);
      row.height = 22;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

      for (let c = 6; c <= 12; c++) {
        if (c !== 10) row.getCell(c).numFmt = '#,##0';
      }

      row.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  autoSizeColumns(ws, 12, 40);
  ws.autoFilter = `A5:L${Math.max(6, 5 + report.resort_and_stays.length)}`;
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 4. Worksheet Builder: Community Products Activity
function buildProductsWorksheet(wb: ExcelJS.Workbook, report: MonthlyReportPayload) {
  const ws = wb.addWorksheet('Community Products Activity', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Artisan Products, Promotional Posts & Inquiries', 12);

  const pHeader = ws.addRow([
    'Product ID', 'Product Name', 'Enterprise / Producer', 'Category',
    'Price (PHP)', 'Stock', 'Status', 'Monthly Activity', 'Promo Posts', 'Wishlist Saves', 'Inquiries', 'Order Flow'
  ]);
  styleTableHeader(pHeader);

  if (report.community_products.length === 0) {
    const emptyRow = ws.addRow(['-', 'No community products found in the database.', '-', '-', 0, 0, '-', '-', 0, 0, 0, '-']);
    emptyRow.height = 24;
  } else {
    report.community_products.forEach((p, idx) => {
      const row = ws.addRow([
        p.product_id,
        p.product_name,
        p.enterprise_name,
        p.category,
        p.price,
        p.stock,
        p.status.toUpperCase(),
        p.action_in_month,
        p.promotional_posts,
        p.wishlist_saves,
        p.inquiries,
        'Direct Contact / Non-transactional'
      ]);
      row.height = 22;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(5).numFmt = '₱#,##0.00';
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).numFmt = '#,##0';
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(12).alignment = { horizontal: 'left', vertical: 'middle' };

      for (let c = 9; c <= 11; c++) row.getCell(c).numFmt = '#,##0';

      row.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  autoSizeColumns(ws, 12, 40);
  ws.autoFilter = `A5:L${Math.max(6, 5 + report.community_products.length)}`;
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 5. Worksheet Builder: Tourist Engagement & Inquiries
function buildEngagementWorksheet(
  wb: ExcelJS.Workbook,
  report: MonthlyReportPayload,
  includeInquiries = false
) {
  const ws = wb.addWorksheet('Tourist Engagement', {
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Wishlist Activity, Destination Views & Inquiries', 4);

  // Table 1: Wishlist breakdown
  const wHeader = ws.addRow(['Engagement Category', 'Target Item Type', 'Monthly Count']);
  styleTableHeader(wHeader);

  const wData = [
    ['Wishlist Saves', 'Attractions & Spots', report.tourist_engagement.wishlist_saves_by_type.attractions],
    ['Wishlist Saves', 'Resorts & Rooms', report.tourist_engagement.wishlist_saves_by_type.accommodations],
    ['Wishlist Saves', 'Community Products', report.tourist_engagement.wishlist_saves_by_type.products],
    ['Wishlist Saves', 'Festivals & Events', report.tourist_engagement.wishlist_saves_by_type.events],
    ['Direct Inquiries', 'Tourist-to-Business Messages', report.tourist_engagement.inquiries_in_month],
  ];

  wData.forEach((row, idx) => {
    const r = ws.addRow(row);
    r.height = 20;
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(3).numFmt = '#,##0';

    r.eachCell((cell) => {
      applyTableBorders(cell);
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
    });
  });

  ws.addRow([]);
  ws.addRow([]);

  // Table 2: Top Visited Destinations
  const topHeader = ws.addRow(['Rank', 'Destination Name', 'Category', 'Cumulative Lifetime Views']);
  styleTableHeader(topHeader);

  if (report.tourist_engagement.top_destinations_lifetime.length === 0) {
    const r = ws.addRow(['-', 'No attraction views recorded yet.', '-', 0]);
    r.height = 20;
  } else {
    report.tourist_engagement.top_destinations_lifetime.forEach((d, idx) => {
      const r = ws.addRow([idx + 1, d.name, d.category, d.views]);
      r.height = 20;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(4).numFmt = '#,##0';

      r.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  // If exporting engagement as a single active tab, also include the Inquiry Details table!
  if (includeInquiries && report.inquiry_summary.details.length > 0) {
    ws.addRow([]);
    ws.addRow([]);
    const inqHeader = ws.addRow([
      'Inquiry Date', 'Sender (Tourist)', 'Recipient (Business)', 'Subject / Message Snippet'
    ]);
    styleTableHeader(inqHeader);

    report.inquiry_summary.details.forEach((item, idx) => {
      const r = ws.addRow([
        item.date,
        item.sender_name,
        `${item.recipient_name} (${item.recipient_role})`,
        item.message_snippet,
      ]);
      r.height = 22;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      r.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  ws.addRow([]);
  const noteRow = ws.addRow(['* Note on Engagement Tracking:', report.tourist_engagement.monthly_views_tracking_status, '', '']);
  noteRow.getCell(1).font = { italic: true, bold: true, size: 9 };
  noteRow.getCell(2).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

  autoSizeColumns(ws, 14, 45);
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 6. Worksheet Builder: Itinerary Activity
function buildItineraryWorksheet(wb: ExcelJS.Workbook, report: MonthlyReportPayload) {
  const ws = wb.addWorksheet('Itinerary Activity', {
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Official Itineraries & Recommended Destinations', 4);

  const itHeader = ws.addRow(['Component', 'Availability / Status', 'Description']);
  styleTableHeader(itHeader);

  const itData = [
    ['Official Curated Itineraries', `${report.itinerary_activity.official_itineraries_count} Published Routes`, 'Official travel routes curated and published by Mansalay Tourism Office'],
    ['User Custom Itineraries', 'Active', 'Personalized travel plans saved by registered tourists'],
    ['AI-Generated Itineraries', 'On-Demand Service', 'Dynamic personalized recommendations generated via Tourism Assistant'],
  ];

  itData.forEach((row, idx) => {
    const r = ws.addRow(row);
    r.height = 22;
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    r.eachCell((cell) => {
      applyTableBorders(cell);
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
    });
  });

  ws.addRow([]);
  ws.addRow([]);

  const destHeader = ws.addRow(['Destination Name', 'Category', 'Location in Mansalay', 'Itinerary Suitability']);
  styleTableHeader(destHeader);

  report.itinerary_activity.frequently_selected_destinations.forEach((d, idx) => {
    const r = ws.addRow([d.name, d.category, d.location, 'Recommended Stop / Attraction']);
    r.height = 20;
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    r.eachCell((cell) => {
      applyTableBorders(cell);
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
    });
  });

  autoSizeColumns(ws, 16, 45);
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 7. Worksheet Builder: Inquiry Summary
function buildInquiriesWorksheet(wb: ExcelJS.Workbook, report: MonthlyReportPayload) {
  const ws = wb.addWorksheet('Inquiry Summary', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Direct Tourist Inquiries & Communication Records', 7);

  const inqHeader = ws.addRow([
    'Inquiry ID', 'Date & Time', 'Tourist / Sender', 'Recipient / Business',
    'Recipient Role', 'Message Preview / Inquiry Subject', 'Read Status'
  ]);
  styleTableHeader(inqHeader);

  if (report.inquiry_summary.details.length === 0) {
    const r = ws.addRow(['-', '-', 'No inquiries or direct messages recorded in this reporting period.', '-', '-', '-', '-']);
    r.height = 24;
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    report.inquiry_summary.details.forEach((item, idx) => {
      const r = ws.addRow([
        item.id,
        item.date,
        item.sender_name,
        item.recipient_name,
        item.recipient_role.toUpperCase(),
        item.message_snippet,
        item.is_read ? 'READ' : 'UNREAD',
      ]);
      r.height = 22;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(6).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

      r.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  autoSizeColumns(ws, 12, 45);
  ws.autoFilter = `A5:G${Math.max(6, 5 + report.inquiry_summary.details.length)}`;
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// 8. Worksheet Builder: Monthly Trends & Itineraries
function buildTrendsWorksheet(
  wb: ExcelJS.Workbook,
  report: MonthlyReportPayload,
  includeItineraries = false
) {
  const ws = wb.addWorksheet('Monthly Trends', {
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  addOfficialHeader(ws, report, 'Weekly Breakdown Across the Reporting Month', 5);

  const tHeader = ws.addRow([
    'Reporting Period / Week', 'New Registered Users', 'Tourism Timeline Posts', 'Wishlist Saves', 'Inquiries'
  ]);
  styleTableHeader(tHeader);

  report.activity_trends.forEach((t, idx) => {
    const r = ws.addRow([
      t.week,
      t.new_users,
      t.tourism_posts,
      t.wishlists,
      t.inquiries,
    ]);
    r.height = 22;
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 2; c <= 5; c++) r.getCell(c).numFmt = '#,##0';

    r.eachCell((cell) => {
      applyTableBorders(cell);
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
    });
  });

  if (includeItineraries) {
    ws.addRow([]);
    ws.addRow([]);

    const itHeader = ws.addRow(['Itinerary Planning Component', 'Status / Total', 'Description']);
    styleTableHeader(itHeader);

    const itRows = [
      ['Official Curated Itineraries', `${report.itinerary_activity.official_itineraries_count} Routes`, 'Published routes curated by Mansalay Tourism Office'],
      ['User Custom Itineraries', 'Active', 'Saved custom itineraries on tourist devices'],
      ['AI-Generated Itineraries', 'On-Demand', 'Generated via Tourism Assistant service'],
    ];

    itRows.forEach((row, idx) => {
      const r = ws.addRow(row);
      r.height = 20;
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      r.eachCell((cell) => {
        applyTableBorders(cell);
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      });
    });
  }

  autoSizeColumns(ws, 16, 35);
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT DISPATCHER (EXPORTS ONLY ACTIVE TAB WHEN SPECIFIED)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportReportToExcel(
  report: MonthlyReportPayload,
  options?: ReportExportOptions
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DiscoverMansalay Tourism Office';
  wb.lastModifiedBy = report.report_meta.generated_by.name || 'Admin';
  wb.created = new Date();
  wb.modified = new Date();

  const tab = options?.activeTab || 'all';

  if (tab === 'summary') {
    // Export ONLY Monthly Summary
    buildSummaryWorksheet(wb, report);
  } else if (tab === 'content') {
    // Export ONLY Tourism Content Activity, respecting active filters
    const filterType = options?.contentFilterType || 'all';
    const searchQuery = (options?.contentSearchQuery || '').trim().toLowerCase();

    const filtered = report.tourism_content_activity.filter((c) => {
      const matchType = filterType === 'all' || c.type === filterType;
      const matchQuery =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery) ||
        c.owner_or_enterprise.toLowerCase().includes(searchQuery);
      return matchType && matchQuery;
    });

    let subtitle = '';
    if (filterType !== 'all') subtitle += `Filter: ${filterType}`;
    if (searchQuery) subtitle += (subtitle ? ' | ' : '') + `Search: "${options?.contentSearchQuery}"`;
    if (subtitle) subtitle += ` (${filtered.length} Records)`;

    buildContentWorksheet(wb, report, filtered, subtitle);
  } else if (tab === 'resorts') {
    // Export ONLY Resort & Stays Activity
    buildResortsWorksheet(wb, report);
  } else if (tab === 'products') {
    // Export ONLY Community Products Activity
    buildProductsWorksheet(wb, report);
  } else if (tab === 'engagement') {
    // Export ONLY Tourist Engagement & Inquiries
    buildEngagementWorksheet(wb, report, true);
  } else if (tab === 'trends') {
    // Export ONLY Trends & Itineraries
    buildTrendsWorksheet(wb, report, true);
  } else {
    // Export ALL sheets for comprehensive full report
    buildSummaryWorksheet(wb, report);
    buildContentWorksheet(wb, report);
    buildResortsWorksheet(wb, report);
    buildProductsWorksheet(wb, report);
    buildEngagementWorksheet(wb, report);
    buildItineraryWorksheet(wb, report);
    buildInquiriesWorksheet(wb, report);
    buildTrendsWorksheet(wb, report);
  }

  // Generate buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getReportFileName(report.report_meta.month, report.report_meta.year, 'xlsx', tab);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT DISPATCHER (EXPORTS ONLY ACTIVE TAB WHEN SPECIFIED)
// ─────────────────────────────────────────────────────────────────────────────

export async function exportReportToPdf(
  report: MonthlyReportPayload,
  options?: ReportExportOptions
): Promise<void> {
  const tab = options?.activeTab || 'all';

  // Determine optimal orientation:
  // Wide tables (content, resorts, products) look best in landscape;
  // Executive summaries, engagement, and trends fit portrait cleanly.
  const isLandscape = tab === 'content' || tab === 'resorts' || tab === 'products';

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor: [number, number, number] = [30, 41, 59];    // Slate 800
  const accentColor: [number, number, number] = [225, 29, 72];    // Rose 600
  const mutedColor: [number, number, number] = [100, 116, 139];   // Slate 500

  const drawPageHeader = (sectionTitle?: string, filterNote?: string) => {
    // Top colored brand bar
    doc.setFillColor(...accentColor);
    doc.rect(margin, 10, contentWidth, 2, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('DiscoverMansalay — Monthly Tourism Report', margin, 18);

    // LGU Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text(report.report_meta.lgu_title, margin, 23);

    // Active Section / Filter note
    if (sectionTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...accentColor);
      doc.text(`Active Section: ${sectionTitle}`, margin, 28);

      if (filterNote) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...mutedColor);
        doc.text(` (${filterNote})`, margin + doc.getTextWidth(`Active Section: ${sectionTitle}`), 28);
      }
    }

    // Metadata Right-Aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...accentColor);
    doc.text(`Period: ${report.report_meta.reporting_period}`, pageWidth - margin, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedColor);
    doc.text(`Generated: ${report.report_meta.date_generated}`, pageWidth - margin, 23, { align: 'right' });
    doc.text(`Authorized: ${report.report_meta.generated_by.name}`, pageWidth - margin, 27, { align: 'right' });

    // Thin divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 31, pageWidth - margin, 31);
  };

  const drawSectionHeading = (title: string, yPos: number): number => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFillColor(...accentColor);
    doc.rect(margin, yPos, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text(title, margin + 5, yPos + 5);

    return yPos + 10;
  };

  const drawFooters = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.text(
        'DiscoverMansalay — Tourism Promotion Platform  |  Official Documentation  |  Municipality of Mansalay',
        margin,
        pageHeight - 8
      );
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 1: MONTHLY SUMMARY ONLY
  // ───────────────────────────────────────────────────────────────────────────
  if (tab === 'summary') {
    drawPageHeader('1. Monthly Summary');
    let currentY = drawSectionHeading('Monthly Summary & Performance Indicators', 35);

    const summaryActivityBody = [
      ['New Tourists Registered', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_registered_tourists)],
      ['New Resorts / Enterprises', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_resorts_registered + report.monthly_summary.activity_metrics.new_enterprises_registered)],
      ['New Content Records Created', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_content_records)],
      ['Content Records Updated', 'Monthly Activity', String(report.monthly_summary.activity_metrics.updated_content_records)],
      ['New Timeline / Promo Posts', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_timeline_posts)],
      ['Events Scheduled in Month', 'Monthly Activity', String(report.monthly_summary.activity_metrics.events_scheduled_in_month)],
      ['Wishlist Saves Activity', 'Monthly Activity', String(report.monthly_summary.activity_metrics.wishlist_activity)],
      ['Direct Inquiries Submitted', 'Monthly Activity', String(report.monthly_summary.activity_metrics.inquiries_submitted)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Monthly Activity Metric', 'Classification', 'Total Count']],
      body: summaryActivityBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
    currentY = drawSectionHeading('Current-State Cumulative Platform Totals', currentY);

    const summaryTotalsBody = [
      ['Total Registered Tourists (All-Time)', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_registered_tourists)],
      ['Active Approved Resorts', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_active_resorts)],
      ['Active Approved Enterprises', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_active_enterprises)],
      ['Attractions Listed', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_attractions_listed)],
      ['Community Products Listed', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_products_listed)],
      ['Properties with 360 Virtual Tours', 'Current-State Total', String(report.monthly_summary.current_state_totals.destinations_with_360_tours)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Current-State Metric', 'Classification', 'Cumulative Total']],
      body: summaryTotalsBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    });

    drawFooters();
    doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf', 'summary'));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 2: TOURISM CONTENT ACTIVITY ONLY (RESPECTS ACTIVE FILTERS)
  // ───────────────────────────────────────────────────────────────────────────
  if (tab === 'content') {
    const filterType = options?.contentFilterType || 'all';
    const searchQuery = (options?.contentSearchQuery || '').trim().toLowerCase();

    const filtered = report.tourism_content_activity.filter((c) => {
      const matchType = filterType === 'all' || c.type === filterType;
      const matchQuery =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery) ||
        c.owner_or_enterprise.toLowerCase().includes(searchQuery);
      return matchType && matchQuery;
    });

    let filterSubtitle = '';
    if (filterType !== 'all') filterSubtitle += `Filter: ${filterType}`;
    if (searchQuery) filterSubtitle += (filterSubtitle ? ' | ' : '') + `Search: "${options?.contentSearchQuery}"`;

    drawPageHeader('2. Tourism Content Activity', filterSubtitle ? `${filterSubtitle} (${filtered.length} Records)` : `${filtered.length} Records`);
    const currentY = drawSectionHeading(`Tourism Content Activity Records (${filtered.length} matching)`, 35);

    const contentRows = filtered.length === 0
      ? [['-', 'No content records match the active filter for this reporting period.', '-', '-', '-', '-', '-']]
      : filtered.map((c) => [
          c.type,
          c.title,
          c.category,
          c.owner_or_enterprise,
          c.action,
          c.date,
          c.status.toUpperCase(),
        ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Type', 'Content Title', 'Category', 'Owner / Enterprise', 'Action', 'Activity Date', 'Status']],
      body: contentRows,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 65 },
        2: { cellWidth: 35 },
        3: { cellWidth: 45 },
        4: { cellWidth: 32, halign: 'center' },
        5: { cellWidth: 35, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
      },
    });

    drawFooters();
    doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf', 'content'));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 3: RESORTS & STAYS ACTIVITY ONLY
  // ───────────────────────────────────────────────────────────────────────────
  if (tab === 'resorts') {
    drawPageHeader('3. Resorts & Accommodations Activity', `${report.resort_and_stays.length} Resorts`);
    const currentY = drawSectionHeading(`Resort & Stays Activity (${report.resort_and_stays.length} Listings)`, 35);

    const resortRows = report.resort_and_stays.length === 0
      ? [['-', 'No resorts found.', '-', 0, 0, 'No', 0, 0]]
      : report.resort_and_stays.map((r) => [
          r.resort_name,
          `${r.owner_name}\n${r.phone || ''}`,
          r.location,
          String(r.total_rooms),
          `+${r.new_rooms_month}`,
          String(r.timeline_posts_month),
          r.has_virtual_tour ? `Yes (${r.vt_scene_count})` : 'No',
          String(r.wishlist_saves_month),
          String(r.inquiries_month),
        ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Resort Name', 'Owner / Contact', 'Location', 'Rooms', 'New (Mo)', 'Posts', '360 Tour', 'Saves', 'Inquiries']],
      body: resortRows,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 45 },
        2: { cellWidth: 40 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 26, halign: 'center' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 22, halign: 'right' },
      },
    });

    drawFooters();
    doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf', 'resorts'));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 4: COMMUNITY PRODUCTS ACTIVITY ONLY
  // ───────────────────────────────────────────────────────────────────────────
  if (tab === 'products') {
    drawPageHeader('4. Community Products Activity', `${report.community_products.length} Products`);
    const currentY = drawSectionHeading(`Artisan & Community Products (${report.community_products.length} Items)`, 35);

    const productRows = report.community_products.length === 0
      ? [['-', 'No community products found.', '-', '0.00', 0, '-', 0, 0]]
      : report.community_products.map((p) => [
          p.product_name,
          p.enterprise_name,
          p.category,
          `PHP ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          String(p.stock),
          p.action_in_month,
          String(p.promotional_posts),
          String(p.wishlist_saves),
        ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Product Name', 'Enterprise / Producer', 'Category', 'Price', 'Stock', 'Month Activity', 'Promo Posts', 'Wishlists']],
      body: productRows,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 32 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 35, halign: 'center' },
        6: { cellWidth: 25, halign: 'right' },
        7: { cellWidth: 25, halign: 'right' },
      },
    });

    drawFooters();
    doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf', 'products'));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 5: TOURIST ENGAGEMENT & INQUIRIES ONLY
  // ───────────────────────────────────────────────────────────────────────────
  if (tab === 'engagement') {
    drawPageHeader('5. Engagement & Inquiries');
    let currentY = drawSectionHeading('Tracked Engagement & Inquiry Activity', 35);

    const engagementBody = [
      ['Wishlist Saves (Attractions)', String(report.tourist_engagement.wishlist_saves_by_type.attractions), 'Saved destination spots'],
      ['Wishlist Saves (Accommodations)', String(report.tourist_engagement.wishlist_saves_by_type.accommodations), 'Saved resort rooms & stays'],
      ['Wishlist Saves (Products)', String(report.tourist_engagement.wishlist_saves_by_type.products), 'Saved local artisan products'],
      ['Wishlist Saves (Events)', String(report.tourist_engagement.wishlist_saves_by_type.events), 'Saved community events'],
      ['Direct Inquiries Received', String(report.tourist_engagement.inquiries_in_month), 'Tourist inquiries to local businesses'],
      ['Pageviews Tracking', 'Not Tracked', 'Platform maintains lifetime counters without monthly timestamps'],
      ['Search Tracking', 'Not Tracked', 'Search queries are not logged in the database'],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Engagement Signal', 'Count / Status', 'Description / Policy']],
      body: engagementBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
    currentY = drawSectionHeading('Top Destinations by Cumulative Lifetime Views', currentY);

    const topDestBody = report.tourist_engagement.top_destinations_lifetime.map((d, idx) => [
      String(idx + 1),
      d.name,
      d.category,
      d.views.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Destination Name', 'Category', 'Lifetime Views']],
      body: topDestBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 45 },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    });

    if (report.inquiry_summary.details.length > 0) {
      currentY = (doc as any).lastAutoTable.finalY + 8;
      if (currentY > pageHeight - 50) {
        doc.addPage();
        drawPageHeader('5. Engagement & Inquiries (Continued)');
        currentY = 35;
      }
      currentY = drawSectionHeading(`Direct Inquiries in Period (${report.inquiry_summary.details.length})`, currentY);

      const inqBody = report.inquiry_summary.details.map((inq) => [
        inq.date,
        inq.sender_name,
        `${inq.recipient_name} (${inq.recipient_role})`,
        inq.message_snippet,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'From (Tourist)', 'To (Business)', 'Inquiry Snippet']],
        body: inqBody,
        theme: 'striped',
        margin: { left: margin, right: margin },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 30, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 45 },
          3: { cellWidth: 'auto' },
        },
      });
    }

    drawFooters();
    doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf', 'engagement'));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 6: TRENDS & ITINERARIES ONLY
  // ───────────────────────────────────────────────────────────────────────────
  if (tab === 'trends') {
    drawPageHeader('6. Trends & Itineraries');
    let currentY = drawSectionHeading('Weekly Activity Trends (Database Breakdown)', 35);

    const trendsBody = report.activity_trends.map((t) => [
      t.week,
      String(t.new_users),
      String(t.tourism_posts),
      String(t.wishlists),
      String(t.inquiries),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Reporting Week', 'New Users', 'Posts & Content', 'Wishlist Saves', 'Inquiries']],
      body: trendsBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
    currentY = drawSectionHeading('Itinerary Planning Activity & Status', currentY);

    const itBody = [
      ['Official Curated Itineraries', `${report.itinerary_activity.official_itineraries_count} Published Routes`, 'Official travel routes curated and published by Mansalay Tourism Office'],
      ['User Custom Itineraries', 'Active', 'Personalized travel plans saved by registered tourists on device storage'],
      ['AI-Generated Itineraries', 'On-Demand Service', 'Dynamic custom recommendations generated via Tourism Assistant'],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Component', 'Availability / Status', 'Description']],
      body: itBody,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 'auto' },
      },
    });

    drawFooters();
    doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf', 'trends'));
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMPREHENSIVE FULL REPORT (DEFAULT WHEN tab === 'all' OR UNSET)
  // ───────────────────────────────────────────────────────────────────────────
  drawPageHeader('Comprehensive Monthly Report');
  let currentY = drawSectionHeading('1. Monthly Summary & Performance Indicators', 35);

  const summaryActivityBody = [
    ['New Tourists Registered', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_registered_tourists)],
    ['New Resorts / Enterprises', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_resorts_registered + report.monthly_summary.activity_metrics.new_enterprises_registered)],
    ['New Content Records Created', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_content_records)],
    ['Content Records Updated', 'Monthly Activity', String(report.monthly_summary.activity_metrics.updated_content_records)],
    ['New Timeline / Promo Posts', 'Monthly Activity', String(report.monthly_summary.activity_metrics.new_timeline_posts)],
    ['Events Scheduled in Month', 'Monthly Activity', String(report.monthly_summary.activity_metrics.events_scheduled_in_month)],
    ['Wishlist Saves Activity', 'Monthly Activity', String(report.monthly_summary.activity_metrics.wishlist_activity)],
    ['Direct Inquiries Submitted', 'Monthly Activity', String(report.monthly_summary.activity_metrics.inquiries_submitted)],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Monthly Activity Metric', 'Classification', 'Total Count']],
    body: summaryActivityBody,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  const summaryTotalsBody = [
    ['Total Registered Tourists (All-Time)', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_registered_tourists)],
    ['Active Approved Resorts', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_active_resorts)],
    ['Active Approved Enterprises', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_active_enterprises)],
    ['Attractions Listed', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_attractions_listed)],
    ['Community Products Listed', 'Current-State Total', String(report.monthly_summary.current_state_totals.total_products_listed)],
    ['Properties with 360 Virtual Tours', 'Current-State Total', String(report.monthly_summary.current_state_totals.destinations_with_360_tours)],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Current-State Metric', 'Classification', 'Cumulative Total']],
    body: summaryTotalsBody,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Section 2: Tourism Content Activity
  doc.addPage();
  drawPageHeader('Comprehensive Report');
  currentY = drawSectionHeading('2. Tourism Content Activity (Creations & Updates)', 35);

  const contentRows = report.tourism_content_activity.length === 0
    ? [['-', 'No new or updated content during this month.', '-', '-', '-', '-']]
    : report.tourism_content_activity.map((c) => [
        c.type,
        c.title,
        c.category,
        c.owner_or_enterprise,
        c.action,
        c.date,
      ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Type', 'Content Title', 'Category', 'Owner / Enterprise', 'Action', 'Date']],
    body: contentRows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    showHead: 'everyPage',
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 42 },
      2: { cellWidth: 24 },
      3: { cellWidth: 32 },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
    },
  });

  // Section 3: Resort & Stays Activity
  doc.addPage();
  drawPageHeader('Comprehensive Report');
  currentY = drawSectionHeading('3. Resort & Stays Activity', 35);

  const resortRows = report.resort_and_stays.length === 0
    ? [['-', 'No resorts found.', '-', 0, 0, 'No', 0]]
    : report.resort_and_stays.map((r) => [
        r.resort_name,
        r.owner_name,
        r.location,
        String(r.total_rooms),
        String(r.timeline_posts_month),
        r.has_virtual_tour ? `Yes (${r.vt_scene_count})` : 'No',
        String(r.wishlist_saves_month),
      ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Resort Name', 'Owner / Contact', 'Location', 'Rooms', 'Posts', '360 Tour', 'Saves']],
    body: resortRows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    showHead: 'everyPage',
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 15, halign: 'right' },
    },
  });

  // Section 4: Community Products Activity
  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > pageHeight - 60) {
    doc.addPage();
    drawPageHeader('Comprehensive Report');
    currentY = 35;
  }
  currentY = drawSectionHeading('4. Community Products Activity', currentY);

  const productRows = report.community_products.length === 0
    ? [['-', 'No community products found.', '-', '0.00', 0, '-']]
    : report.community_products.map((p) => [
        p.product_name,
        p.enterprise_name,
        p.category,
        `PHP ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        String(p.stock),
        p.action_in_month,
      ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Product Name', 'Enterprise / Producer', 'Category', 'Price', 'Stock', 'Month Activity']],
    body: productRows,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    showHead: 'everyPage',
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 30, halign: 'center' },
    },
  });

  // Section 5: Tourist Engagement & Inquiries
  doc.addPage();
  drawPageHeader('Comprehensive Report');
  currentY = drawSectionHeading('5. Tourist Engagement & Inquiry Activity', 35);

  const engagementBody = [
    ['Wishlist Saves (Attractions)', String(report.tourist_engagement.wishlist_saves_by_type.attractions), 'Saved destination spots'],
    ['Wishlist Saves (Accommodations)', String(report.tourist_engagement.wishlist_saves_by_type.accommodations), 'Saved resort rooms & stays'],
    ['Wishlist Saves (Products)', String(report.tourist_engagement.wishlist_saves_by_type.products), 'Saved local artisan products'],
    ['Wishlist Saves (Events)', String(report.tourist_engagement.wishlist_saves_by_type.events), 'Saved community events'],
    ['Direct Inquiries Received', String(report.tourist_engagement.inquiries_in_month), 'Tourist inquiries to local businesses'],
    ['Pageviews Tracking', 'Not Tracked', 'Platform maintains lifetime counters without monthly timestamps'],
    ['Search Tracking', 'Not Tracked', 'Search queries are not logged in the database'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Engagement Signal', 'Count / Status', 'Description / Policy']],
    body: engagementBody,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;
  currentY = drawSectionHeading('6. Weekly Activity Trends (Real Database Records)', currentY);

  const trendsBody = report.activity_trends.map((t) => [
    t.week,
    String(t.new_users),
    String(t.tourism_posts),
    String(t.wishlists),
    String(t.inquiries),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Reporting Week', 'New Users', 'Posts & Content', 'Wishlist Saves', 'Inquiries']],
    body: trendsBody,
    theme: 'striped',
    margin: { left: margin, right: margin },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
  });

  drawFooters();
  doc.save(getReportFileName(report.report_meta.month, report.report_meta.year, 'pdf'));
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE TAB PRINT GENERATOR (PRINTS EXCLUSIVELY THE CURRENTLY SELECTED TAB)
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generatePrintHtml(
  report: MonthlyReportPayload,
  options?: ReportExportOptions
): string {
  const tab = options?.activeTab || 'summary';
  const isLandscape = tab === 'content' || tab === 'resorts' || tab === 'products';

  // Section title mapping
  let sectionTitle = 'Section 1: Executive Monthly Summary & Performance Indicators';
  if (tab === 'content') sectionTitle = 'Section 2: Tourism Content Activity Directory';
  else if (tab === 'resorts') sectionTitle = 'Section 3: Resorts & Accommodations Directory';
  else if (tab === 'products') sectionTitle = 'Section 4: Community Products & Local Enterprises';
  else if (tab === 'engagement') sectionTitle = 'Section 5: Tourist Engagement & Inquiries Activity';
  else if (tab === 'trends') sectionTitle = 'Section 6: Activity Trends & Itinerary Planning';
  else if (tab === 'all') sectionTitle = 'Comprehensive Monthly Tourism Report';

  // Filter notice for content tab
  let filterNoticeHtml = '';
  if (tab === 'content') {
    const filterType = options?.contentFilterType || 'all';
    const searchQuery = (options?.contentSearchQuery || '').trim();
    if (filterType !== 'all' || searchQuery) {
      filterNoticeHtml = `<div class="filter-notice">
        <strong>Active Filters Applied:</strong>
        ${filterType !== 'all' ? `<span>Category: <strong>${escapeHtml(filterType)}</strong></span>` : '<span>Category: <strong>All Types</strong></span>'}
        ${searchQuery ? ` &bull; <span>Search Query: <strong>&ldquo;${escapeHtml(searchQuery)}&rdquo;</strong></span>` : ''}
      </div>`;
    }
  }

  // Generate Tab Body HTML
  let bodyHtml = '';

  if (tab === 'summary') {
    const m = report.monthly_summary.activity_metrics;
    const t = report.monthly_summary.current_state_totals;
    bodyHtml = `
      <div class="section-subtitle">1. Monthly Activity Counts (Strictly within selected month)</div>
      <div class="grid-4">
        <div class="stat-box highlight">
          <div class="stat-title">New Tourists</div>
          <div class="stat-val text-blue">${m.new_registered_tourists}</div>
          <div class="stat-sub">Registered accounts</div>
        </div>
        <div class="stat-box highlight">
          <div class="stat-title">New Content Records</div>
          <div class="stat-val text-emerald">${m.new_content_records}</div>
          <div class="stat-sub">Attractions, products & stays</div>
        </div>
        <div class="stat-box highlight">
          <div class="stat-title">Updated Content</div>
          <div class="stat-val text-amber">${m.updated_content_records}</div>
          <div class="stat-sub">Timestamps verified</div>
        </div>
        <div class="stat-box highlight">
          <div class="stat-title">Wishlist Saves</div>
          <div class="stat-val text-rose">${m.wishlist_activity}</div>
          <div class="stat-sub">Bookmarked items</div>
        </div>
      </div>

      <div class="section-subtitle">2. Current-State Platform Totals (Cumulative All-Time)</div>
      <div class="grid-4">
        <div class="stat-box">
          <div class="stat-title">Total Tourists</div>
          <div class="stat-val">${t.total_registered_tourists}</div>
          <div class="stat-sub">All-time tourist accounts</div>
        </div>
        <div class="stat-box">
          <div class="stat-title">Active Resorts</div>
          <div class="stat-val">${t.total_active_resorts}</div>
          <div class="stat-sub">Approved accommodations</div>
        </div>
        <div class="stat-box">
          <div class="stat-title">Active Enterprises</div>
          <div class="stat-val">${t.total_active_enterprises}</div>
          <div class="stat-sub">Community shops</div>
        </div>
        <div class="stat-box">
          <div class="stat-title">360 Virtual Tours</div>
          <div class="stat-val">${t.destinations_with_360_tours}</div>
          <div class="stat-sub">Virtual tour scenes</div>
        </div>
      </div>

      <div class="section-subtitle">3. Monthly Activity vs. Cumulative Status Comparison</div>
      <table>
        <thead>
          <tr>
            <th>Metric Entity</th>
            <th class="text-right">Activity in Selected Month</th>
            <th class="text-right">Current-State Cumulative Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold">Tourists / User Accounts</td>
            <td class="text-right font-bold text-blue">+${m.new_registered_tourists}</td>
            <td class="text-right">${t.total_registered_tourists}</td>
          </tr>
          <tr>
            <td class="font-bold">Resort & Accommodation Profiles</td>
            <td class="text-right font-bold text-emerald">+${m.new_resorts_registered}</td>
            <td class="text-right">${t.total_active_resorts}</td>
          </tr>
          <tr>
            <td class="font-bold">Community Enterprises</td>
            <td class="text-right font-bold text-emerald">+${m.new_enterprises_registered}</td>
            <td class="text-right">${t.total_active_enterprises}</td>
          </tr>
          <tr>
            <td class="font-bold">Tourism Content Items</td>
            <td class="text-right font-bold text-amber">+${m.new_content_records}</td>
            <td class="text-right">${t.total_attractions_listed + t.total_products_listed + t.total_events_listed}</td>
          </tr>
          <tr>
            <td class="font-bold">Timeline / Social Posts</td>
            <td class="text-right font-bold text-purple">+${m.new_timeline_posts}</td>
            <td class="text-right">${report.resort_and_stays.reduce((acc, r) => acc + r.timeline_posts_month, 0) + report.community_products.reduce((acc, p) => acc + p.promotional_posts, 0)}</td>
          </tr>
          <tr>
            <td class="font-bold">Wishlist Saves</td>
            <td class="text-right font-bold text-rose">+${m.wishlist_activity}</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td class="font-bold">Inquiries Received</td>
            <td class="text-right font-bold text-indigo">+${m.inquiries_submitted}</td>
            <td class="text-right">-</td>
          </tr>
        </tbody>
      </table>

      <div class="section-subtitle">4. Executive Tourism Performance Insights</div>
      <div class="insights-box">
        <p><strong>&bull; Registered Tourists Growth:</strong> ${m.new_registered_tourists > 0 ? `Platform recorded ${m.new_registered_tourists} new tourist registration(s) during this period.` : 'No new tourist account registrations recorded in this reporting cycle.'}</p>
        <p><strong>&bull; Content Activity:</strong> ${m.new_content_records} new record(s) created and ${m.updated_content_records} record(s) updated, keeping visitor information current.</p>
        <p><strong>&bull; Enterprise & Resort Engagement:</strong> ${report.resort_and_stays.length} active resort(s) and ${report.community_products.length} community product(s) actively promoted.</p>
      </div>
    `;
  } else if (tab === 'content') {
    const filterType = options?.contentFilterType || 'all';
    const searchQuery = (options?.contentSearchQuery || '').trim().toLowerCase();
    const filtered = report.tourism_content_activity.filter((c) => {
      const matchType = filterType === 'all' || c.type === filterType;
      const matchQuery =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery) ||
        c.owner_or_enterprise.toLowerCase().includes(searchQuery);
      return matchType && matchQuery;
    });

    const rowsHtml = filtered.length > 0
      ? filtered.map((c, idx) => `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td><span class="badge badge-slate">${escapeHtml(c.type)}</span></td>
          <td class="font-bold">${escapeHtml(c.title)}</td>
          <td>${escapeHtml(c.category)}</td>
          <td>${escapeHtml(c.owner_or_enterprise)}</td>
          <td class="text-center"><span class="badge ${c.action.includes('Created') ? 'badge-green' : 'badge-amber'}">${escapeHtml(c.action)}</span></td>
          <td class="text-center">${escapeHtml(c.date)}</td>
          <td class="text-center font-bold">${escapeHtml(c.status.toUpperCase())}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="8" class="text-center" style="padding: 16px; color: #64748b;">No tourism content activity records found matching the active filters.</td></tr>`;

    bodyHtml = `
      <div class="table-meta-bar">
        <span>Showing <strong>${filtered.length}</strong> of <strong>${report.tourism_content_activity.length}</strong> Total Records</span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 25px;">#</th>
            <th style="width: 110px;">Type</th>
            <th>Title / Name</th>
            <th style="width: 90px;">Category</th>
            <th>Owner / Enterprise</th>
            <th class="text-center" style="width: 100px;">Action in Month</th>
            <th class="text-center" style="width: 85px;">Date</th>
            <th class="text-center" style="width: 65px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  } else if (tab === 'resorts') {
    const rowsHtml = report.resort_and_stays.length > 0
      ? report.resort_and_stays.map((r, idx) => `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td class="font-bold">${escapeHtml(r.resort_name)}</td>
          <td>
            <div>${escapeHtml(r.owner_name)}</div>
            <div style="font-size: 6.5pt; color: #64748b;">${escapeHtml(r.phone)}</div>
          </td>
          <td>${escapeHtml(r.location)}</td>
          <td class="text-right font-bold">${r.total_rooms}</td>
          <td class="text-right text-emerald font-bold">+${r.new_rooms_month}</td>
          <td class="text-right">${r.timeline_posts_month}</td>
          <td class="text-center">
            ${r.has_virtual_tour
              ? `<span class="badge badge-green">Yes (${r.vt_scene_count} scenes)</span>`
              : `<span style="color: #94a3b8;">None</span>`}
          </td>
          <td class="text-right font-bold text-rose">${r.wishlist_saves_month}</td>
          <td class="text-right font-bold text-indigo">${r.inquiries_month}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="10" class="text-center" style="padding: 16px; color: #64748b;">No resort listings found.</td></tr>`;

    bodyHtml = `
      <div class="table-meta-bar">
        <span>Total Registered Accommodations: <strong>${report.resort_and_stays.length}</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 25px;">#</th>
            <th>Resort / Accommodation Name</th>
            <th>Owner / Contact</th>
            <th>Location / Barangay</th>
            <th class="text-right">Total Rooms</th>
            <th class="text-right">New Rooms</th>
            <th class="text-right">Posts</th>
            <th class="text-center">360 Virtual Tour</th>
            <th class="text-right">Wishlists</th>
            <th class="text-right">Inquiries</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  } else if (tab === 'products') {
    const rowsHtml = report.community_products.length > 0
      ? report.community_products.map((p, idx) => `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td class="font-bold">${escapeHtml(p.product_name)}</td>
          <td>${escapeHtml(p.enterprise_name)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td class="text-right font-bold">₱${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${p.stock}</td>
          <td class="text-center"><span class="badge ${p.action_in_month.includes('New') ? 'badge-green' : 'badge-amber'}">${escapeHtml(p.action_in_month)}</span></td>
          <td class="text-right text-purple font-bold">${p.promotional_posts}</td>
          <td class="text-right text-rose font-bold">${p.wishlist_saves}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="9" class="text-center" style="padding: 16px; color: #64748b;">No community products found.</td></tr>`;

    bodyHtml = `
      <div class="table-meta-bar">
        <span>Total Community Products: <strong>${report.community_products.length}</strong> &bull; Operating Mode: <strong>Promotion Platform (Direct Contact Order Mode)</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 25px;">#</th>
            <th>Product Name</th>
            <th>Enterprise / Producer</th>
            <th>Category</th>
            <th class="text-right">Price</th>
            <th class="text-right">Stock</th>
            <th class="text-center">Month Activity</th>
            <th class="text-right">Promo Posts</th>
            <th class="text-right">Wishlists</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  } else if (tab === 'engagement') {
    const eng = report.tourist_engagement;
    bodyHtml = `
      <div class="section-subtitle">1. Tourist Engagement Signals</div>
      <table>
        <thead>
          <tr>
            <th>Engagement Signal</th>
            <th class="text-right">Count in Month</th>
            <th>Description / Policy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold">Wishlist Saves (Attractions)</td>
            <td class="text-right font-bold text-rose">${eng.wishlist_saves_by_type.attractions}</td>
            <td>Bookmarked tourist destination spots</td>
          </tr>
          <tr>
            <td class="font-bold">Wishlist Saves (Accommodations)</td>
            <td class="text-right font-bold text-rose">${eng.wishlist_saves_by_type.accommodations}</td>
            <td>Bookmarked resort rooms and stays</td>
          </tr>
          <tr>
            <td class="font-bold">Wishlist Saves (Community Products)</td>
            <td class="text-right font-bold text-rose">${eng.wishlist_saves_by_type.products}</td>
            <td>Bookmarked local artisan products</td>
          </tr>
          <tr>
            <td class="font-bold">Wishlist Saves (Events)</td>
            <td class="text-right font-bold text-rose">${eng.wishlist_saves_by_type.events}</td>
            <td>Bookmarked local community events</td>
          </tr>
          <tr>
            <td class="font-bold">Direct Business Inquiries</td>
            <td class="text-right font-bold text-indigo">${eng.inquiries_in_month}</td>
            <td>Direct inquiries submitted by tourists</td>
          </tr>
        </tbody>
      </table>

      <div class="section-subtitle">2. Recent Tourist Inquiries & Messages</div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 25px;">#</th>
            <th>From (Sender)</th>
            <th>To (Recipient)</th>
            <th style="width: 80px;">Role</th>
            <th class="text-center" style="width: 80px;">Date</th>
            <th>Message Snippet</th>
          </tr>
        </thead>
        <tbody>
          ${report.inquiry_summary.details.length > 0
            ? report.inquiry_summary.details.map((inq, idx) => `
              <tr>
                <td class="text-center font-bold">${idx + 1}</td>
                <td class="font-bold">${escapeHtml(inq.sender_name)}</td>
                <td>${escapeHtml(inq.recipient_name)}</td>
                <td><span class="badge badge-slate">${escapeHtml(inq.recipient_role)}</span></td>
                <td class="text-center">${escapeHtml(inq.date)}</td>
                <td style="font-style: italic; color: #475569;">&ldquo;${escapeHtml(inq.message_snippet)}&rdquo;</td>
              </tr>
            `).join('')
            : `<tr><td colspan="6" class="text-center" style="padding: 16px; color: #64748b;">No tourist inquiries submitted during this month.</td></tr>`
          }
        </tbody>
      </table>
    `;
  } else if (tab === 'trends') {
    bodyHtml = `
      <div class="section-subtitle">1. Weekly Tourism Activity Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Reporting Period / Week</th>
            <th class="text-right">New Users</th>
            <th class="text-right">Posts & Content</th>
            <th class="text-right">Wishlist Saves</th>
            <th class="text-right">Inquiries</th>
          </tr>
        </thead>
        <tbody>
          ${report.activity_trends.map((t) => `
            <tr>
              <td class="font-bold">${escapeHtml(t.week)}</td>
              <td class="text-right font-bold text-blue">${t.new_users}</td>
              <td class="text-right font-bold text-emerald">${t.tourism_posts}</td>
              <td class="text-right font-bold text-rose">${t.wishlists}</td>
              <td class="text-right font-bold text-indigo">${t.inquiries}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-subtitle">2. Itinerary Planning Status</div>
      <div class="insights-box">
        <p><strong>&bull; Official Published Routes:</strong> ${report.itinerary_activity.official_itineraries_count} official itineraries cataloged.</p>
        <p><strong>&bull; User Custom Trips:</strong> ${escapeHtml(report.itinerary_activity.user_custom_itineraries_status)}.</p>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DiscoverMansalay Monthly Tourism Report - ${escapeHtml(sectionTitle)}</title>
  <style>
    @page {
      size: ${isLandscape ? 'landscape' : 'portrait'};
      margin: 10mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 8pt;
      line-height: 1.35;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    .republic {
      font-size: 7.5pt;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .province {
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
    }
    .municipality {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1px;
    }
    .office {
      font-size: 8pt;
      font-weight: 700;
      color: #be185d;
      letter-spacing: 0.5px;
    }
    .divider {
      border-top: 2px solid #0f172a;
      border-bottom: 1px solid #94a3b8;
      height: 2px;
      margin: 5px 0 8px 0;
    }
    .report-title-badge {
      font-size: 7pt;
      font-weight: 800;
      color: #be185d;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 12pt;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0 6px 0;
    }
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 10px;
      text-align: left;
      font-size: 7.5pt;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-lbl {
      color: #64748b;
    }
    .filter-notice {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dashed #cbd5e1;
      font-size: 7.5pt;
      color: #be185d;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .stat-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: left;
    }
    .stat-box.highlight {
      border-left: 3px solid #ec4899;
      background: #fdf2f8;
    }
    .stat-title {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .stat-val {
      font-size: 12pt;
      font-weight: 900;
      margin: 2px 0;
    }
    .stat-sub {
      font-size: 6.5pt;
      color: #94a3b8;
    }
    .text-blue { color: #1d4ed8 !important; }
    .text-emerald { color: #047857 !important; }
    .text-amber { color: #b45309 !important; }
    .text-rose { color: #be123c !important; }
    .text-indigo { color: #4338ca !important; }
    .text-purple { color: #6d28d9 !important; }
    .section-subtitle {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      margin: 8px 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table-meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      margin-bottom: 10px;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-size: 7pt;
      font-weight: 700;
      padding: 4px 6px;
      border: 1px solid #334155;
      text-align: left;
      white-space: nowrap;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      font-size: 7.5pt;
      color: #0f172a;
    }
    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-slate { background: #f1f5f9; color: #334155; }
    .insights-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 7.5pt;
      line-height: 1.4;
    }
    .insights-box p { margin: 2px 0; }
    .footer-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .sig-col {
      width: 40%;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 4px;
    }
    .sig-name {
      font-weight: 800;
      font-size: 8pt;
      color: #0f172a;
    }
    .sig-role {
      font-size: 7pt;
      color: #475569;
    }
    .sig-org {
      font-size: 6.5pt;
      color: #94a3b8;
    }
    .doc-footer {
      text-align: center;
      font-size: 7pt;
      color: #64748b;
      margin-top: 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="lgu-badges">
      <div class="republic">Republic of the Philippines</div>
      <div class="province">Province of Oriental Mindoro</div>
      <div class="municipality">MUNICIPALITY OF MANSALAY</div>
      <div class="office">OFFICE OF THE MUNICIPAL TOURISM</div>
    </div>
    <div class="divider"></div>
    <div class="report-title-badge">DiscoverMansalay Official Documentation</div>
    <h1 class="section-title">${escapeHtml(sectionTitle)}</h1>
    <div class="meta-card">
      <div class="meta-row">
        <div><span class="meta-lbl">Reporting Period:</span> <strong>${escapeHtml(report.report_meta.reporting_period)}</strong> (${escapeHtml(report.report_meta.start_date)} to ${escapeHtml(report.report_meta.end_date)})</div>
        <div><span class="meta-lbl">Date Generated:</span> <strong>${escapeHtml(report.report_meta.date_generated)}</strong></div>
      </div>
      <div class="meta-row">
        <div><span class="meta-lbl">Prepared By:</span> <strong>${escapeHtml(report.report_meta.generated_by.name)}</strong> (${escapeHtml(report.report_meta.generated_by.email)})</div>
        <div><span class="meta-lbl">Platform Scope:</span> <strong>${escapeHtml(report.report_meta.platform_name)}</strong></div>
      </div>
      ${filterNoticeHtml}
    </div>
  </div>

  ${bodyHtml}

  <div class="footer-signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(report.report_meta.generated_by.name)}</div>
      <div class="sig-role">Authorized Administrator</div>
      <div class="sig-org">DiscoverMansalay Digital Tourism Platform</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">MUNICIPAL TOURISM OFFICER</div>
      <div class="sig-role">Supervising Official</div>
      <div class="sig-org">Municipality of Mansalay, Oriental Mindoro</div>
    </div>
  </div>
  <div class="doc-footer">
    DiscoverMansalay — Tourism Promotion Platform &nbsp;|&nbsp; Official Documentation &nbsp;|&nbsp; Municipality of Mansalay, Oriental Mindoro
  </div>
</body>
</html>`;
}

export function printReportTab(
  report: MonthlyReportPayload,
  options?: ReportExportOptions
): void {
  const htmlContent = generatePrintHtml(report, options);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('title', 'DiscoverMansalay Report Print Frame');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 4000);
    }
  }, 350);
}
