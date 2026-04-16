import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, User, LogOut, Ticket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        {/* Logo → home */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="WinBig Africa" className="h-10 w-10" />
          <span className="font-heading text-xl text-primary">WINBIG AFRICA</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/competitions" className="text-foreground/80 hover:text-primary transition-colors text-sm font-medium">Competitions</Link>
          <Link to="/results" className="text-foreground/80 hover:text-primary transition-colors text-sm font-medium">Results</Link>
          <Link to="/faq" className="text-foreground/80 hover:text-primary transition-colors text-sm font-medium">FAQ</Link>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-3 ml-2">
              <Link
                to="/my-tickets"
                className="flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors text-sm font-medium"
              >
                <Ticket size={16} />
                My Tickets
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <User size={16} />
                    {user?.first_name || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User size={15} />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-tickets" className="flex items-center gap-2 cursor-pointer">
                      <Ticket size={15} />
                      My Tickets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-500 cursor-pointer focus:text-red-500">
                    <LogOut size={15} />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/signin"
                className="border border-primary text-primary px-5 py-2 rounded-lg font-semibold text-sm hover:bg-primary/10 transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm btn-glow hover:brightness-110 transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 flex flex-col gap-3">
          <Link to="/competitions" onClick={() => setOpen(false)} className="py-2 text-foreground/80 hover:text-primary">Competitions</Link>
          <Link to="/results" onClick={() => setOpen(false)} className="py-2 text-foreground/80 hover:text-primary">Results</Link>
          <Link to="/faq" onClick={() => setOpen(false)} className="py-2 text-foreground/80 hover:text-primary">FAQ</Link>
          
          {isAuthenticated ? (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/my-tickets"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2 text-foreground/80 hover:text-primary"
              >
                <Ticket size={16} />
                My Tickets
              </Link>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2 text-foreground/80 hover:text-primary"
              >
                <User size={16} />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 py-2 text-red-600 text-left"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/signin"
                onClick={() => setOpen(false)}
                className="border border-primary text-primary px-5 py-2 rounded-lg font-semibold text-sm text-center hover:bg-primary/10 transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm text-center btn-glow"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
