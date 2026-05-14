import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMembers, fetchAllAttendance, fetchWelfare, fetchDues } from "@/lib/queries";
import { getSundaysInMonth, formatDate, currentMonthStr } from "@/lib/dateUtils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Attendance Report sheet
    const reportData = report.rows.map((r, i) => ({
      "#": i + 1,
      "Name": `${r.m.first_name} ${r.m.last_name}`,
      "Part": r.m.part,
      "Total Sessions": r.totalSessions,
      "Present": r.present,
      "Absent": r.absent,
      "Performance (%)": r.pct,
    }));
    const ws1 = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws1, "Attendance Report");

    // Poor Attendance sheet
    if (report.poorAtt.length > 0) {
      const poorData = report.poorAtt.map((r, i) => ({
        "#": i + 1,
        "Name": `${r.m.first_name} ${r.m.last_name}`,
        "Part": r.m.part,
        "Performance (%)": r.pct,
      }));
      const ws2 = XLSX.utils.json_to_sheet(poorData);
      XLSX.utils.book_append_sheet(wb, ws2, "Poor Attendance");
    }

    // Raw attendance data sheet
    const rawData = attendance.map((a: any) => {
      const member = members.find((m: any) => m.id === a.member_id);
      return {
        "Date": a.date,
        "Name": member ? `${member.first_name} ${member.last_name}` : "Unknown",
        "Part": member?.part || "",
        "Status": a.status,
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, ws3, "Raw Data");

    // Welfare sheet
    const welfareData = finance.welfare.map((r: any, i: number) => ({
      "#": i + 1,
      "Date": r.contribution_date,
      "Name": memberName(r.member_id),
      "Part": memberPart(r.member_id),
      "Amount": Number(r.amount),
      "Purpose": r.purpose || "",
      "Notes": r.notes || "",
    }));
    if (welfareData.length) {
      const ws4 = XLSX.utils.json_to_sheet(welfareData);
      XLSX.utils.book_append_sheet(wb, ws4, "Welfare");
    }

    // Dues sheet
    const duesData = finance.dues.map((r: any, i: number) => ({
      "#": i + 1,
      "Date": r.payment_date,
      "Name": memberName(r.member_id),
      "Part": memberPart(r.member_id),
      "Amount": Number(r.amount),
      "Period": r.period || "",
      "Notes": r.notes || "",
    }));
    if (duesData.length) {
      const ws5 = XLSX.utils.json_to_sheet(duesData);
      XLSX.utils.book_append_sheet(wb, ws5, "Dues");
    }

    XLSX.writeFile(wb, `VVG_Attendance_${type}_${period}_${monthVal}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Reports</h2>
        <Button onClick={exportToExcel} className="bg-success text-success-foreground">
          <Download className="w-4 h-4 mr-1" /> Export to Excel
        </Button>
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
          <span className="text-sm font-bold text-primary">Total: GHC {finance.welfareTotal.toLocaleString()}</span>
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
                  <td className="px-4 py-3 font-bold text-primary">GHC {Number(r.amount).toLocaleString()}</td>
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
          <span className="text-sm font-bold text-accent">Total: GHC {finance.duesTotal.toLocaleString()}</span>
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
                  <td className="px-4 py-3 font-bold text-accent">GHC {Number(r.amount).toLocaleString()}</td>
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
