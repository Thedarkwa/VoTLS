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

const AppNav = ({ active, onChange }: AppNavProps) => (
  <nav className="bg-card/70 backdrop-blur-md border-b border-border flex overflow-x-auto px-6 shadow-soft">
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
  </nav>
);

export default AppNav;
