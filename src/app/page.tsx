"use client";
import { useRouter } from "next/navigation";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import Image from "next/image";
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
      <div className="w-full max-w-md p-10 space-y-10 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-center text-gray-800 flex items-center justify-center tracking-tight">
          Apollo Scraper
          <Image
            width={100}
            height={100}
            src="/fire.gif"
            alt="Fire"
            className=" w-12 h-12"
          />
        </h1>
        <RainbowButton onClick={() => router.push('/apollo')}>Start Scraping</RainbowButton>
      </div>
    </div>
  );
};

export default HomePage;
