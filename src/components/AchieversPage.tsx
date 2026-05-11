import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMembers, fetchAllAttendance } from "@/lib/queries";
import { getSundaysInMonth, currentMonthStr } from "@/lib/dateUtils";

const AchieversPage = () => {
  const [monthVal, setMonthVal] = useState(currentMonthStr());
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance-all"], queryFn: fetchAllAttendance });

  const data = useMemo(() => {
    const [fy, fm] = monthVal.split("-").map(Number);
    const dates = getSundaysInMonth(fy, fm - 1);
    const choirMembers = members.filter((m: any) => m.part !== "Director");
    const today = new Date().toISOString().split("T")[0];
    const past = dates.filter((d) => d <= today);

    const rows = choirMembers
      .map((m: any) => {
        const mAtt = attendance.filter((a: any) => a.member_id === m.id && past.includes(a.date));
        const present = mAtt.filter((a: any) => a.status === "Present").length;
        const pct = past.length > 0 ? Math.round((present / past.length) * 100) : 0;
        return { m, present, pct, total: past.length };
      })
      .filter(() => past.length > 0)
      .sort((a, b) => b.pct - a.pct);

    const perfect = rows.filter((r) => r.pct === 100);
    const top3 = rows.slice(0, 3);
    const parts = ["Soprano", "Alto", "Tenor", "Bass"];
    const bestByPart = parts.map((pt) => {
      const ptRows = rows.filter((r) => r.m.part === pt);
      return ptRows.length ? { part: pt, ...ptRows[0] } : null;
    }).filter(Boolean);

    const monthName = new Date(fy, fm - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });

    return { perfect, top3, bestByPart, monthName };
  }, [monthVal, members, attendance]);

  const medals = ["1st", "2nd", "3rd"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Monthly Achievers</h2>
        <input type="month" value={monthVal} onChange={(e) => setMonthVal(e.target.value)}
          className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm" />
      </div>

      <div className="text-center mb-6">
        <h3 className="font-display text-xl text-foreground">Outstanding Members — {data.monthName}</h3>
        <p className="text-foreground/60 text-sm">Members with 100% attendance are celebrated below</p>
      </div>

      {/* Perfect Attendance */}
      {data.perfect.length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">Perfect Attendance (100%)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.perfect.map((r: any) => (
              <div key={r.m.id} className="rounded-xl p-5 text-center border-2 border-accent bg-accent/5">
                <div className="text-sm font-bold text-accent mb-2">Top</div>
                <div className="font-display font-bold text-foreground">{r.m.first_name} {r.m.last_name}</div>
                <div className="text-xs uppercase tracking-wider text-primary">{r.m.part}</div>
                <div className="font-display text-2xl font-bold text-accent mt-2">100%</div>
                <div className="text-xs text-muted-foreground mt-1">{r.present}/{r.total} sessions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-display text-foreground mb-4 border-b border-accent pb-2">Top 3 Overall Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.top3.map((r: any, i: number) => (
            <div key={r.m.id} className="rounded-xl p-5 text-center border-2 border-accent bg-accent/5">
              <div className="text-3xl mb-2">{medals[i]}</div>
              <div className="font-display font-bold text-foreground">{r.m.first_name} {r.m.last_name}</div>
              <div className="text-xs uppercase tracking-wider text-primary">{r.m.part}</div>
              <div className="font-display text-2xl font-bold text-accent mt-2">{r.pct}%</div>
              <div className="text-xs text-muted-foreground mt-1">{r.present}/{r.total} sessions</div>
            </div>
          ))}
        </div>
      </div>

      {/* Best by Part */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.bestByPart.map((r: any) => (
          <div key={r.part} className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-display text-foreground mb-4">Best in {r.part}</h3>
            <div className="rounded-xl p-5 text-center border-2 border-accent bg-accent/5 max-w-xs mx-auto">
              <div className="text-sm font-bold text-accent mb-2">Top</div>
              <div className="font-display font-bold text-foreground">{r.m.first_name} {r.m.last_name}</div>
              <div className="text-xs uppercase tracking-wider text-primary">{r.m.part}</div>
              <div className="font-display text-2xl font-bold text-accent mt-2">{r.pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchieversPage;
