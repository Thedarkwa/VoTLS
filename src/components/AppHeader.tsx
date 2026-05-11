import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import victoryLogo from "@/assets/victory_logo.jpeg";

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 h-20 px-6 flex items-center justify-between shadow-sm border-b border-border bg-primary">
      <div className="flex items-center gap-3">
        <img src={victoryLogo} alt="Victory Vocals Ghana" className="h-12 object-contain" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <h1 className="font-display text-primary-foreground text-lg font-bold tracking-wide">
          Attendance Management System
        </h1>
        <p className="text-primary-foreground/70 text-xs tracking-[3px] uppercase">Victory Vocals Ghana</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-primary-foreground/80 text-sm hidden sm:inline">{user?.email}</span>
        <Button variant="outline" size="sm" onClick={signOut}
          className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
