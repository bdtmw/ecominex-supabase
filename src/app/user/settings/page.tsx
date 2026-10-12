"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { useUpdateProfileMutation, useChangePasswordMutation,useToggle2faMutation } from "@/lib/feature/auth/authThunk";
import { toast, ToastContainer } from "react-toastify";
import { setCredentials } from "@/lib/feature/auth/authSlice";
import "react-toastify/dist/ReactToastify.css";
import { userAgent } from "next/server";

export default function Settings() {
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation();
const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated,token} = useSelector((state: RootState) => state.auth);
console.log("user details",user)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    country: "",
  });
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
const [toggle2fa, { isLoading: isToggling2fa }] = useToggle2faMutation();
const is2FAEnabled = !!user?.twoFactorEnabled;
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
        country: user.country || "",
      });
    }
  }, [user]);

const handleTwoFactorToggle = async (checked: boolean) => {
  if (!user) {
    toast.error("You must be logged in to change this setting.");
    return;
  }



  const userId = user._id || user.id; // whichever your backend expects

  try {
    const res = await toggle2fa({
      userId,
      enabled: checked,
    }).unwrap();

    // Locally update Redux auth state: keep same token, patch user
    dispatch(
      setCredentials({
        user: { ...user, twoFactorEnabled: checked },
        token: token as string,
      })
    );

    toast.success(
      res.message ||
        `Two-factor authentication ${checked ? "enabled" : "disabled"}.`
    );
  } catch (err: any) {
    console.error(err);
    toast.error(err?.data?.message || "Failed to update 2FA settings");
  }
};


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await updateProfile(formData).unwrap();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error?.data?.message || "Error updating profile");
    }
  };



  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      await changePassword({
        userId: user?.id!,
        currentPassword,
        newPassword,
      }).unwrap();

      toast.success("Password updated successfully");
      form.reset();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to change password");
    }
  };

  

  return (
    <div className="space-y-6 p-6 min-h-screen"style={{backgroundColor:"#000000"}}>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-slate-400">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="border-slate-700" style={{backgroundColor:"#1b1b1b"}}>
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
          >
            Security
          </TabsTrigger>
          {/* <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
          >
            Notifications
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="border-slate-800" style={{backgroundColor:"#1b1b1b"}}>
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-slate-400">
                Update your personal details
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Avatar */}
              {/* <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-white text-2xl"style={{backgroundColor:"#22c55e"}}>
                    {user?.firstName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <Button variant="outline" className="border-slate-700 text-white"style={{backgroundColor:"#1b1b1b"}}>
                  Change Avatar
                </Button>
              </div> */}

              {/* First + Last Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-slate-300">First Name</Label>
                  <Input
                    id="first-name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    className="border-slate-700 text-white placeholder:text-slate-500"
                    style={{backgroundColor:"#1b1b1b"}}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-slate-300">Last Name</Label>
                  <Input
                    id="last-name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    className="border-slate-700 text-white placeholder:text-slate-500"
                    style={{backgroundColor:"#1b1b1b"}}
                  />
                </div>
              </div>

              {/* Email (read-only or editable based on your logic) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className=" border-slate-700 text-white placeholder:text-slate-500"style={{backgroundColor:"#1b1b1b"}}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                <Input
                  id="phone"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="border-slate-700 text-white placeholder:text-slate-500"style={{backgroundColor:"#1b1b1b"}}
                />
              </div>

              {/* Referral Code (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="referral" className="text-slate-300">Referral Code</Label>
                <Input
                  id="referral"
                  value={user?.referralCode || "N/A"}
                  readOnly
                  className="border-slate-700 text-white cursor-not-allowed"style={{backgroundColor:"#1b1b1b"}}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="hover:bg-emerald-600 text-white"
                style={{backgroundColor:"#22c55e"}}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="security" className="space-y-4">
          <Card className="border-slate-800" style={{backgroundColor:"#1b1b1b"}}>
            <CardHeader>
              <CardTitle className="text-white">Change Password</CardTitle>
              <CardDescription className="text-slate-400">
                Update your account password
              </CardDescription>
            </CardHeader>

            {/* FORM BELOW */}
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-slate-300">
                    Current Password
                  </Label>
                  <Input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    className="border-slate-700 text-white"
                    style={{backgroundColor:"#1b1b1b"}}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-300">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    className=" border-slate-700 text-white"
                    style={{backgroundColor:"#1b1b1b"}}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-300">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    className="border-slate-700 text-white"
                    style={{backgroundColor:"#1b1b1b"}}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isChanging}
                  className="hover:bg-emerald-600 text-white"style={{backgroundColor:"#22c55e"}}
                >
                  {isChanging ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </form>
          </Card>

          <Card className="border-slate-800" style={{ backgroundColor: "#1b1b1b" }}>
  <CardHeader>
    <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
    <CardDescription className="text-slate-400">
      Add an extra layer of security
    </CardDescription>
  </CardHeader>
 <CardContent className="space-y-4">
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <Label className="text-slate-300">Enable 2FA</Label>

        {/* Status pill */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border
            ${
              is2FAEnabled
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/50"
                : "bg-slate-800/80 text-slate-300 border-slate-600"
            }`}
        >
          {is2FAEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <p className="text-sm text-slate-500">
        Secure your account with two-factor authentication
      </p>
    </div>

    <Switch
      checked={is2FAEnabled}
      disabled={isToggling2fa}
      onCheckedChange={handleTwoFactorToggle}
      className="
        data-[state=checked]:bg-emerald-500 
        data-[state=unchecked]:bg-gray-300
        [&>span]:bg-white 
        data-[state=checked]:[&>span]:bg-emerald-100
        transition-colors
      "
    />
  </div>
</CardContent>
</Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-slate-800" style={{backgroundColor:"#1b1b1b"}}>
            <CardHeader>
              <CardTitle className="text-white">Email Notifications</CardTitle>
              <CardDescription className="text-slate-400">Manage your email preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300">Mining Updates</Label>
                  <p className="text-sm text-slate-500">
                    Receive updates about your mining operations
                  </p>
                </div>
                <Switch
                  className="
    data-[state=checked]:bg-emerald-500 
    data-[state=unchecked]:bg-gray-300
    [&>span]:bg-white 
    data-[state=checked]:[&>span]:bg-emerald-100
    transition-colors
  "
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300">Transaction Alerts</Label>
                  <p className="text-sm text-slate-500">
                    Get notified about deposits and withdrawals
                  </p>
                </div>
                <Switch
                  className="
    data-[state=checked]:bg-emerald-500 
    data-[state=unchecked]:bg-gray-300
    [&>span]:bg-white 
    data-[state=checked]:[&>span]:bg-emerald-100
    transition-colors
  "
                />

              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300">Referral Notifications</Label>
                  <p className="text-sm text-slate-500">
                    Updates about your referral earnings
                  </p>
                </div>
                <Switch
                  className="
    data-[state=checked]:bg-emerald-500 
    data-[state=unchecked]:bg-gray-300
    [&>span]:bg-white 
    data-[state=checked]:[&>span]:bg-emerald-100
    transition-colors
  "
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300">Marketing Emails</Label>
                  <p className="text-sm text-slate-500">
                    Receive promotional offers and news
                  </p>
                </div>
                <Switch
                  className="
    data-[state=checked]:bg-emerald-500 
    data-[state=unchecked]:bg-gray-300
    [&>span]:bg-white 
    data-[state=checked]:[&>span]:bg-emerald-100
    transition-colors
  "
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}