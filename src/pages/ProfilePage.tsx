import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Phone, Mail, Calendar, ShieldCheck, LogOut, Ticket, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 pb-16 text-center">
          <User className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h1 className="font-heading text-2xl text-foreground mb-2">Sign in to view your profile</h1>
          <p className="text-muted-foreground mb-6">Manage your account and track your winnings.</p>
          <Link to="/signin" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:brightness-110 transition">
            Sign In
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const joined = new Date(user.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-4">

          {/* Avatar + name */}
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
              <span className="font-heading text-2xl text-primary">
                {user.first_name?.[0]?.toUpperCase() || user.phone_number?.[4]?.toUpperCase() || '?'}
              </span>
            </div>
            <h1 className="font-heading text-xl text-foreground">
              {user.first_name || user.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.phone_number}
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <ShieldCheck size={13} className={user.phone_verified ? 'text-green-400' : 'text-muted-foreground'} />
              <span className="text-xs text-muted-foreground">
                {user.phone_verified ? 'Verified account' : 'Unverified'}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <Row icon={<Phone size={15} />} label="Phone" value={user.phone_number} />
            <Row icon={<Mail size={15} />}  label="Email" value={user.email || <span className="text-muted-foreground italic text-xs">Not provided during sign up</span>} />
            <Row icon={<Calendar size={15} />} label="Member since" value={joined} />
            <Row icon={<ShieldCheck size={15} />} label="Account status"
              value={<span className={`capitalize font-medium ${user.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}`}>{user.status.toLowerCase()}</span>} />
          </div>

          {/* Quick links */}
          <Link to="/my-tickets"
            className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition group">
            <div className="flex items-center gap-3">
              <Ticket size={18} className="text-primary" />
              <span className="text-foreground font-medium">My Tickets</span>
            </div>
            <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition" />
          </Link>

          {/* Sign out */}
          <Button variant="outline" className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400" onClick={handleLogout}>
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>

        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-3 px-5 py-3.5">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-muted-foreground text-sm w-28 shrink-0">{label}</span>
    <span className="text-foreground text-sm">{value}</span>
  </div>
);

export default ProfilePage;
