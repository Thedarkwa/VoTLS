import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMembers, addMember, updateMember, deleteMember } from "@/lib/queries";
import { formatDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const PART_BADGE: Record<string, string> = {
  Soprano: "bg-destructive/15 text-destructive",
  Alto: "bg-purple-500/15 text-purple-400",
  Tenor: "bg-blue-500/15 text-blue-400",
  Bass: "bg-success/15 text-success",
  Director: "bg-accent/15 text-accent",
};

const MembersPage = () => {
  const [partFilter, setPartFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", part: "", phone: "", email: "", join_date: "" });
  const qc = useQueryClient();

  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });

  const filtered = members
    .filter((m: any) => !partFilter || m.part === partFilter)
    .filter((m: any) => !search || `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()));

  const addMut = useMutation({
    mutationFn: addMember,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members"] }); setModalOpen(false); toast.success("Member added!"); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMember(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members"] }); setModalOpen(false); toast.success("Member updated!"); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members"] }); toast.success("Member deleted!"); },
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ first_name: "", last_name: "", part: "", phone: "", email: "", join_date: "" });
    setModalOpen(true);
  };

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({ first_name: m.first_name, last_name: m.last_name, part: m.part, phone: m.phone || "", email: m.email || "", join_date: m.join_date || "" });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.first_name || !form.last_name || !form.part) {
      toast.error("First name, last name and part are required.");
      return;
    }
    const data: any = { ...form };
    if (!data.join_date) delete data.join_date;
    if (!data.phone) delete data.phone;
    if (!data.email) delete data.email;

    if (editId) {
      updateMut.mutate({ id: editId, data });
    } else {
      addMut.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-foreground">Member Directory</h2>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Add Member
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card/50 rounded-xl p-4 border border-border flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Filter by Part</label>
          <select value={partFilter} onChange={(e) => setPartFilter(e.target.value)}
            className="rounded-lg bg-card border border-border px-4 py-2 text-foreground text-sm">
            <option value="">All Parts</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-foreground block mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name..."
              className="pl-9 bg-card border-border text-foreground" />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">{filtered.length} member(s) found</p>

      {/* Table */}
      <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="px-4 py-3 text-left rounded-tl-lg">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Part</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: any, i: number) => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">{m.first_name} {m.last_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${PART_BADGE[m.part] || ""}`}>{m.part}</span>
                </td>
                <td className="px-4 py-3">{m.phone || "-"}</td>
                <td className="px-4 py-3">{m.email || "-"}</td>
                <td className="px-4 py-3">{m.join_date ? formatDate(m.join_date) : "-"}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Button size="sm" variant="outline" className="border-warning text-warning" onClick={() => openEdit(m)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive text-destructive"
                    onClick={() => { if (confirm("Delete this member?")) deleteMut.mutate(m.id); }}>
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
              {editId ? "Edit Member" : "Add New Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">First Name *</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground">Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground">Part *</Label>
              <select value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })}
                className="w-full rounded-lg bg-muted border border-border px-4 py-2 text-foreground text-sm">
                <option value="">-- Select --</option>
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
                <option value="Director">Director</option>
              </select>
            </div>
            <div>
              <Label className="text-foreground">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-muted border-border text-foreground" placeholder="+233..." />
            </div>
            <div>
              <Label className="text-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
            <div>
              <Label className="text-foreground">Join Date</Label>
              <Input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              {editId ? "Update" : "Add Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;
