"use client"
import { MapPin, Clock, Mail, Phone } from "lucide-react";
import 'react-toastify/dist/ReactToastify.css';
import { useDispatch } from "react-redux";
import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { Loader2 } from "lucide-react";
import { createContact } from "@/lib/feature/contact/contactsSlice";
import { AppDispatch } from "@/lib/store/store";


const ContactForm = () => {


    const dispatch = useDispatch<AppDispatch>();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        country: "",
        description: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setFormData({
            fullName: "",
            email: "",
            phone: "",
            country: "",
            description: "",
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.fullName || !formData.email || !formData.phone) {
            return toast.error("Full Name, Email and Phone are required!");
        }

        try {
            setIsSubmitting(true);

            await dispatch(createContact({
                name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                country: formData.country,
                comment: formData.description,
            })).unwrap();

            toast.success("Send Message successfully!");
            resetForm();
        } catch (err: any) {
            toast.error(err?.message || "Failed to create contact");
        } finally {
            setIsSubmitting(false);
        }
    };


   return (
  <section className="pt-10 pb-16 sm:py-20 text-white relative">
    {/* Top green blur */}
    <div className="absolute overflow-hidden bg-[#22c55e] blur-[139px] -right-10 h-[160px] w-[160px]" />

    <div className="px-4 sm:px-6 lg:px-20">
      {/* Heading */}
      <div className="text-center flex flex-col justify-center items-center">
        <h1 className="font-[600] text-[34px] leading-[43px] sm:text-[44px] sm:leading-[53px]">
          <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
            Visit{" "}
          </span>
          Our Location
        </h1>

        <p className="mt-3 text-[13px] sm:text-[14px] w-full sm:w-[60%] lg:w-[35%] text-gray-300">
          Discover our convenient location in the heart of the city, designed to
          serve you better.
        </p>
      </div>

      {/* Main Grid */}
      <div className="mt-8 lg:mt-12 grid grid-cols-1 gap-10 md:gap-8 md:grid-cols-2">
        {/* RIGHT on desktop, FIRST on mobile — Form */}
        <div className="order-1 md:order-2 relative h-full w-full overflow-hidden shadow-2xl bg-[#1b1b1b] rounded-[10px]">
          <ToastContainer />
          <div className="rounded-lg bg-[#1a1a1a] px-5 sm:px-7 lg:px-9 py-8 sm:py-10 lg:py-12 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-gray-100 font-[500] text-[15px] block">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full h-[50px] px-4 text-white bg-transparent border border-zinc-400 rounded focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-100 font-[500] text-[15px] block">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full h-[50px] px-4 text-white bg-transparent border border-zinc-400 rounded focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-gray-100 font-[500] text-[15px] block">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    className="w-full h-[50px] px-4 text-white bg-transparent border border-zinc-400 rounded focus:outline-none focus:border-green-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-100 font-[500] text-[15px] block">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter your country"
                    className="w-full h-[50px] px-4 text-white bg-transparent border border-zinc-400 rounded focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-100 font-[500] text-[15px] block">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter your message"
                  rows={5}
                  className="w-full px-4 pt-4 text-white bg-transparent border border-zinc-400 rounded focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-8 py-3 text-white text-[13.5px] font-[600] border border-green-500 rounded-full hover:bg-green-600 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* LEFT on desktop, SECOND on mobile — Info + Map */}
        <div className="order-2 md:order-1 flex h-full flex-col items-center sm:items-start overflow-hidden mt-4 md:mt-7">
          {/* Address */}
          <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-4 pb-6 gap-3 sm:gap-0">
            <MapPin className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 text-white bg-[#1c8337] px-2 py-2 rounded-full" />
            <div className="text-center sm:text-start mt-1">
              <h3 className="text-[20px] sm:text-[22px] font-semibold text-white">
                Our Address
              </h3>
              <p className="text-gray-400 text-[13px] sm:text-[14px] sm:w-[70%]">
                1660 North Service Rd E, Oakville, ON L6H 7G3, Canada
              </p>
            </div>
          </div>

          {/* Hours */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-x-0 sm:space-x-4 pb-6 gap-3 sm:gap-0">
            <Clock className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 mt-0 sm:mt-2.5 text-white bg-[#1c8337] px-2 py-2.5 rounded-full" />
            <div className="text-center sm:text-start mt-1">
              <h3 className="text-[20px] sm:text-[22px] font-semibold text-white">
                Hours
              </h3>
              <div className="text-gray-400 text-[13px] sm:text-[14px]">
                <p className="leading-[17px]">Monday - Friday: 9am - 5pm</p>
                <p className="leading-[17px]">Saturday: 10am - 4pm</p>
                <p className="leading-[17px]">Sunday: Closed</p>
              </div>
            </div>
          </div>

          {/* Email + Phone */}
          <div className="flex items-center sm:items-start">
            <div className="flex flex-col justify-center items-center sm:items-start space-y-6">
              {/* Email */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-x-0 sm:space-x-4 gap-3 sm:gap-0">
                <Mail className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 mt-0 sm:mt-2.5 text-white bg-[#1c8337] px-2 py-2.5 rounded-full" />
                <div className="text-center sm:text-start mt-1">
                  <h3 className="text-[20px] font-semibold text-white">
                    Email
                  </h3>
                  <p className="text-gray-400 text-[13px] sm:text-[15px]">
                    info@ecominex.net
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-x-0 sm:space-x-4 gap-3 sm:gap-0">
                <Phone className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 mt-0 sm:mt-2.5 text-white bg-[#1c8337] px-2 py-[11px] rounded-full" />
                <div className="text-center sm:text-start mt-1">
                  <h3 className="text-[20px] font-semibold text-white">
                    Phone
                  </h3>
                  <p className="text-gray-400 text-[13px] sm:text-[15px]">
                    +971563605068
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="relative w-full h-[45vh] sm:h-[40vh] mt-6">
            <iframe
              className="absolute left-0 top-0 rounded-md h-full w-full"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2894.978326679957!2d-79.6769905!3d43.4924515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b433f1a9737eb%3A0xeceb46bd5f11fee0!2s1660%20North%20Service%20Rd%20E%2C%20Oakville%2C%20ON%20L6H%207G3%2C%20Canada!5e0!3m2!1sen!2sus!4v1619524992238!5m2!1sen!2sus"
              loading="lazy"
              title="Our Location"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </section>
);
};

export default ContactForm;
