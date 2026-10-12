'use client'
import React, { useState } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGetAllMiningMachinesQuery } from "@/lib/feature/Machines/miningMachinesApiSlice";
import { Card, CardContent } from "@/components/ui/card";
import ShareMachines from "./shareMachine";

interface Machine {
  _id: string;
  machineName: string;
  priceRange: {
    min: number;
    max: number;
  };
  monthlyProfit: number;
  images?: string[];
}

interface ShopProps {
  isHomePage?: boolean;
  initialProductCount?: number;
}

const Shop: React.FC<ShopProps> = ({
  isHomePage = false,
  initialProductCount = 6,
}) => {
  
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { data: productsResponse, isLoading, isError } = useGetAllMiningMachinesQuery();
  const products = productsResponse as unknown as { data: Machine[] };

  const ProductCard = ({ product }: { product: Machine }) => {
    return (
      <Card className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-zinc-900 to-black p-1">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative h-full rounded-[22px] bg-zinc-950/50 p-4 backdrop-blur-sm">
          <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl">
            <Image
              src={product.images?.[0] || "/placeholder.jpg"}
              alt={product.machineName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110 bg-white"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="rounded-lg bg-black/50 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                Mining Machine
              </span>
              <span className="flex items-center rounded-lg bg-green-500/90 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                <Sparkles className="mr-1 h-4 w-4" />
                Featured
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-white">
                {product.machineName}
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 backdrop-blur-sm">
                <span className="text-sm text-zinc-400">Investment</span>
                <span className="font-mono text-lg font-bold text-white">
                  ${product.priceRange.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between rounded-xl bg-green-500/10 p-3 backdrop-blur-sm">
                <span className="text-sm text-green-300">Monthly Profit</span>
                <span className="font-mono text-lg font-bold text-green-400">
                  ${product.monthlyProfit.toLocaleString()}
                </span>
              </div>
            </div>

            <button 
              onClick={() => router.push(`/shop/${product.machineName.toLowerCase().replace(/\s+/g, "-")}`)}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-green-500 to-blue-500 p-[1px]"
            >
              <div className="relative flex items-center justify-between rounded-xl bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-all group-hover:bg-opacity-80">
                View Details
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>
        </div>
      </Card>
    );
  };

  const filteredProducts = (products?.data || [])
    .filter((product) => 
      searchTerm
        ? product.machineName.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

  const displayProducts = isHomePage
    ? filteredProducts.slice(0, initialProductCount)
    : filteredProducts;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="relative rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10 blur-xl" />
          <div className="relative">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
            <div className="text-white">Loading mining machines...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="relative rounded-2xl border border-red-500/20 bg-zinc-900/50 p-8 text-center backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 blur-xl" />
          <div className="relative">
            <div className="mb-4 text-4xl">⚠️</div>
            <div className="text-white">
              Unable to load mining machines. Please try again later.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="relative mb-16 text-center">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
          <h1 className="relative inline-block bg-zinc-950 px-8 text-4xl font-bold text-white">
            Mining Machines
          </h1>
        </div>

        <div className="mx-auto mb-12 max-w-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 blur-xl" />
            <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
              <Search className="ml-4 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search mining machines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent px-4 py-4 text-white placeholder-zinc-400 outline-none"
              />
            </div>
          </div>
        </div>
        <ShareMachines/>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayProducts.map((product, index) => (
            <ProductCard key={product._id || index} product={product} />
          ))}
        </div>

      </div>
    </div>
  );
};

export default Shop;