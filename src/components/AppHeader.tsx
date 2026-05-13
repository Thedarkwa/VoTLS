import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 h-20 px-4 sm:px-6 flex items-center justify-between gap-3 border-b border-border/50 bg-primary shadow-soft">
      <div className="flex-1 min-w-0 text-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:flex-none">
        <h1 className="font-display text-primary-foreground text-base sm:text-lg font-bold tracking-wide truncate">
          Choir Management System
        </h1>
        <p className="hidden sm:block text-primary-foreground/70 text-xs tracking-[3px] uppercase">Voices of The Living Saints</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-primary-foreground/80 text-sm hidden sm:inline">{user?.email}</span>
        <Button variant="outline" size="sm" onClick={signOut}
          className="border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
          <LogOut className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
