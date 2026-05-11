import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMembers, fetchAllAttendance } from "@/lib/queries";
import { getSundaysInMonth, formatDate, currentMonthStr } from "@/lib/dateUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";

const PART_COLORS: Record<string, string> = {
  Soprano: "#e74c3c",
  Alto: "#9b59b6",
  Tenor: "#3498db",
  Bass: "#27ae60",
};

const DashboardPage = () => {
  const [monthFilter, setMonthFilter] = useState(currentMonthStr());
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance-all"], queryFn: fetchAllAttendance });

  const choirMembers = useMemo(() => members.filter((m: any) => m.part !== "Director"), [members]);

  const stats = useMemo(() => {
    const [fy, fm] = monthFilter.split("-").map(Number);
    const sundays = getSundaysInMonth(fy, fm - 1);
    const monthAtt = attendance.filter((a: any) => a.date.startsWith(monthFilter));

    let totalPresent = 0, totalAbsent = 0, sessions = 0;
    sundays.forEach((s) => {
      const dayAtt = monthAtt.filter((a: any) => a.date === s);
      if (dayAtt.length) {
        totalPresent += dayAtt.filter((a: any) => a.status === "Present").length;
        totalAbsent += dayAtt.filter((a: any) => a.status === "Absent").length;
        sessions++;
      }
    });

    const avgPresent = sessions ? Math.round(totalPresent / sessions) : 0;
    const avgAbsent = sessions ? Math.round(totalAbsent / sessions) : 0;
    const pct = (avgPresent + avgAbsent) > 0 ? Math.round((avgPresent / (avgPresent + avgAbsent)) * 100) : 0;

    // Parts data for pie chart
    const parts = ["Soprano", "Alto", "Tenor", "Bass"];
    const partsData = parts.map((pt) => {
      const ptMemIds = choirMembers.filter((m: any) => m.part === pt).map((m: any) => m.id);
      const count = monthAtt.filter((a: any) => ptMemIds.includes(a.member_id) && a.status === "Present").length;
      return { name: pt, value: count, fill: PART_COLORS[pt] };
    });

    // Trend data
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(fy, fm - 1 - i, 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mSuns = getSundaysInMonth(d.getFullYear(), d.getMonth());
      const mAtt = attendance.filter((a: any) => a.date.startsWith(ms));
      let mp = 0, s2 = 0;
      mSuns.forEach((s) => {
        const da = mAtt.filter((a: any) => a.date === s);
        if (da.length) { mp += da.filter((a: any) => a.status === "Present").length; s2++; }
      });
      trendData.push({ month: d.toLocaleString("default", { month: "short" }), avg: s2 ? Math.round(mp / s2) : 0 });
    }

    // Weekly table
    const weeklyData = sundays.map((s) => {
      const dayAtt = monthAtt.filter((a: any) => a.date === s);
      const row: any = { date: s };
      parts.forEach((pt) => {
        const ptIds = choirMembers.filter((m: any) => m.part === pt).map((m: any) => m.id);
        row[pt] = dayAtt.filter((a: any) => ptIds.includes(a.member_id) && a.status === "Present").length;
      });
      row.present = dayAtt.filter((a: any) => a.status === "Present").length;
      row.absent = dayAtt.filter((a: any) => a.status === "Absent").length;
      return row;
    });

    return { total: choirMembers.length, avgPresent, avgAbsent, pct, sessions, partsData, trendData, weeklyData };
  }, [monthFilter, members, attendance, choirMembers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Dashboard Overview</h2>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Members", value: stats.total, bg: "bg-primary" },
          { label: "Avg Present", value: stats.avgPresent, bg: "bg-success" },
          { label: "Avg Absent", value: stats.avgAbsent, bg: "bg-destructive" },
          { label: "Attendance Rate", value: `${stats.pct}%`, bg: "bg-accent" },
          { label: "Sessions", value: stats.sessions, bg: "bg-secondary" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 text-center ${s.bg} shadow-sm`}>
            <div className="font-display text-3xl font-bold text-primary-foreground">{s.value}</div>
            <div className="text-xs uppercase tracking-wider text-primary-foreground/80 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">Attendance by Part</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.partsData} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {stats.partsData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.trendData}>
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Table */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">Weekly Attendance Summary</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="px-4 py-3 text-left rounded-tl-lg">Date</th>
              <th className="px-4 py-3 text-left">Soprano</th>
              <th className="px-4 py-3 text-left">Alto</th>
              <th className="px-4 py-3 text-left">Tenor</th>
              <th className="px-4 py-3 text-left">Bass</th>
              <th className="px-4 py-3 text-left">Present</th>
              <th className="px-4 py-3 text-left rounded-tr-lg">Absent</th>
            </tr>
          </thead>
          <tbody>
            {stats.weeklyData.map((row: any) => (
              <tr key={row.date} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3">{row.Soprano}</td>
                <td className="px-4 py-3">{row.Alto}</td>
                <td className="px-4 py-3">{row.Tenor}</td>
                <td className="px-4 py-3">{row.Bass}</td>
                <td className="px-4 py-3 text-success font-bold">{row.present}</td>
                <td className="px-4 py-3 text-destructive font-bold">{row.absent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
