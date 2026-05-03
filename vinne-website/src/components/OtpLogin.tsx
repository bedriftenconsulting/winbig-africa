import { useState } from "react";
import { motion } from "framer-motion";
import { sendOtp, verifyOtpLogin, type LoginResponse } from "@/lib/api";

interface OtpLoginProps {
  onSuccess: (response: LoginResponse) => void;
  onError: (error: string) => void;
}

const OtpLogin = ({ onSuccess, onError }: OtpLoginProps) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as Ghana number
    if (digits.startsWith("233")) {
      return digits;
    } else if (digits.startsWith("0")) {
      return "233" + digits.slice(1);
    } else if (digits.length <= 9) {
      return "233" + digits;
    }
    return digits;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      onError("Please enter your phone number");
      return;
    }

    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length < 12) {
      onError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const response = await sendOtp(formattedPhone);
      if (response.success) {
        setStep("otp");
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        onError(response.message || "Failed to send OTP");
      }
    } catch (error) {
      onError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      onError("Please enter the OTP code");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      const response = await verifyOtpLogin(formattedPhone, otp);
      if (response.success && response.data) {
        // Store auth data
        localStorage.setItem("player_token", response.data.token);
        localStorage.setItem("player_id", response.data.player.id);
        localStorage.setItem("player_phone", response.data.player.phone);
        if (response.data.player.name) {
          localStorage.setItem("player_name", response.data.player.name);
        }
        onSuccess(response);
      } else {
        onError(response.message || response.error || "Invalid OTP code");
      }
    } catch (error) {
      onError("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      const response = await sendOtp(formattedPhone);
      if (response.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        onError(response.message || "Failed to resend OTP");
      }
    } catch (error) {
      onError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-heading text-white mb-2">Sign In</h2>
          <p className="text-white/60">
            Enter your phone number to receive an OTP
          </p>
        </div>

        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0200000000 or 233200000000"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-heading py-3 rounded-lg btn-glow hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        <div className="text-center text-sm text-white/60">
          <p>
            New to WinBig? Your account will be created automatically when you verify your phone number.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-heading text-white mb-2">Enter OTP</h2>
        <p className="text-white/60">
          We sent a code to {phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4")}
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            OTP Code
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl tracking-widest placeholder-white/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            maxLength={6}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full bg-primary text-white font-heading py-3 rounded-lg btn-glow hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify & Sign In"}
        </button>
      </form>

      <div className="text-center space-y-2">
        <button
          onClick={() => setStep("phone")}
          className="text-white/60 hover:text-white text-sm transition"
        >
          ← Change phone number
        </button>
        
        <div>
          {countdown > 0 ? (
            <p className="text-white/60 text-sm">
              Resend OTP in {countdown}s
            </p>
          ) : (
            <button
              onClick={handleResendOtp}
              disabled={loading}
              className="text-gold hover:text-gold/80 text-sm transition disabled:opacity-50"
            >
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default OtpLogin;