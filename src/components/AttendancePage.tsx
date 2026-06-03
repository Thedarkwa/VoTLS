import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMembers, fetchAttendance, markAttendance, deleteAttendance, bulkMarkAbsent, updateAttendanceReason } from "@/lib/queries";
import { todayStr, formatDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Lock, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const REASON_OPTIONS = ["Sick", "Travel", "Work", "Family", "Other"] as const;
type ReasonChoice = typeof REASON_OPTIONS[number];

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

  // Dialog state for absence reason
  const [reasonDialog, setReasonDialog] = useState<
    | { mode: "mark"; memberId: string; memberName: string }
    | { mode: "edit"; attendanceId: string; memberName: string; current: string | null }
    | { mode: "bulk"; memberIds: string[] }
    | null
  >(null);
  const [reasonChoice, setReasonChoice] = useState<ReasonChoice>("Sick");
  const [reasonOther, setReasonOther] = useState("");

  const openMarkAbsent = (memberId: string, memberName: string) => {
    setReasonChoice("Sick");
    setReasonOther("");
    setReasonDialog({ mode: "mark", memberId, memberName });
  };

  const openEditReason = (attendanceId: string, memberName: string, current: string | null) => {
    const isPreset = current && (REASON_OPTIONS as readonly string[]).includes(current);
    setReasonChoice((isPreset ? current : current ? "Other" : "Sick") as ReasonChoice);
    setReasonOther(isPreset || !current ? "" : current);
    setReasonDialog({ mode: "edit", attendanceId, memberName, current });
  };

  const resolvedReason = (): string | null => {
    if (reasonChoice === "Other") {
      const t = reasonOther.trim();
      return t || null;
    }
    return reasonChoice;
  };

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
    mutationFn: ({ member_id, status, reason }: { member_id: string; status: string; reason?: string | null }) =>
      markAttendance(member_id, date, status, reason),
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
    setReasonChoice("Other");
    setReasonOther("Not specified");
    setReasonDialog({ mode: "bulk", memberIds: unmarked.map((m: any) => m.id) });
  };

  const handleReasonSubmit = async () => {
    if (!reasonDialog) return;
    if (reasonChoice === "Other" && !reasonOther.trim()) {
      toast.error("Please describe the reason.");
      return;
    }
    const reason = resolvedReason();
    try {
      if (reasonDialog.mode === "mark") {
        await markMut.mutateAsync({ member_id: reasonDialog.memberId, status: "Absent", reason });
      } else if (reasonDialog.mode === "edit") {
        await updateAttendanceReason(reasonDialog.attendanceId, reason);
        qc.invalidateQueries({ queryKey: ["attendance"] });
        qc.invalidateQueries({ queryKey: ["attendance-all"] });
      } else {
        await bulkMarkAbsent(reasonDialog.memberIds, date, reason);
        qc.invalidateQueries({ queryKey: ["attendance"] });
        qc.invalidateQueries({ queryKey: ["attendance-all"] });
        toast.success(`${reasonDialog.memberIds.length} member(s) marked Absent.`);
      }
      setReasonDialog(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
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
                      status === "Present" ? "bg-primary/15 text-primary" :
                      status === "Absent" ? "bg-destructive/15 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {status}
                    </span>
                    {status === "Absent" && (
                      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <span>Reason: {rec?.reason || "—"}</span>
                        <button
                          type="button"
                          onClick={() => openEditReason(rec.id, `${m.first_name} ${m.last_name}`, rec?.reason ?? null)}
                          className="text-primary hover:text-primary/80"
                          aria-label="Edit reason"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {status !== "Present" && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                        onClick={() => openMarkAbsent(m.id, `${m.first_name} ${m.last_name}`)}
                      >
                        Mark Absent
                      </Button>
                    )}
                    {status === "Not Marked" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive"
                        onClick={() => openMarkAbsent(m.id, `${m.first_name} ${m.last_name}`)}
                      >
                        Absent
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

      <Dialog open={!!reasonDialog} onOpenChange={(o) => !o && setReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonDialog?.mode === "bulk"
                ? `Reason for ${reasonDialog?.mode === "bulk" ? (reasonDialog as any).memberIds.length : 0} absentee(s)`
                : reasonDialog?.mode === "edit"
                ? `Edit reason — ${(reasonDialog as any)?.memberName ?? ""}`
                : `Reason for absence — ${(reasonDialog as any)?.memberName ?? ""}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={reasonChoice} onValueChange={(v) => setReasonChoice(v as ReasonChoice)}>
              {REASON_OPTIONS.map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`reason-${opt}`} />
                  <Label htmlFor={`reason-${opt}`}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
            {reasonChoice === "Other" && (
              <Input
                placeholder="Describe the reason"
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleReasonSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;
