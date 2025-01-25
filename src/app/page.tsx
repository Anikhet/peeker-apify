"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    
    setLoading(true);
    // Store email for use in other components
    localStorage.setItem('userEmail', email);
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <AnimatedGridPattern
        numSquares={200}
        maxOpacity={0.1}
        duration={1}
        repeatDelay={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[100%] skew-y-12"
        )}
      />
      <div className="w-full max-w-md p-10 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Login to Apollo Scraper
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <RainbowButton 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Enter App"}
          </RainbowButton>
        </form>
      </div>
    </div>
  );
};

export default Auth;
