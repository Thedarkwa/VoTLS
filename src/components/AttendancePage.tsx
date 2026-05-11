import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMembers, fetchAttendance, markAttendance, deleteAttendance, bulkMarkAbsent } from "@/lib/queries";
import { todayStr, formatDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Lock, Trash2 } from "lucide-react";

const PART_BADGE: Record<string, string> = {
  Soprano: "bg-destructive/15 text-destructive",
  Alto: "bg-purple-500/15 text-purple-400",
  Tenor: "bg-blue-500/15 text-blue-400",
  Bass: "bg-success/15 text-success",
};

const AttendancePage = () => {
  const [date, setDate] = useState(todayStr());
  const [partFilter, setPartFilter] = useState("");
  const qc = useQueryClient();

  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", date],
    queryFn: () => fetchAttendance(date),
  });

  const choirMembers = members
    .filter((m: any) => m.part !== "Director")
    .filter((m: any) => !partFilter || m.part === partFilter);

  const attMap = new Map(attendance.map((a: any) => [a.member_id, a]));

  const markMut = useMutation({
    mutationFn: ({ member_id, status }: { member_id: string; status: string }) =>
      markAttendance(member_id, date, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
  });

  const handleCloseAttendance = async () => {
    const unmarked = choirMembers.filter((m: any) => !attMap.has(m.id));
    if (!unmarked.length) {
      toast.info("All members already marked.");
      return;
    }
    await bulkMarkAbsent(unmarked.map((m: any) => m.id), date);
    qc.invalidateQueries({ queryKey: ["attendance"] });
    qc.invalidateQueries({ queryKey: ["attendance-all"] });
    toast.success(`${unmarked.length} member(s) marked Absent.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Mark Attendance</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm"
          />
          <Button onClick={handleCloseAttendance} className="bg-destructive text-destructive-foreground">
            <Lock className="w-4 h-4 mr-1" /> Close Attendance
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card/50 rounded-xl p-4 border border-border flex gap-4 flex-wrap">
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Filter by Part</label>
          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm"
          >
            <option value="">All Parts</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="px-4 py-3 text-left rounded-tl-lg">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Part</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {choirMembers.map((m: any, i: number) => {
              const rec = attMap.get(m.id) as any;
              const status = rec?.status || "Not Marked";
              return (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{m.first_name} {m.last_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${PART_BADGE[m.part] || ""}`}>
                      {m.part}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      status === "Present" ? "bg-success/15 text-success" :
                      status === "Absent" ? "bg-destructive/15 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {status !== "Present" && (
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90 text-foreground"
                        onClick={() => markMut.mutate({ member_id: m.id, status: "Present" })}
                      >
                        <Check className="w-3 h-3 mr-1" /> Present
                      </Button>
                    )}
                    {status === "Present" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-warning text-warning"
                        onClick={() => markMut.mutate({ member_id: m.id, status: "Absent" })}
                      >
                        Mark Absent
                      </Button>
                    )}
                    {rec && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive"
                        onClick={() => delMut.mutate(rec.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {choirMembers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No members found. Add members first.</p>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
