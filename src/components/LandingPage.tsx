"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import {  useEffect } from "react";
// import Image from "next/image";

// import { Button } from "@/components/ui/button";

const HomePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams()

  useEffect(() => {
    console.log(searchParams)
  }, [searchParams])
  
  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-1">
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
              <h2 className="text-base font-medium px-4 py-2 mr-6  text-center flex items-center justify-center tracking-tight rounded-full bg-gradient-to-r from-indigo-500/5 to-blue-500/5 border border-indigo-200 hover:border-indigo-300 transition-all duration-300 hover:scale-105 text-gray-600 shadow-sm hover:shadow-indigo-100">Usage Based Pricing</h2>
      <div className="w-full max-w-7xl p-10 gap-10   flex flex-col items-center justify-center mb-20">

        <section className="flex flex-row items-center  justify-center">
        <h1 className="text-7xl font-bold text-center text-gray-800  tracking-tight">
          Apollo Scraper 🚀
          
        </h1>
        
        {/* <Image
            width={100}
            height={100}
            src="/fire.gif"
            alt="Fire"
            className=" w-20 h-20 "
          /> */}
        </section>
        <RainbowButton onClick={() => 
        {
          const paramsString = searchParams.toString(); // Convert params to string
          router.push(paramsString ? `/apollo?${paramsString}` : "/apollo")
        }
      
      }>Start Scraping</RainbowButton>
      </div>
    </div>
  );
};

export default HomePage;
