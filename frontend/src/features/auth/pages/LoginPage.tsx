import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { AuthDivider } from "../components/AuthDivider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login, isAuthenticated, isSubmitting, error, clearError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Field touch state for validation
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Preserve redirect target from ProtectedRoute
  const from = (location.state as any)?.from?.pathname
    ? (location.state as any).from.pathname + ((location.state as any).from.search || "")
    : "/dashboard";

  // Validate single field
  const validateField = (name: "email" | "password", val: string): string | undefined => {
    if (name === "email") {
      const trimmed = val.trim();
      if (!trimmed) return "Email address is required.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return "Please enter a valid email address.";
    }
    if (name === "password") {
      if (!val) return "Password is required.";
    }
    return undefined;
  };

  // Revalidate on change if touched
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    clearError();
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateField("email", val) }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    clearError();
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validateField("password", val) }));
    }
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === "email" ? email : password;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Mark all as touched
    setTouched({ email: true, password: true });

    const emailErr = validateField("email", email);
    const passErr = validateField("password", password);

    setFieldErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      return;
    }

    try {
      const user = await login({ email, password, rememberMe });
      toast.success(
        "Authentication Successful",
        `Welcome back, ${user.name}. Workstation session verified.`
      );
      navigate(from, { replace: true });
    } catch {
      // Error message is displayed through the auth store error state
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in with your credentials to access calibrated datacubes and spectral processing pipelines."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Global Error Banner */}
        {error && (
          <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/40 flex items-start gap-2.5 text-xs text-status-danger animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Authentication Failed</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Email Field */}
        <Input
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="user@organization.io"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur("email")}
          error={touched.email ? fieldErrors.email : undefined}
          leftIcon={<Mail className="w-4 h-4 text-content-muted" />}
          disabled={isSubmitting}
        />

        {/* Password Field */}
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur("password")}
          error={touched.password ? fieldErrors.password : undefined}
          disabled={isSubmitting}
        />

        {/* Remember Me Row */}
        <div className="flex items-center justify-between pt-1">
          <Checkbox
            label={<span className="text-xs text-content-secondary">Remember me</span>}
            description="Persists session across browser restarts"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full justify-center"
            rightIcon={!isSubmitting ? <ArrowRight className="w-4 h-4" /> : undefined}
          >
            {isSubmitting ? "Authenticating Session..." : "Sign In to Workstation"}
          </Button>
        </div>

        <AuthDivider label="OR" />

        {/* Register Link */}
        <div className="text-center text-xs text-content-secondary">
          <span>Need a workstation account? </span>
          <Link
            to="/register"
            className="text-accent-primary font-semibold hover:underline transition-colors"
          >
            Register new account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
