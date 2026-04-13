import { ArrowRightIcon } from "lucide-react";

export function NewsletterSection() {
    return (
        <section className="py-16 text-center max-w-7xl mx-auto px-4">
            <div className="flex flex-col gap-2 w-full justify-center items-center">
                <div className="flex flex-col gap-2 max-w-lg">
                    <h2 className="text-4xl font-medium font-melon tracking-wide leading-12">
                        Sign up For <span className="text-primary">Exclusive Deals</span>
                        and Updates
                    </h2>
                    <p className="text-[#646464]">Get 10% off your next order and stay updated with our latest offers.</p>
                </div>
            </div>
            <div className="flex flex-col items-center mt-10">

                {/* Input + Button */}
                <div className="flex md:flex-row flex-col items-center gap-3 w-full max-w-3xl">
                    <input
                        type="email"
                        placeholder="Enter your email address"
                        className="flex-1 px-5 w-full py-4 rounded-xl bg-gray-200 text-black outline-none"
                    />

                    <button className="bg-[#7B3010] font-medium text-sm tracking-wide text-white px-6 py-4 rounded-xl flex items-center font-melon">
                        Subscribe <ArrowRightIcon className="h-4 w-6 ml-2" />
                    </button>
                </div>

                {/* Privacy Checkbox */}
                <div className="flex items-center gap-2 mt-6 text-sm text-gray-600">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#7B3010] cursor-pointer"
                    />

                        <p className="text-[#646464">
                        I agree to the{" "}
                        <span className="text-[#7B3010] underline cursor-pointer">
                            Privacy Policy
                        </span>
                    </p>
                </div>
            </div>
        </section>
    );
}