"use client";

import { useState } from "react";
import { ArrowRightIcon, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { validateEmail } from "@/hooks/validations";

export function NewsletterSection({ data }: { data?: any }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const titleString = data?.title || "Sign up For Exclusive Deals and Updates";
    const titleWords = titleString.split(" ");

    // Extract the parts of the title based on word index
    const beforeHighlight = titleWords.slice(0, 3).join(" ");
    const highlight = titleWords.slice(3, 5).join(" ");
    const afterHighlight = titleWords.slice(5).join(" ");

    const description = data?.description || "Get 10% off your next order and stay updated with our latest offers.";

    const handleSubscribe = async () => {
        if (!email) {
            toast.error("Please enter an email");
            return;
        }
        if (!validateEmail(email)) {
            toast.error("Please enter a valid email");
            return;
        }
        if (!agreed) {
            toast.error("Please agree to the Privacy Policy");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/v1/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Subscribed!", "You have successfully subscribed to our newsletter.");
                setEmail("");
            } else {
                toast.error("Subscription failed", json.message || "Please try again later.");
            }
        } catch (err) {
            toast.error("Network Error", "Could not connect to the server.");
        } finally {
            setLoading(false);
        }
    };

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
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }}
                    className="flex md:flex-row flex-col items-center gap-3 w-full max-w-3xl"
                >
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="flex-1 px-5 w-full py-4 rounded-xl bg-gray-200 text-black outline-none"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#7B3010] font-medium cursor-pointer text-sm tracking-wide text-white px-6 py-4 rounded-xl flex items-center font-melon disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {loading ? "Subscribing..." : "Subscribe"}
                        {!loading && <ArrowRightIcon className="h-4 w-6 ml-2" />}
                    </button>
                </form>

                {/* Privacy Checkbox */}
                <div className="flex items-center gap-2 mt-6 text-sm text-gray-600">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
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
