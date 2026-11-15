import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordInput } from "../components/PasswordInput";
import { AuthDivider } from "../components/AuthDivider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  User,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { register, isAuthenticated, isSubmitting, error, clearError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Field touch states
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
    acceptTerms?: boolean;
  }>({});

  // Field error messages
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: string;
  }>({});

  // Field validation rules
  const validateField = (
    fieldName: "name" | "email" | "password" | "confirmPassword" | "acceptTerms",
    val: any
  ): string | undefined => {
    switch (fieldName) {
      case "name": {
        const trimmed = (val as string).trim();
        if (!trimmed) return "Full name is required.";
        if (trimmed.length < 2) return "Name must be at least 2 characters.";
        return undefined;
      }
      case "email": {
        const trimmed = (val as string).trim();
        if (!trimmed) return "Email address is required.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) return "Please enter a valid email address.";
        return undefined;
      }
      case "password": {
        const str = val as string;
        if (!str) return "Password is required.";
        if (str.length < 8) return "Password must be at least 8 characters long.";
        return undefined;
      }
      case "confirmPassword": {
        const str = val as string;
        if (!str) return "Please confirm your password.";
        if (str !== password) return "Passwords do not match.";
        return undefined;
      }
      case "acceptTerms": {
        if (!val) return "You must agree to the operational security terms.";
        return undefined;
      }
      default:
        return undefined;
    }
  };

  // Revalidate on change when touched
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    clearError();
    if (touched.name) {
      setFieldErrors((prev) => ({ ...prev, name: validateField("name", val) }));
    }
  };

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
    // Also revalidate confirmPassword if already touched
    if (touched.confirmPassword && confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: val !== confirmPassword ? "Passwords do not match." : undefined,
      }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    clearError();
    if (touched.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: validateField("confirmPassword", val) }));
    }
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAcceptTerms(val);
    clearError();
    if (touched.acceptTerms) {
      setFieldErrors((prev) => ({ ...prev, acceptTerms: validateField("acceptTerms", val) }));
    }
  };

  const handleBlur = (
    field: "name" | "email" | "password" | "confirmPassword" | "acceptTerms"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let val: any;
    if (field === "name") val = name;
    else if (field === "email") val = email;
    else if (field === "password") val = password;
    else if (field === "confirmPassword") val = confirmPassword;
    else val = acceptTerms;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Mark all as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
    });

    const nameErr = validateField("name", name);
    const emailErr = validateField("email", email);
    const passErr = validateField("password", password);
    const confErr = validateField("confirmPassword", confirmPassword);
    const termsErr = validateField("acceptTerms", acceptTerms);

    const errors = {
      name: nameErr,
      email: emailErr,
      password: passErr,
      confirmPassword: confErr,
      acceptTerms: termsErr,
    };

    setFieldErrors(errors);

    if (nameErr || emailErr || passErr || confErr || termsErr) {
      return;
    }

    try {
      const user = await register({
        name,
        email,
        password,
        confirmPassword,
        acceptTerms,
        role: "Analyst",
      });
      toast.success(
        "Workstation Registered",
        `Welcome to GeoAstra, ${user.name}. Session established.`
      );
      navigate("/dashboard", { replace: true });
    } catch {
      // Handled via auth store error banner
    }
  };

  return (
    <AuthLayout
      title="Register Analyst Account"
      subtitle="Establish credentials to access hyperspectral datacube archives, spectral library tools, and GPU compute queues."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Global Error Banner */}
        {error && (
          <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/40 flex items-start gap-2.5 text-xs text-status-danger animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Registration Failed</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Full Name Field */}
        <Input
          label="Full Name & Title"
          type="text"
          name="name"
          placeholder="e.g. Dr. Jane Doe"
          value={name}
          onChange={handleNameChange}
          onBlur={() => handleBlur("name")}
          error={touched.name ? fieldErrors.name : undefined}
          leftIcon={<User className="w-4 h-4 text-content-muted" />}
          disabled={isSubmitting}
        />

        {/* Email Address Field */}
        <Input
          label="Workstation Email Address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="analyst@organization.io"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur("email")}
          error={touched.email ? fieldErrors.email : undefined}
          leftIcon={<Mail className="w-4 h-4 text-content-muted" />}
          disabled={isSubmitting}
        />

        {/* Password Field */}
        <PasswordInput
          label="Password (min. 8 characters)"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur("password")}
          error={touched.password ? fieldErrors.password : undefined}
          helperText="Requires at least 8 characters"
          disabled={isSubmitting}
        />

        {/* Confirm Password Field */}
        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          onBlur={() => handleBlur("confirmPassword")}
          error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
          disabled={isSubmitting}
        />

        {/* Terms & Conditions Checkbox */}
        <div className="pt-1">
          <Checkbox
            label={
              <span className="text-xs text-content-secondary">
                I agree to the{" "}
                <span className="text-accent-primary font-medium">
                  Operational Security Protocols
                </span>{" "}
                and Platform Terms
              </span>
            }
            description="By registering, you accept system usage policies and operational data access standards"
            checked={acceptTerms}
            onChange={handleTermsChange}
            onBlur={() => handleBlur("acceptTerms")}
            disabled={isSubmitting}
          />
          {touched.acceptTerms && fieldErrors.acceptTerms && (
            <span className="text-2xs text-status-danger font-medium block mt-1">
              {fieldErrors.acceptTerms}
            </span>
          )}
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
            {isSubmitting ? "Creating Workstation Session..." : "Create Analyst Account"}
          </Button>
        </div>

        <AuthDivider label="OR" />

        {/* Link back to login */}
        <div className="text-center text-xs text-content-secondary">
          <span>Already registered? </span>
          <Link
            to="/login"
            className="text-accent-primary font-semibold hover:underline transition-colors"
          >
            Sign in to existing session
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
