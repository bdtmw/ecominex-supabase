'use client'
import React, { useEffect } from "react";
import { ArrowRight, Sparkles, PieChart } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/lib/store/reduxHooks";
import { getSpecialShareMachine } from "@/lib/feature/shareMachine/shareMachineSlice";


const ShareMachines: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { specialMachine, loading, error } = useAppSelector((state) => state.shareMachine);

  useEffect(() => {
    dispatch(getSpecialShareMachine());
  }, [dispatch]);

  const ShareMachineCard = () => {
    if (!specialMachine) return null;

    return (
      <Card className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-black p-1">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative h-full rounded-[22px] bg-zinc-950/50 p-4 backdrop-blur-sm">
          <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl">
            <Image
              src={specialMachine.images?.[0] || "/placeholder.jpg"}
              alt={specialMachine.machineName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110 bg-white"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="rounded-lg bg-purple-500/90 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                <PieChart className="mr-1 inline-block h-4 w-4" />
                Share Based
              </span>
              <span className="flex items-center rounded-lg bg-blue-500/90 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                <Sparkles className="mr-1 h-4 w-4" />
                Limited Shares
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-white">
                {specialMachine.machineName}
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 backdrop-blur-sm">
                <span className="text-sm text-zinc-400">Share Price</span>
                <span className="font-mono text-lg font-bold text-white">
                  ${specialMachine.sharePrice}
                </span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl bg-purple-500/10 p-3 backdrop-blur-sm">
                <span className="text-sm text-purple-300">Profit Per Share</span>
                <span className="font-mono text-lg font-bold text-purple-400">
                  ${specialMachine.profitPerShare}/month
                </span>
              </div>

              {/* <div className="flex items-center justify-between rounded-xl bg-blue-500/10 p-3 backdrop-blur-sm">
                <span className="text-sm text-blue-300">Available Shares</span>
                <span className="font-mono text-lg font-bold text-blue-400">
                  {specialMachine.availableShares}/{specialMachine.totalShares}
                </span>
              </div> */}
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                style={{ 
                  width: `${(specialMachine.availableShares / specialMachine.totalShares) * 100}%` 
                }}
              />
            </div>

            <button 
            onClick={() => router.push(`/shop/${specialMachine.machineName.toLowerCase().replace(/\s+/g, "-")}`)}

              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 p-[1px]"
            >
              <div className="relative flex items-center justify-between rounded-xl bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-all group-hover:bg-opacity-80">
                Purchase Shares
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-zinc-950">
        <div className="relative rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-xl" />
          <div className="relative">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
            <div className="text-white">Loading share machines...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-zinc-950">
        <div className="relative rounded-2xl border border-red-500/20 bg-zinc-900/50 p-8 text-center backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 blur-xl" />
          <div className="relative">
            <div className="mb-4 text-4xl">⚠️</div>
            <div className="text-white">
              Unable to load share machines. Please try again later.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 py-16">
      <div className="container px-4">
        <div className="relative mb-12 text-center">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          <h2 className="relative inline-block bg-zinc-950 px-8 text-3xl font-bold text-white">
            Share-Based Mining
          </h2>
        </div>
        
        <div className="mb-8 mx-auto max-w-3xl text-center text-zinc-400">
          <p>
            Own a portion of our mining operations without purchasing an entire machine.
            Buy shares and earn proportional mining profits every day.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          {specialMachine ? <ShareMachineCard /> : (
            <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8 text-center backdrop-blur-sm">
              <p className="text-zinc-400">No share machines available right now. Check back soon!</p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
     
        </div>
      </div>
    </div>
  );
};

export default ShareMachines;