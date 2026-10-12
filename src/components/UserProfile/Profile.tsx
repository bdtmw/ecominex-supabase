// @ts-nocheck

"use client";
import React, { useState, useEffect } from "react";
import { User, Settings, MapPin, Loader2, TicketPercent } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUpdateProfileMutation } from "@/lib/feature/auth/authThunk";

const ProfilePage = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    country: "",
    phoneNumber: "",
  });

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        country: user.country || "",
        phoneNumber: user.phoneNumber || "",
      });
    } else if (isOpen) {
      // If modal opens but no user data, set defaults to avoid validation errors
      setFormData({
        firstName: "",
        lastName: "",
        country: "", // Could set a default country here if appropriate
        phoneNumber: "",
      });
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if any values have changed
      const hasChanges = Object.entries(formData).some(
        ([key, value]) => value !== user?.[key as keyof typeof user],
      );

      if (!hasChanges) {
        toast.info("No changes to save");
        setIsOpen(false);
        return;
      }

      await updateProfile(formData).unwrap();
      toast.success("Profile updated successfully");
      setIsOpen(false);
    } catch (error) {
      toast.error("Error updating profile. Please try again.");
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-zinc-400 sm:text-base">
          View and update your profile information
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-black p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-zinc-900/50 p-3">
              <User className="h-6 w-6 text-[#21eb00]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Profile Details
              </h2>
              <p className="text-sm text-zinc-400">
                Manage your account information
              </p>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-zinc-900 text-[#21eb00] hover:bg-zinc-800 hover:text-[#21eb00]/90">
                <Settings className="mr-2 h-4 w-4" />
                Update Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="border-zinc-800 bg-black sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-white">
                  Edit Profile
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-zinc-400">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="border-zinc-800 p-2 bg-red text-white"
                    disabled={isLoading}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-zinc-400">
                    Last Name
                  </Label>
                  < Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="border-zinc-800 bg-zinc-900/50 text-white"
                    disabled={isLoading}
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-zinc-400">
                    Country
                  </Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="border-zinc-800 bg-zinc-900/50 text-white"
                    disabled={isLoading}
                    placeholder="Enter your country"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-zinc-400">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="border-zinc-800 bg-zinc-900/50 text-white"
                    disabled={isLoading}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#21eb00] text-black hover:bg-[#21eb00]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 grid gap-6 divide-y divide-zinc-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-400">First Name</label>
              <p className="text-lg font-medium p-4 bg-[#18181b] mt-2 rounded-sm text-white">
                {user?.firstName}
              </p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Last Name</label>
              <p className="text-lg font-medium p-4 bg-[#18181b] mt-2 rounded-sm text-white">
                {user?.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-400">Email</label>
              <p className="text-lg font-medium p-4 bg-[#18181b] mt-2 rounded-sm text-white">
                {user?.email}
              </p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Country</label>
              <div className="flex items-center bg-[#18181b] mt-2 rounded-sm p-4">
                <MapPin className="mr-2 h-4 w-4 text-[#21eb00]" />
                <p className="text-lg font-medium text-white">
                  {user?.country}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-400">Phone Number</label>
              <div className="flex items-center bg-[#18181b] mt-2 rounded-sm p-4">
                <MapPin className="mr-2 h-4 w-4 text-[#21eb00]" />
                <p className="text-lg font-medium text-white">
                  {user?.phoneNumber}
                </p>
              </div>
            </div>
             <div>
              <label className="text-sm text-zinc-400">Referral Code</label>
              <div className="flex items-center bg-[#18181b] mt-2 rounded-sm p-4">
                <TicketPercent className="mr-2 h-4 w-4 text-[#21eb00]" />
                <p className="text-lg font-medium text-white">
                  {user?.referralCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
