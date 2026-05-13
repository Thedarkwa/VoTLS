import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attendance", label: "Attendance" },
  { id: "members", label: "Members" },
  { id: "reports", label: "Reports" },
  { id: "achievers", label: "Achievers" },
  { id: "welfare", label: "Welfare" },
  { id: "dues", label: "Dues" },
];

interface AppNavProps {
  active: string;
  onChange: (tab: string) => void;
}

const AppNav = ({ active, onChange }: AppNavProps) => {
  const [open, setOpen] = useState(false);
  const activeLabel = tabs.find((t) => t.id === active)?.label ?? "Menu";

  return (
    <nav className="bg-card/70 backdrop-blur-md border-b border-border shadow-soft">
      {/* Mobile */}
      <div className="md:hidden px-4 py-2 flex items-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          {activeLabel}
        </button>
      </div>
      {open && (
        <div className="md:hidden flex flex-col border-t border-border bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onChange(tab.id);
                setOpen(false);
              }}
              className={cn(
                "text-left px-5 py-3 text-sm font-medium border-l-2 border-transparent transition-colors",
                "text-foreground/70 hover:bg-muted hover:text-foreground",
                active === tab.id && "text-primary border-primary bg-primary/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:flex overflow-x-auto px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-5 py-3.5 text-sm font-medium tracking-wide border-b-2 border-transparent transition-all whitespace-nowrap",
              "text-foreground/60 hover:text-foreground",
              active === tab.id && "text-primary border-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default AppNav;
