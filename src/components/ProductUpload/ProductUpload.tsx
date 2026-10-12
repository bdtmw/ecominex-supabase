"use client";

import { useCreateMiningMachineMutation } from "@/lib/feature/Machines/miningMachinesApiSlice";
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';


const ProductUpload = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    machineName: "",
    hashrate: "",
    powerConsumption: "",
    priceRange: "",
    coinsMined: "",
    monthlyProfit: "",
    description: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [createMiningMachine, { isLoading }] = useCreateMiningMachineMutation();

  const resetForm = () => {
    setFormData({
      machineName: "",
      hashrate: "",
      powerConsumption: "",
      priceRange: "",
      coinsMined: "",
      monthlyProfit: "",
      description: "",
    });
    setImages([]);
    setImagePreview(null);
  };

  const validateForm = () => {
    const requiredFields = ['machineName', 'hashrate', 'powerConsumption', 'priceRange'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    }

    if (images.length === 0) {
      throw new Error('Please select at least one image');
    }

    // Validate numeric fields
    if (isNaN(Number(formData.powerConsumption)) || Number(formData.powerConsumption) <= 0) {
      throw new Error('Power consumption must be a positive number');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size and type
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setImages(validFiles);

    if (validFiles[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(validFiles[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // Validate form
      validateForm();

      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      images.forEach((image) => payload.append("images", image));

      // Show loading toast
      const loadingToast = toast.loading("Creating mining machine...");

      await createMiningMachine(payload).unwrap();
      
      // Update loading toast to success
      toast.update(loadingToast, {
        render: "Mining machine added successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });

      resetForm();
    } catch (error) {
      let errorMessage = "An error occurred while saving the machine.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'data' in error) {
        // Handle RTK Query error
        errorMessage = (error.data as any)?.message || errorMessage;
      }

      toast.error(errorMessage);
      console.error("Failed to create mining machine:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <ToastContainer />
      <div className="mx-auto max-w-4xl rounded-lg bg-gray-900 p-8 shadow-xl">
        <h2 className="mb-6 text-3xl font-bold text-white">Add Mining Machine</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Mining Machine Name *
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                type="text"
                name="machineName"
                value={formData.machineName}
                onChange={handleInputChange}
                placeholder="Enter machine name"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Hashrate *
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                type="text"
                name="hashrate"
                value={formData.hashrate}
                onChange={handleInputChange}
                placeholder="TH/s"
                required
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Power Consumption (W) *
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                type="number"
                name="powerConsumption"
                value={formData.powerConsumption}
                onChange={handleInputChange}
                placeholder="3250"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Price Range ($) *
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                type="text"
                name="priceRange"
                value={formData.priceRange}
                onChange={handleInputChange}
                placeholder="5000"
                required
              />
            </div>
            
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Coins Mined
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                type="text"
                name="coinsMined"
                value={formData.coinsMined}
                onChange={handleInputChange}
                placeholder="BTC, ETH, etc."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Estimated Monthly Profit ($)
              </label>
              <input
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                type="text"
                name="monthlyProfit"
                value={formData.monthlyProfit}
                onChange={handleInputChange}
                placeholder="500"
              />
            </div>
          </div>
        
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              Description
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter machine description..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              Machine Images
            </label>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 p-6">
              <input
                type="file"
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
                id="image-upload"
                multiple
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
              >
                Choose Images
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-4 h-32 w-32 object-cover"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-[#21eb00] px-6 py-3 font-bold text-black transition-colors hover:bg-[#1cc500] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Save Machine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductUpload;