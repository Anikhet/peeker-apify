
// import { useRouter, useSearchParams } from "next/navigation";
// import { RainbowButton } from "@/components/ui/rainbow-button";
import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
// import {  useEffect } from "react";
import { Hero } from "./ui/animated-hero";
// import Image from "next/image";

// import { Button } from "@/components/ui/button";

const HomePage = () => {
  // const router = useRouter();
  // const searchParams = useSearchParams()

  // useEffect(() => {
  //   console.log(searchParams)
  // }, [searchParams])
  
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
 <Hero/>
    </div>
  );
};

export default HomePage;
