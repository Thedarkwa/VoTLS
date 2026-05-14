import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWelfare, addWelfare, updateWelfare, deleteWelfare, fetchMembers } from "@/lib/queries";
import { formatDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, HandCoins } from "lucide-react";

const WelfarePage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    member_id: "",
    amount: "",
    contribution_date: new Date().toISOString().slice(0, 10),
    purpose: "",
    notes: "",
  });

  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: welfare = [] } = useQuery({ queryKey: ["welfare"], queryFn: fetchWelfare });

  const memberMap = new Map<string, any>(members.map((m: any) => [m.id, m]));

  const enriched = welfare.map((w: any) => ({
    ...w,
    member: memberMap.get(w.member_id),
  }));

  const filtered = enriched
    .filter((w: any) => !memberFilter || w.member_id === memberFilter)
    .filter((w: any) => {
      if (!search) return true;
      const name = w.member ? `${w.member.first_name} ${w.member.last_name}` : "";
      return name.toLowerCase().includes(search.toLowerCase()) ||
        (w.purpose || "").toLowerCase().includes(search.toLowerCase());
    });

  const total = filtered.reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);

  const addMut = useMutation({
    mutationFn: addWelfare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["welfare"] });
      setModalOpen(false);
      toast.success("Contribution recorded!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateWelfare(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["welfare"] });
      setModalOpen(false);
      toast.success("Contribution updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteWelfare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["welfare"] });
      toast.success("Contribution deleted.");
    },
  });

  const openAdd = () => {
    setEditId(null);
    setForm({
      member_id: "",
      amount: "",
      contribution_date: new Date().toISOString().slice(0, 10),
      purpose: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (w: any) => {
    setEditId(w.id);
    setForm({
      member_id: w.member_id,
      amount: String(w.amount),
      contribution_date: w.contribution_date,
      purpose: w.purpose || "",
      notes: w.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.member_id || !form.amount || !form.contribution_date) {
      toast.error("Member, amount and date are required.");
      return;
    }
    const amt = Number(form.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    const data: any = {
      member_id: form.member_id,
      amount: amt,
      contribution_date: form.contribution_date,
      purpose: form.purpose || null,
      notes: form.notes || null,
    };
    if (editId) updateMut.mutate({ id: editId, data });
    else addMut.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-accent" /> Welfare Contributions
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Record and track member welfare payments.</p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Record Contribution
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Records</p>
          <p className="text-3xl font-display text-foreground mt-1">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-display text-accent mt-1">GHC {total.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/50 rounded-xl p-4 border border-border flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Filter by Member</label>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm"
          >
            <option value="">All Members</option>
            {members.map((m: any) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or purpose..."
              className="pl-9 bg-card border-border text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="px-4 py-3 text-left rounded-tl-lg">#</th>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Purpose</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-left rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No contributions recorded yet.
                </td>
              </tr>
            )}
            {filtered.map((w: any, i: number) => (
              <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">
                  {w.member ? `${w.member.first_name} ${w.member.last_name}` : "Unknown"}
                </td>
                <td className="px-4 py-3 text-accent font-bold">GHC {Number(w.amount).toFixed(2)}</td>
                <td className="px-4 py-3">{formatDate(w.contribution_date)}</td>
                <td className="px-4 py-3">{w.purpose || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{w.notes || "-"}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Button size="sm" variant="outline" className="border-warning text-warning" onClick={() => openEdit(w)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive"
                    onClick={() => { if (confirm("Delete this contribution?")) deleteMut.mutate(w.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              {editId ? "Edit Contribution" : "Record Contribution"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-foreground">Member *</Label>
              <select
                value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                className="w-full rounded-lg bg-muted border border-border px-4 py-2 text-foreground text-sm"
              >
                <option value="">-- Select member --</option>
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.part})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-foreground">Amount (GHS) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">Date *</Label>
              <Input
                type="date"
                value={form.contribution_date}
                onChange={(e) => setForm({ ...form, contribution_date: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-foreground">Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Funeral, Wedding, Monthly dues"
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-foreground">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-muted border-border text-foreground"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              {editId ? "Update" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WelfarePage;