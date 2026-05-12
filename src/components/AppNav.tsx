import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attendance", label: "Attendance" },
  { id: "members", label: "Members" },
  { id: "reports", label: "Reports" },
  { id: "achievers", label: "Achievers" },
  { id: "welfare", label: "Welfare" },
];

interface AppNavProps {
  active: string;
  onChange: (tab: string) => void;
}

const AppNav = ({ active, onChange }: AppNavProps) => (
  <nav className="bg-background/95 border-b border-border flex overflow-x-auto px-6">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          "px-5 py-3.5 text-sm font-semibold tracking-wide border-b-3 border-transparent transition-all whitespace-nowrap",
          "text-foreground/60 hover:text-accent hover:border-primary",
          active === tab.id && "text-accent border-accent bg-accent/5"
        )}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default AppNav;
