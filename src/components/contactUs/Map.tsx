import React from "react";
import { MapPin, Clock, Mail, Phone } from "lucide-react";

const LocationSection = () => {
  return (
    <section className="bg-[#121212] py-16 text-white lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center lg:max-w-4xl">
          <h2 className="mb-4 text-4xl font-extrabold text-white">
            Visit Our Location
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-400">
            Discover our convenient location in the heart of the city, designed
            to serve you better.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:mt-20">
          {/* Map Section */}
          <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-gray-800 shadow-2xl md:h-full">
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2894.978326679957!2d-79.6769905!3d43.4924515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b433f1a9737eb%3A0xeceb46bd5f11fee0!2s1660%20North%20Service%20Rd%20E%2C%20Oakville%2C%20ON%20L6H%207G3%2C%20Canada!5e0!3m2!1sen!2sus!4v1619524992238!5m2!1sen!2sus"
              loading="lazy"
              title="Our Location"
              allowFullScreen
            ></iframe>
          </div>

          {/* Location Details */}
          <div className="flex h-full flex-col divide-y divide-gray-800 overflow-hidden rounded-2xl border border-gray-800 bg-[#1E1E1E] shadow-2xl">
            {/* Address Section */}
            <div className="flex items-start space-x-4 px-6 py-6">
              <MapPin className="h-10 w-10 flex-shrink-0 text-[#20e202]" />
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Our Address
                </h3>
                <p className="mt-1 text-gray-400">
                  1660 North Service Rd E, Oakville, ON L6H 7G3, Canada
                </p>
              </div>
            </div>

            {/* Hours Section */}
            <div className="flex items-start space-x-4 px-6 py-6">
              <Clock className="h-10 w-10 flex-shrink-0 text-[#20e202]" />
              <div>
                <h3 className="text-xl font-semibold text-white">Hours</h3>
                <div className="mt-1 text-gray-400">
                  <p>Monday - Friday: 9am - 5pm</p>
                  <p>Saturday: 10am - 4pm</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="flex flex-grow items-start space-x-4 px-6 py-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-start space-x-4">
                  <Mail className="h-10 w-10 flex-shrink-0 text-[#20e202]" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Email</h3>
                    <p className="text-gray-400">info@ecominex.com/</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Phone className="h-10 w-10 flex-shrink-0 text-[#20e202]" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Phone</h3>
                    <p className="text-gray-400">+971563605068</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
