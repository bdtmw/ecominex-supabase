"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from '@/lib/store/store';
import { getReferralById, Referral as ReferralType } from '@/lib/feature/userMachine/profitSlice';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Users, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Referrals() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  // GET API DATA FROM REDUX
  // GET API DATA FROM REDUX
  const { referralData, loading, error } = useSelector(
    (state: RootState) => state.profit.referrals
  );

  console.log(referralData)

  // Replace this with logged-in user's ID  
  // Get logged-in user ID from localStorage safely (client-side)
  useEffect(() => {
    if (user?.id) {
      dispatch(getReferralById(user.id as string));
    }
  }, [user?.id, dispatch]);

  const referralCode = user?.referralCode;
  const referralLink = `https://cryptomine.app/ref/${referralCode}`;

  const copyToClipboard = (text?: string) => {
    if (!text) {
      toast.error("No referral code available");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };


  return (
    <div className="space-y-6 p-6 min-h-screen" style={{backgroundColor:"#000000"}}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Referral Program</h2>
        <p className="text-slate-400">Earn rewards by inviting friends</p>
      </div>

      {/* LOADING & ERROR STATE */}
      {loading && <p className="text-slate-400">Loading referrals...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800" style={{backgroundColor:"#1b1b1b"}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Referrals
            </CardTitle>

            <div className="p-2 rounded-lg"style={{backgroundColor:"#22c55e"}}>
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-white">
              {referralData?.length ?? 0}
            </div>
          </CardContent>
        </Card>


        <Card className="border-slate-800"style={{backgroundColor:"#1b1b1b"}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-slate-400">Active Referrals</CardTitle>
            <div className="p-2 rounded-lg" style={{backgroundColor:"#22c55e"}}>
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-white">
              {referralData.filter((ref) => ref.referralStatus === "active").length}
            </div>
          </CardContent>
        </Card>


        <Card className="border-slate-800"style={{backgroundColor:"#1b1b1b"}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-slate-400">Total Earned</CardTitle>
            <div className="p-2 rounded-lg"style={{backgroundColor:"#22c55e"}}>
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${referralData.reduce((sum, r) => sum + Number(r.discount || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* REFERRAL LINKS */}
      <Card className="border-slate-800"style={{backgroundColor:"#1b1b1b"}}>
        <CardHeader>
          <CardTitle className="text-white">Your Referral Code</CardTitle>
          <CardDescription className="text-slate-400">
            First-time deposit: 10% bonus • Further deposits: 2% bonus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm border-slate-700 text-white"
              style={{backgroundColor:"#1b1b1b"}}
            />
            <Button
              onClick={() => copyToClipboard(referralLink)}
              className="hover:bg-emerald-600 text-white shrink-0"
              style={{backgroundColor:"#22c55e"}}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div> */}

          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-sm border-slate-700 text-white"
              style={{backgroundColor:"#1b1b1b"}}
            />
            <Button
              onClick={() => copyToClipboard(referralCode)}
              variant="outline"
              className="shrink-0 border-slate-700 text-white bg-slate-800"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          </div>
        </CardContent>
      </Card>


      <Card className=" border-slate-800" style={{backgroundColor:"#1b1b1b"}}>
        <CardHeader>
          <CardTitle className="text-white">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{backgroundColor:"#22c55e"}}>
                1
              </div>
              <h3 className="font-semibold text-white">Share Your Link</h3>
              <p className="text-sm text-slate-400">
                Send your unique referral link to friends and family
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{backgroundColor:"#22c55e"}}>
                2
              </div>
              <h3 className="font-semibold text-white">They Sign Up</h3>
              <p className="text-sm text-slate-400">
                Your referrals create an account and start mining
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{backgroundColor:"#22c55e"}}>
                3
              </div>
              <h3 className="font-semibold text-white">Earn Bonuses</h3>
              <p className="text-sm text-slate-400">
                10% bonus on first deposit, 2% on further deposits
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* REFERRAL LIST */}
      <Card className="border-slate-800" style={{backgroundColor:"#1b1b1b"}}>
        <CardHeader>
          <CardTitle className="text-white">Your Referrals</CardTitle>
          <CardDescription className="text-slate-400">
            Track your referral performance
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {referralData.map((referral, i) => {
              
              const earned = Number(referral.discount) || 0;

              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg  border border-slate-700/50"
                  style={{backgroundColor:"#1b1b1b"}}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#22c55e" }}
                    >
                      <Users className="h-5 w-5 text-slate-300" />
                    </div>

                    <div>
                      <p className="font-medium text-white">
                        {referral.firstName} {referral.lastName}
                      </p>
                      <p className="text-sm text-slate-400">
                        Joined: {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-bold ${referral.referralStatus === "Active" ? "text-emerald-400" : "text-slate-400"
                        }`}
                    >
                      ${earned.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">{referral.referralStatus}</p>
                  </div>
                </div>
              );
            })}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
