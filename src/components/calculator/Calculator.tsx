"use client"; 

import React, { useState } from "react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Share2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const Calculator = () => {
  const [shares, setShares] = useState<number>(0);

  // Fixed constants based on the reference image
  const PRICE_PER_SHARE = 50; // Example price per share
  const MONTHLY_ROI = 18.42; // 18.42% monthly
  const YEARLY_ROI = 221.04; // 221.04% yearly

  const totalInvestment = shares * PRICE_PER_SHARE;
  const monthlyEarnings = totalInvestment * (MONTHLY_ROI / 100);
  const yearlyEarnings = totalInvestment * (YEARLY_ROI / 100);

  const handleReset = () => {
    setShares(0);
    toast.success("Calculator reset");
  };

  const handleShare = async () => {
    const text = `Investment Calculator Results:\n
Total Investment: $${totalInvestment.toFixed(2)}
Monthly Earnings: $${monthlyEarnings.toFixed(2)}
Yearly Earnings: $${yearlyEarnings.toFixed(2)}
ROI - Monthly: ${MONTHLY_ROI}% | Yearly: ${YEARLY_ROI}%`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Investment Calculator Results",
          text: text,
        });
        toast.success("Results shared successfully");
      } catch {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Results copied to clipboard");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pt-10 pb-20">
      <div className='absolute overflow-hidden bg-[#22c55e]  blur-[139px]  -right-10 h-[180px] w-[180px]'></div>
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Investment <span className="text-[#22c55e]">Calculator</span>
        </h1>

        <p className="text-muted-foreground text-lg">
          Calculate your potential earnings with our investment platform
        </p>
      </div>

      <Card className="p-8 bg-card/50 backdrop-blur-sm border-border shadow-lg space-y-8">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground text-white">
            Number of Shares
          </label>
          <Input
            type="number"
            value={shares}
          
            onChange={(e) =>
              setShares(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="h-14 text-xl border-primary/30 focus:border-primary bg-input/50 text-center"
            placeholder="0"
            min="0"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 bg-white border-success/20 space-y-2">
            <p className="text-sm text-success-foreground/70 font-medium">
              Total Investment
            </p>
            <p className="text-3xl font-bold text-success-foreground">
              ${totalInvestment.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6 bg-white border-success/20 space-y-2">
            <p className="text-sm text-success-foreground/70 font-medium">
              Monthly Earnings
            </p>
            <p className="text-3xl font-bold text-success-foreground">
              ${monthlyEarnings.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6 bg-white border-success/20 space-y-2">
            <p className="text-sm text-success-foreground/70 font-medium">
              Yearly Earnings
            </p>
            <p className="text-3xl font-bold text-success-foreground">
              ${yearlyEarnings.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6 bg-white border-success/20 space-y-2">
            <p className="text-sm text-success-foreground/70 font-medium">
              ROI Performance
            </p>
            <div className="space-y-1">
              <p className="text-lg font-bold text-success-foreground">
                Monthly: {MONTHLY_ROI}%
              </p>
              <p className="text-lg font-bold text-success-foreground">
                Yearly: {YEARLY_ROI}%
              </p>
            </div>
          </Card>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 h-14 text-base border-border hover:bg-[#22c55e] hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 h-14 text-base bg-[#22c55e] text-white hover:bg-white hover:text-black shadow-glow cursor-pointer"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Results
          </Button>

        </div>
      </Card>
      <div className='absolute overflow-hidden bg-[#22c55e]  blur-[139px]  -left-10 h-[180px] w-[180px]'></div>
    </div>
  );
};

export default Calculator;
