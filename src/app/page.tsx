"use client";
import { useRouter } from "next/navigation";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
// import { Button } from "@/components/ui/button";


const HomePage = () => {
  const router = useRouter();
  
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
      <div className="w-full max-w-md p-10 space-y-6  flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Apollo Scraper
        </h1>
       <RainbowButton onClick={() => router.push('/apollo')}>Buy Apollo</RainbowButton>
      </div>
    </div>
  );
};

export default HomePage;