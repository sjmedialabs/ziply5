import { ArrowRightIcon } from "lucide-react";

export function NewsletterSection({ data }: { data?: any }) {
    const titleString = data?.title || "Sign up For Exclusive Deals and Updates";
    const titleWords = titleString.split(" ");
    
    // Extract the parts of the title based on word index
    const beforeHighlight = titleWords.slice(0, 3).join(" ");
    const highlight = titleWords.slice(3, 5).join(" ");
    const afterHighlight = titleWords.slice(5).join(" ");

    const description = data?.description || "Get 10% off your next order and stay updated with our latest offers.";

    return (
        <section className="py-16 text-center max-w-7xl mx-auto px-4">
            <div className="flex flex-col gap-2 w-full justify-center items-center">
                <div className="flex flex-col gap-2 max-w-lg">
                    <h2 className="text-4xl font-medium font-melon tracking-wide leading-12">
                        {beforeHighlight} {highlight && <span className="text-primary">{highlight}</span>} {afterHighlight}
                    </h2>
                    <p className="text-[#646464]">{description}</p>
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

                    <p className="text-[#646464]">
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