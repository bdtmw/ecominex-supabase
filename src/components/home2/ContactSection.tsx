import React from "react";
import { MapPin, Clock, Mail, Phone } from "lucide-react";

const HomeContactSection = () => {
    return (
        <section className=" pt-10 pb-20 sm:py-20 text-white">
            <div className="">
          <div className='absolute overflow-x-hidden bg-[#22c55e]  blur-[139px]  -right-10 h-[160px] w-[160px]'></div>


                <div className="text-center flex flex-col justify-center items-center">
                            <div className=' text-white'>
                                <h1 className='font-[700] text-[34px] leading-[43px] sm:text-[44px] sm:leading-[53px]'><span className='bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent'>Visit </span>Our Location</h1>
                            </div>

                            <p className="mt-3 text-[13px] sm:text-[14px] sm:w-[35%] text-gray-300">
                                Discover our convenient location in the heart of the city, designed
                                to serve you better.
                            </p>
                        </div>
                <div className="mt- grid grid-cols-1 gap-8 md:grid-cols-2 lg:mt-12 ">
                    {/* Map Section */}


                    {/* Location Details */}
                    <div className="flex h-full flex-col items-center sm:items-start  overflow-hidden mt-1 ">
                        {/* Address Section */}

                        
                        <div className="flex flex-col sm:flex-row items-center space-x-4 pb-6">
                            <MapPin className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 text-white bg-[#1c8337] px-2 py-2 rounded-full" />
                            <div className="text-center sm:text-start mt-2">
                                <h3 className="text-[20px] sm:text-[22px] font-semibold text-white">
                                    Our Address
                                </h3>
                                <p className=" text-gray-400 text-[13px] sm:text-[14px] sm:w-[70%]">
                                    1660 North Service Rd E, Oakville, ON L6H 7G3, Canada
                                </p>
                            </div>
                        </div>

                        {/* Hours Section */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start space-x-4 pb-6">
                            <Clock className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 text-white bg-[#1c8337] px-2 py-2.5 rounded-full"  />
                            <div className="text-center sm:text-start mt-2">
                                <h3 className="text-[22px] font-semibold text-white">Hours</h3>
                                <div className=" text-gray-400 text-[15px]">
                                    <p className="text-[14px] leading-[17px]">Monday - Friday: 9am - 5pm</p>
                                    <p className="text-[14px] leading-[17px]">Saturday: 10am - 4pm</p>
                                    <p className="text-[14px] leading-[17px]">Sunday: Closed</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Section */}
                        <div className="flex  flex-grow items-center sm:items-start space-x-2">
                            <div className="flex  flex-col justify-center items-center sm:items-start space-y-6">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start space-x-4">
                                    <Mail className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 text-white bg-[#1c8337] px-2 py-2.5 rounded-full"  />
                                    <div className="text-center sm:text-start mt-2">
                                        <h3 className="text-[20px] font-semibold text-white">Email</h3>
                                        <p className="text-gray-400 text-[15px]">info@ecominex.net</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center sm:items-start space-x-4">
                                    <Phone className="w-10 h-10 sm:h-12 sm:w-12 flex-shrink-0 text-white bg-[#1c8337] px-2 py-[11px] rounded-full"  />
                                    <div className="text-center sm:text-start mt-2">
                                        <h3 className="text-[20px] font-semibold text-white">Phone</h3>
                                        <p className="text-gray-400 text-[15px]">+971563605068</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="relative h-[300px] w-full overflow-hidden border border-gray-800 shadow-2xl md:h-[400px] rounded-[10px]">
                        <iframe
                            className="absolute left-0 top-0 h-full w-full"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2894.978326679957!2d-79.6769905!3d43.4924515!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b433f1a9737eb%3A0xeceb46bd5f11fee0!2s1660%20North%20Service%20Rd%20E%2C%20Oakville%2C%20ON%20L6H%207G3%2C%20Canada!5e0!3m2!1sen!2sus!4v1619524992238!5m2!1sen!2sus"
                            loading="lazy"
                            title="Our Location"
                            allowFullScreen
                        ></iframe>
                    </div>


                </div>
            </div>
        </section>
    );
};

export default HomeContactSection;
