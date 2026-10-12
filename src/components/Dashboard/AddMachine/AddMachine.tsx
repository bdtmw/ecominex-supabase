"use client";

import { useCreateMiningMachineMutation } from "@/lib/feature/Machines/miningMachinesApiSlice";
import { Loader2 } from "lucide-react";
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
        <div className="">
            <ToastContainer />
            <div className=" rounded-lg bg-[#1a1a1a] p-8 shadow-xl">
                <h2 className="mb-6 text-3xl font-bold text-white">Add Mining Machine</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">

                        <div className="space-y-2">
                            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                                Mining Machine Name *
                            </label>
                            <input
                                type="text"
                                name="machineName"
                                value={formData.machineName}
                                onChange={handleInputChange}
                                className="border border-zinc-400 px-4 rounded-[5px] text-[15px] h-[50px] bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                                placeholder="Enter your Machine name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                                Hashrate *
                            </label>
                            <input
                                className="border border-zinc-400 px-4 rounded-[5px] text-[15px] h-[50px] bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                                type="text"
                                name="hashrate"
                                value={formData.hashrate}
                                onChange={handleInputChange}
                                placeholder="Ex: TH/s"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                                Power Consumption (W) *
                            </label>
                            <input
                                className="border border-zinc-400 px-4 rounded-[5px] text-[15px] h-[50px] bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                                type="number"
                                name="powerConsumption"
                                value={formData.powerConsumption}
                                onChange={handleInputChange}
                                placeholder="3250"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                                Price Range ($) *
                            </label>
                            <input
                                className="border border-zinc-400 px-4 rounded-[5px] text-[15px] h-[50px] bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                                type="text"
                                name="priceRange"
                                value={formData.priceRange}
                                onChange={handleInputChange}
                                placeholder="Ex: 5000"
                                required
                            />
                        </div>

                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                                Coins Mined
                            </label>
                            <input
                                className="border border-zinc-400 px-4 rounded-[5px] text-[15px] h-[50px] bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                                type="text"
                                name="coinsMined"
                                value={formData.coinsMined}
                                onChange={handleInputChange}
                                placeholder="Ex: BTC, ETH, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                                Estimated Monthly Profit ($)
                            </label>
                            <input
                                className="border border-zinc-400 px-4 rounded-[5px] text-[15px] h-[50px] bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                                type="text"
                                name="monthlyProfit"
                                value={formData.monthlyProfit}
                                onChange={handleInputChange}
                                placeholder="Ex: 500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                            Description
                        </label>
                        <textarea
                            className="border border-zinc-400 px-4 pt-4 rounded-[5px] text-[15px]  bg-transparent placeholder:text-[#dbdbdb] text-[#f9f9f9] w-full font-[500] focus:outline-none focus:border-green-500"
                            rows={5}
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter machine description..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px] block">
                            Machine Images
                        </label>
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-500 bg-[#000] py-16  px-10">
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
                                className="cursor-pointer text-[14px] rounded-md border-green-500 border  px-4 py-2 text-white hover:bg-green-500"
                            >
                                Choose Images
                            </label>
                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="mt-4 h-32 rounded-md w-32 object-cover"
                                />
                            )}
                        </div>


                    </div>

                    <div className="flex justify-end">
                        <button
                            disabled={isLoading}
                            className="border border-green-500 font-[600] text-[13.5px] rounded-full px-8 py-3.5 text-white hover:bg-green-600 hover:scale-105 transition-all"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                "Save Machine"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductUpload;