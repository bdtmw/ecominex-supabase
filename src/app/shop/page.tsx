import LandingLayout from "@/components/Layouts/LandingLayout";
import Shop from "@/components/shop/Product";
import ShopHero from "@/components/shop/ShopHero";
import React from "react";

function page() {
  return (
    <LandingLayout>
      <div className="bg-primary">
        {" "}
        <Shop />
        <ShopHero />

      </div>
    </LandingLayout>
  );
}

export default page;
