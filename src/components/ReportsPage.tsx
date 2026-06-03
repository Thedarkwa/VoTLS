import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMembers, fetchAllAttendance, fetchWelfare, fetchDues } from "@/lib/queries";
import { getSundaysInMonth, formatDate, currentMonthStr } from "@/lib/dateUtils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/votls-logo.jpg";

const PART_COLORS: Record<string, string> = { Soprano: "#e74c3c", Alto: "#9b59b6", Tenor: "#3498db", Bass: "#27ae60" };

const ReportsPage = () => {
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState("monthly");
  const [monthVal, setMonthVal] = useState(currentMonthStr());

  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance-all"], queryFn: fetchAllAttendance });
  const { data: welfare = [] } = useQuery({ queryKey: ["welfare"], queryFn: fetchWelfare });
  const { data: dues = [] } = useQuery({ queryKey: ["dues"], queryFn: fetchDues });

  const memberName = (id: string) => {
    const m = members.find((x: any) => x.id === id);
    return m ? `${m.first_name} ${m.last_name}` : "Unknown";
  };
  const memberPart = (id: string) => members.find((x: any) => x.id === id)?.part || "";

  // Load logo as base64 once
  const loadLogo = async (): Promise<{ dataUrl: string; buffer: ArrayBuffer }> => {
    const res = await fetch(logo);
    const buffer = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const dataUrl = `data:image/jpeg;base64,${btoa(binary)}`;
    return { dataUrl, buffer };
  };

  // Filter welfare/dues by selected month/period
  const finance = useMemo(() => {
    const [fy, fm] = monthVal.split("-").map(Number);
    let monthsBack = 1;
    if (period === "quarterly") monthsBack = 3;
    else if (period === "semi-annual") monthsBack = 6;
    else if (period === "yearly") monthsBack = 12;

    const inRange = (dateStr: string) => {
      const d = new Date(dateStr);
      const start = new Date(fy, fm - monthsBack, 1);
      const end = new Date(fy, fm, 0, 23, 59, 59);
      return d >= start && d <= end;
    };

    const w = welfare.filter((r: any) => inRange(r.contribution_date));
    const d = dues.filter((r: any) => inRange(r.payment_date));
    const welfareTotal = w.reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    const duesTotal = d.reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    return { welfare: w, dues: d, welfareTotal, duesTotal };
  }, [welfare, dues, monthVal, period]);

  const report = useMemo(() => {
    const [fy, fm] = monthVal.split("-").map(Number);
    let choirMembers = members.filter((m: any) => m.part !== "Director");
    if (type !== "all") choirMembers = choirMembers.filter((m: any) => m.part === type);

    let dates: string[] = [];
    if (period === "monthly") dates = getSundaysInMonth(fy, fm - 1);
    else if (period === "quarterly") {
      for (let i = 0; i < 3; i++) { const d = new Date(fy, fm - 1 - i, 1); dates = [...getSundaysInMonth(d.getFullYear(), d.getMonth()), ...dates]; }
    } else if (period === "semi-annual") {
      for (let i = 0; i < 6; i++) { const d = new Date(fy, fm - 1 - i, 1); dates = [...getSundaysInMonth(d.getFullYear(), d.getMonth()), ...dates]; }
    } else if (period === "yearly") {
      for (let i = 0; i < 12; i++) { const d = new Date(fy, fm - 1 - i, 1); dates = [...getSundaysInMonth(d.getFullYear(), d.getMonth()), ...dates]; }
    }

    const rows = choirMembers.map((m: any) => {
      const mAtt = attendance.filter((a: any) => a.member_id === m.id && dates.includes(a.date));
      const present = mAtt.filter((a: any) => a.status === "Present").length;
      const absent = mAtt.filter((a: any) => a.status === "Absent").length;
      const pct = dates.length > 0 ? Math.round((present / dates.length) * 100) : 0;
      return { m, totalSessions: dates.length, present, absent, pct };
    });

    const avgPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
    const poorAtt = rows.filter((r) => {
      const monthDates = getSundaysInMonth(fy, fm - 1);
      return attendance.filter((a: any) => a.member_id === r.m.id && monthDates.includes(a.date) && a.status === "Absent").length >= 2;
    });

    const parts = ["Soprano", "Alto", "Tenor", "Bass"];
    const partsData = parts.map((pt) => {
      const ptRows = rows.filter((r) => r.m.part === pt);
      return { name: pt, avg: ptRows.length ? Math.round(ptRows.reduce((a, r) => a + r.present, 0) / ptRows.length) : 0, fill: PART_COLORS[pt] };
    });

    const excellent = rows.filter((r) => r.pct >= 80).length;
    const good = rows.filter((r) => r.pct >= 60 && r.pct < 80).length;
    const poor = rows.filter((r) => r.pct < 60).length;
    const distData = [
      { name: "Excellent (≥80%)", value: excellent, fill: "#27ae60" },
      { name: "Good (60-79%)", value: good, fill: "#f39c12" },
      { name: "Needs Improvement (<60%)", value: poor, fill: "#e74c3c" },
    ];

    return { rows, avgPct, poorAtt, partsData, distData, totalSessions: dates.length };
  }, [type, period, monthVal, members, attendance]);

  const addSheetWithLogo = (
    wb: ExcelJS.Workbook,
    logoId: number,
    name: string,
    title: string,
    headers: string[],
    rows: (string | number)[][]
  ) => {
    const ws = wb.addWorksheet(name);
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 60, height: 60 } });
    ws.getRow(1).height = 50;
    ws.mergeCells("B1:G1");
    const titleCell = ws.getCell("B1");
    titleCell.value = `Choir Management System — ${title}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF08BBF4" } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    ws.addRow([]);
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF08BBF4" } };
    });
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (c) => {
        const len = String(c.value ?? "").length;
        if (len > max) max = len;
      });
      col.width = Math.min(max + 2, 40);
    });
  };

  const exportToExcel = async () => {
    const { buffer } = await loadLogo();
    const wb = new ExcelJS.Workbook();
    const logoId = wb.addImage({ buffer: buffer as any, extension: "jpeg" });

    addSheetWithLogo(wb, logoId, "Attendance Report", `Attendance — ${type === "all" ? "Entire Choir" : type} (${period})`,
      ["#", "Name", "Part", "Total Sessions", "Present", "Absent", "Performance (%)"],
      report.rows.map((r, i) => [i + 1, `${r.m.first_name} ${r.m.last_name}`, r.m.part, r.totalSessions, r.present, r.absent, r.pct])
    );

    if (report.poorAtt.length > 0) {
      addSheetWithLogo(wb, logoId, "Poor Attendance", "Poor Attendance",
        ["#", "Name", "Part", "Performance (%)"],
        report.poorAtt.map((r, i) => [i + 1, `${r.m.first_name} ${r.m.last_name}`, r.m.part, r.pct])
      );
    }

    addSheetWithLogo(wb, logoId, "Raw Data", "Raw Attendance Data",
      ["Date", "Name", "Part", "Status"],
      attendance.map((a: any) => {
        const m = members.find((x: any) => x.id === a.member_id);
        return [a.date, m ? `${m.first_name} ${m.last_name}` : "Unknown", m?.part || "", a.status];
      })
    );

    if (finance.welfare.length) {
      addSheetWithLogo(wb, logoId, "Welfare", `Welfare Contributions (${period})`,
        ["#", "Date", "Name", "Part", "Amount", "Purpose", "Notes"],
        finance.welfare.map((r: any, i: number) => [i + 1, r.contribution_date, memberName(r.member_id), memberPart(r.member_id), Number(r.amount), r.purpose || "", r.notes || ""])
      );
    }

    if (finance.dues.length) {
      addSheetWithLogo(wb, logoId, "Dues", `Dues Collections (${period})`,
        ["#", "Date", "Name", "Part", "Amount", "Period", "Notes"],
        finance.dues.map((r: any, i: number) => [i + 1, r.payment_date, memberName(r.member_id), memberPart(r.member_id), Number(r.amount), r.period || "", r.notes || ""])
      );
    }

    const out = await wb.xlsx.writeBuffer();
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CMS_Report_${type}_${period}_${monthVal}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    const { dataUrl } = await loadLogo();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const addHeader = () => {
      doc.addImage(dataUrl, "JPEG", 14, 10, 20, 20);
      doc.setFontSize(14);
      doc.setTextColor(8, 187, 244);
      doc.text("Choir Management System", 38, 20);
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`${period} report — ${monthVal}`, 38, 27);
      doc.setDrawColor(8, 187, 244);
      doc.line(14, 33, pageWidth - 14, 33);
    };

    addHeader();
    let y = 40;

    autoTable(doc, {
      startY: y,
      head: [["#", "Name", "Part", "Sessions", "Present", "Absent", "%"]],
      body: report.rows.map((r, i) => [i + 1, `${r.m.first_name} ${r.m.last_name}`, r.m.part, r.totalSessions, r.present, r.absent, `${r.pct}%`]),
      headStyles: { fillColor: [8, 187, 244] },
      didDrawPage: () => addHeader(),
      margin: { top: 38 },
    });

    if (finance.welfare.length) {
      doc.addPage();
      autoTable(doc, {
        startY: 40,
        head: [["#", "Date", "Name", "Part", "Amount", "Purpose"]],
        body: finance.welfare.map((r: any, i: number) => [i + 1, r.contribution_date, memberName(r.member_id), memberPart(r.member_id), `GHS ${Number(r.amount).toLocaleString()}`, r.purpose || "—"]),
        headStyles: { fillColor: [8, 187, 244] },
        didDrawPage: () => addHeader(),
        margin: { top: 38 },
      });
    }

    if (finance.dues.length) {
      doc.addPage();
      autoTable(doc, {
        startY: 40,
        head: [["#", "Date", "Name", "Part", "Amount", "Period"]],
        body: finance.dues.map((r: any, i: number) => [i + 1, r.payment_date, memberName(r.member_id), memberPart(r.member_id), `GHS ${Number(r.amount).toLocaleString()}`, r.period || "—"]),
        headStyles: { fillColor: [8, 187, 244] },
        didDrawPage: () => addHeader(),
        margin: { top: 38 },
      });
    }

    doc.save(`CMS_Report_${type}_${period}_${monthVal}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Reports</h2>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} className="bg-success text-success-foreground">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button onClick={exportToPDF} className="bg-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/50 rounded-xl p-4 border border-border flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Report Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm">
            <option value="all">Entire Choir</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semi-annual">Semi-Annual</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Month / Year</label>
          <input type="month" value={monthVal} onChange={(e) => setMonthVal(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Members", value: report.rows.length, bg: "bg-primary" },
          { label: "Sessions", value: report.totalSessions, bg: "bg-accent" },
          { label: "Avg Present", value: Math.round(report.rows.reduce((a, r) => a + r.present, 0) / (report.rows.length || 1)), bg: "bg-success" },
          { label: "Poor Attendance", value: report.poorAtt.length, bg: "bg-destructive" },
          { label: "Avg Performance", value: `${report.avgPct}%`, bg: "bg-secondary" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 text-center ${s.bg} shadow-sm`}>
            <div className="font-display text-3xl font-bold text-primary-foreground">{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-primary-foreground/80 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">
          Attendance Report — {type === "all" ? "Entire Choir" : type} ({period})
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Part</th>
              <th className="px-4 py-3 text-left">Sessions</th>
              <th className="px-4 py-3 text-left">Present</th>
              <th className="px-4 py-3 text-left">Absent</th>
              <th className="px-4 py-3 text-left">Performance</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => (
              <tr key={r.m.id} className={`border-b border-border/50 hover:bg-muted/30 ${r.pct < 50 ? "bg-destructive/5" : ""}`}>
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">{r.m.first_name} {r.m.last_name}</td>
                <td className="px-4 py-3">{r.m.part}</td>
                <td className="px-4 py-3">{r.totalSessions}</td>
                <td className="px-4 py-3 text-success font-bold">{r.present}</td>
                <td className="px-4 py-3 text-destructive font-bold">{r.absent}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${r.pct >= 80 ? "text-success" : r.pct >= 50 ? "text-warning" : "text-destructive"}`}>
                    {r.pct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Poor Attendance */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">
          Poor Attendance (2+ absences in selected month)
        </h3>
        {report.poorAtt.length === 0 ? (
          <p className="text-success py-4">No members with poor attendance this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-destructive/20 text-foreground">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-left">Performance</th>
              </tr>
            </thead>
            <tbody>
              {report.poorAtt.map((r, i) => (
                <tr key={r.m.id} className="border-b border-border/50">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{r.m.first_name} {r.m.last_name}</td>
                  <td className="px-4 py-3">{r.m.part}</td>
                  <td className="px-4 py-3 text-destructive font-bold">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-display text-foreground mb-4">Attendance by Part</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={report.partsData}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {report.partsData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-display text-foreground mb-4">Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={report.distData} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {report.distData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Welfare Report */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <div className="flex items-center justify-between mb-4 border-b border-accent pb-2">
          <h3 className="font-display text-foreground">Welfare Contributions ({period})</h3>
          <span className="text-sm font-bold text-primary">Total: ₦{finance.welfareTotal.toLocaleString()}</span>
        </div>
        {finance.welfare.length === 0 ? (
          <p className="text-muted-foreground py-4">No welfare contributions in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-secondary-foreground">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {finance.welfare.map((r: any, i: number) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">{formatDate(r.contribution_date)}</td>
                  <td className="px-4 py-3 font-semibold">{memberName(r.member_id)}</td>
                  <td className="px-4 py-3">{memberPart(r.member_id)}</td>
                  <td className="px-4 py-3 font-bold text-primary">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.purpose || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dues Report */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <div className="flex items-center justify-between mb-4 border-b border-accent pb-2">
          <h3 className="font-display text-foreground">Dues Collections ({period})</h3>
          <span className="text-sm font-bold text-accent">Total: ₦{finance.duesTotal.toLocaleString()}</span>
        </div>
        {finance.dues.length === 0 ? (
          <p className="text-muted-foreground py-4">No dues collected in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-secondary-foreground">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Period</th>
              </tr>
            </thead>
            <tbody>
              {finance.dues.map((r: any, i: number) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">{formatDate(r.payment_date)}</td>
                  <td className="px-4 py-3 font-semibold">{memberName(r.member_id)}</td>
                  <td className="px-4 py-3">{memberPart(r.member_id)}</td>
                  <td className="px-4 py-3 font-bold text-accent">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.period || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
