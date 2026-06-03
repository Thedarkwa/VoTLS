import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMembers, fetchAllAttendance } from "@/lib/queries";
import { getSundaysInQuarter, currentQuarter } from "@/lib/dateUtils";

const AchieversPage = () => {
  const cq = currentQuarter();
  const [year, setYear] = useState(cq.year);
  const [quarter, setQuarter] = useState(cq.quarter);
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: attendance = [] } = useQuery({ queryKey: ["attendance-all"], queryFn: fetchAllAttendance });

  const data = useMemo(() => {
    const dates = getSundaysInQuarter(year, quarter);
    const choirMembers = members.filter((m: any) => m.part !== "Director");
    const today = new Date().toISOString().split("T")[0];
    const past = dates.filter((d) => d <= today);
    const pastSet = new Set(past);

    const rows = choirMembers
      .map((m: any) => {
        const mAtt = attendance.filter((a: any) => a.member_id === m.id && pastSet.has(a.date));
        const present = mAtt.filter((a: any) => a.status === "Present").length;
        const absentRecs = mAtt.filter((a: any) => a.status === "Absent");
        const absent = absentRecs.length;
        const pct = past.length > 0 ? Math.round((present / past.length) * 100) : 0;
        const reasons = Array.from(
          new Set(absentRecs.map((a: any) => a.reason).filter(Boolean))
        ) as string[];
        return { m, present, absent, pct, total: past.length, reasons };
      })
      .filter(() => past.length > 0);

    const ranked = [...rows].sort((a, b) => b.pct - a.pct);
    const perfect = ranked.filter((r) => r.pct === 100);
    const top3 = ranked.slice(0, 3);
    const parts = ["Soprano", "Alto", "Tenor", "Bass"];
    const bestByPart = parts
      .map((pt) => {
        const ptRows = ranked.filter((r) => r.m.part === pt);
        return ptRows.length ? { part: pt, ...ptRows[0] } : null;
      })
      .filter(Boolean);

    const habitual = rows
      .filter((r) => r.absent >= 3)
      .sort((a, b) => b.absent - a.absent);

    const label = `Q${quarter} ${year}`;

    return { perfect, top3, bestByPart, habitual, label };
  }, [year, quarter, members, attendance]);

  const medals = ["1st", "2nd", "3rd"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Quarterly Achievers</h2>
        <div className="flex gap-2">
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm"
          >
            <option value={1}>Q1 (Jan–Mar)</option>
            <option value={2}>Q2 (Apr–Jun)</option>
            <option value={3}>Q3 (Jul–Sep)</option>
            <option value={4}>Q4 (Oct–Dec)</option>
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-28 rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm"
          />
        </div>
      </div>

      <div className="text-center mb-6">
        <h3 className="font-display text-xl text-foreground">Outstanding Members — {data.label}</h3>
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

      {/* Habitual Absentees */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-display text-foreground mb-4 border-b border-destructive pb-2">
          Habitual Absentees — {data.label}
        </h3>
        {data.habitual.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members with 3+ absences this quarter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary text-secondary-foreground">
                  <th className="px-4 py-3 text-left rounded-tl-lg">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Part</th>
                  <th className="px-4 py-3 text-left">Absences</th>
                  <th className="px-4 py-3 text-left">Attendance</th>
                  <th className="px-4 py-3 text-left rounded-tr-lg">Reasons</th>
                </tr>
              </thead>
              <tbody>
                {data.habitual.map((r: any, i: number) => (
                  <tr key={r.m.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold">{r.m.first_name} {r.m.last_name}</td>
                    <td className="px-4 py-3 text-primary text-xs uppercase tracking-wider">{r.m.part}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/15 text-destructive">
                        {r.absent}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.pct}%</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                      {r.reasons.length ? r.reasons.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchieversPage;
