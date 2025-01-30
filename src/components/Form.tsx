"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { ChangeEvent, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Switch } from "@/components/ui/switch";
// import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
// import { useSearchParams } from "next/navigation";
import { RainbowButton } from "./ui/rainbow-button";
import { useSearchParams } from "next/navigation";

export default function BuyApollo() {
  const [, setLoading] = useState<boolean>(false);

  const [personalEmails, setPersonalEmails] = useState<boolean>(false);
  const [workEmails, setWorkEmails] = useState<boolean>(false);
  const [seo, setSeo] = useState<boolean>(false);

  const [apolloURL, setApolloURL] = useState<string>(""); // Controlled input
  const [leadCount, setLeadCount] = useState<number>(0); // Controlled input
  const [listName, setListName] = useState<string>(""); // New state for List Name

  const [isApolloURLInvalid, setIsApolloURLInvalid] = useState(false);
  const [isLeadCountInvalid, setIsLeadCountInvalid] = useState(false);
  const [isListNameInvalid, setIsListNameInvalid] = useState(false); // New validation state

  const [price, setPrice] = useState(0);
  const searchParams = useSearchParams();
  const [referralId, setReferralId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for hydration before extracting params
    setTimeout(() => {
      const ref = searchParams.get("via"); // Get 'via' parameter
      console.log("Extracted via after delay:", ref);
      if (ref) {
        setReferralId(ref);
      }
    }, 500); // 500ms delay ensures hydration
  }, [searchParams]); // Runs whenever searchParams updates
  
  const handleLeadCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setLeadCount(value);

    if (value >= 100 && value <= 1000000) {
      setIsLeadCountInvalid(false); // Valid input
      const newPrice = Math.ceil(value / 200);
      setPrice(newPrice);
    } else {
      setPrice(0);
      setIsLeadCountInvalid(true); // Invalid input, turns red
    }
  };

  // Handle List Name change
  const handleListNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setListName(e.target.value);
    if (e.target.value.trim() === "") {
      setIsListNameInvalid(true);
    } else {
      setIsListNameInvalid(false);
    }
  };

  const handleURLChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApolloURL(value);
  };

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();

    setLoading(true);

    let isValid = true;

    // Validate List Name
    // Validate List Name
    if (!listName.trim()) {
      setIsListNameInvalid(true); // Set invalid state to true for UI feedback
      toast.error("Invalid List Name", {
        description: "List name cannot be empty.", // Show a toast notification
      });
      isValid = false; // Mark form as invalid
    } else {
      setIsListNameInvalid(false); // Reset invalid state if valid
    }

    const apolloURLPattern = /^https:\/\/app\.apollo\.io\/#/;

    if (!apolloURL.trim() || !apolloURLPattern.test(apolloURL)) {
      setIsApolloURLInvalid(true);
      toast.error("Invalid Apollo URL", {
        description: "Apollo URL must start with 'https://app.apollo.io/#'.",
      });
      isValid = false;
    }

    // Validate Lead Count
    if (!leadCount || leadCount < 100 || leadCount > 50000) {
      setIsLeadCountInvalid(true);
      toast.error("Invalid Lead Count", {
        description: "Lead count must be between 100 and 50,000.",
      });
      isValid = false;
    }

    if (!isValid) {
      setLoading(false);
      return; // Stop if validation fails
    }

    const stripe = await loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? ""
    );

    if (!stripe) {
      toast.error("We cannot proceed");
      return;
    }

    const adjustedLeadCount = leadCount < 500 ? 500 : leadCount;

    // Payload for list processing
    const formData = {
      apolloURL,
      leadCount: adjustedLeadCount,
      listName,
      personalEmails,
      workEmails,
      seo,
      referralId, // ✅ Pass referral ID to backend
    };
    console.log("Form Data:", formData);

    const payload = {
      formData,
      returnUrl: process.env.NEXT_PUBLIC_URL 
      // returnUrl :"http://localhost:3000/"
    };

    console.log("return url " + window.location.href);

    // Calling backend API to create a checkout session
    const response = await fetch("/api/stripe/checkout-session/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const { sessionId } = await response.json();
      await stripe.redirectToCheckout({ sessionId });
    } else {
      toast.error("Checkout failed", {
        description: "Failed to create checkout session. Please try again.",
      });
    }

    setLoading(false);
  };



  return (
    <div className="w-full">
      <div className="w-full border-b py-4">
        <div className="mx-auto max-w-sm">
          <h1 className="pointer-events-none mx-auto text-center text-4xl font-bold">
            Apollo Scraper
          </h1>
        </div>
      </div>

        <div className="mx-auto h-[70%] mt-10 flex max-w-sm items-center justify-center ">
          <form className="flex flex-col gap-4" method="POST">
            <section className="flex flex-col gap-2">
              <div>
                <Label>Your Apollo Search URL</Label>
                <Input
                  type="text"
                  value={apolloURL}
                  name="Apollo URL"
                  onChange={handleURLChange}
                  className={cn({ "border-destructive": isApolloURLInvalid })}
                />
              </div>

              <div>
                <Label>Number of Contacts (100 min - 50K max)</Label>
                <Input
                  type="number"
                  name="Lead count"
                  value={leadCount || ""}
                  onChange={handleLeadCountChange}
                  className={cn({ "border-destructive": isLeadCountInvalid })}
                />
              </div>

              <div>
                <Label>Name Your List</Label>
                <Input
                  type="text"
                  value={listName}
                  name="List Name"
                  onChange={handleListNameChange}
                  className={cn({ "border-destructive": isListNameInvalid })}
                />
              </div>
            </section>

            {/* Toggle Buttons */}
            <div className="flex flex-col gap-5 font-semibold">
              <section className="flex flex-col gap-4">
                <div className="mt-2 rounded-md bg-muted p-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Info className="size-4" /> Suggestion
                  </span>
                  <Label className="text-muted-foreground">
                  Set your Apollo &apos;Email Status&apos; filter to only contain &apos;Verified&apos; emails
                  </Label>
                </div>

                <div className="flex flex-row items-center justify-between">
                  <Label>Get Work Emails</Label>
                  <Switch
                    onCheckedChange={() => setWorkEmails((prev) => !prev)}
                  />
                </div>

                <div className="flex flex-row items-center justify-between">
                  <Label>Get Personal Emails</Label>
                  <Switch
                    onCheckedChange={() => setPersonalEmails((prev) => !prev)}
                  />
                </div>

                <div className="flex flex-row items-center justify-between">
                  <Label>Get SEO Description</Label>
                  <Switch
                    onCheckedChange={() =>setSeo((prev) => !prev)}
                  />
                </div>
              </section>
            </div>

            <RainbowButton className="mt-2" onClick={handleSubmit}>
            {leadCount ? `Scrape for $${(leadCount * 0.005).toFixed(2)}` : "Scrape"}
            </RainbowButton>
          </form>
        </div>
   
    </div>
  );
}
