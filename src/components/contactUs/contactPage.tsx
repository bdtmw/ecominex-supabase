"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";

// Define the interface for location props
interface Location {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Define the interface for map component props
interface MapComponentProps {
  location: Location;
  isExpanded: boolean;
}

// Dynamic import of map components with no SSR
const MapComponent = dynamic<MapComponentProps>(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-800">
      <div className="text-blue-400">Loading map...</div>
    </div>
  ),
});

const ContactPage = () => {
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const location: Location = {
    address: {
      street: "123 Business Street",
      city: "New York",
      state: "NY",
      zip: "10001",
    },
    coordinates: {
      lat: 40.7128,
      lng: -74.006,
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-gray-100">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Contact Us</h1>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Information Card */}
          <Card className="border-gray-700 bg-gray-800">
            <CardContent className="p-6">
              <h2 className="mb-6 text-2xl font-semibold">Get in Touch</h2>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPin className="mt-1 h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="mb-1 font-medium">Address</h3>
                    <p className="text-gray-400">{location.address.street}</p>
                    <p className="text-gray-400">
                      {`${location.address.city}, ${location.address.state} ${location.address.zip}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Phone className="mt-1 h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="mb-1 font-medium">Phone</h3>
                    <p className="text-gray-400">+1 (555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Mail className="mt-1 h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="mb-1 font-medium">Email</h3>
                    <p className="text-gray-400">info@ecominex.com/</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map Card */}
          <Card
            className={`cursor-pointer border-gray-700 bg-gray-800 transition-all duration-300 ${
              isMapExpanded ? "fixed inset-4 z-50" : ""
            }`}
            onClick={() => setIsMapExpanded(!isMapExpanded)}
          >
            <CardContent className="relative p-0">
              <div className="absolute right-4 top-4 z-10 rounded-full bg-gray-800 p-2">
                <ExternalLink className="h-6 w-6 text-blue-400" />
              </div>
              <div
                className={`w-full overflow-hidden rounded-lg ${isMapExpanded ? "h-full" : "h-64 md:h-full"}`}
              >
                <MapComponent location={location} isExpanded={isMapExpanded} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
