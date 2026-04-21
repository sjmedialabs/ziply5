"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { toast } from "@/lib/toast"

type FormData = {
    name: string
    email: string
    phone: string
    message: string
}

export default function ContactUsPage() {
    const [loading, setLoading] = useState(false)
    const [cmsData, setCmsData] = useState<any>(null)
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>()

    useEffect(() => {
        const fetchCmsData = async () => {
            try {
                const res = await fetch("/api/v1/cms/pages?slug=contact")
                const json = await res.json()
                if (json.data) {
                    const contactDetails = json.data.sections?.find((s: any) => s.sectionType === 'contact-details')?.contentJson || {}
                    setCmsData(contactDetails)
                }
            } catch (err) {
                console.error("Failed to load CMS data", err)
            }
        }
        fetchCmsData()
    }, [])

    const onSubmit = async (data: FormData) => {
        setLoading(true)
        try {
            const res = await fetch("/api/v1/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            const payload = await res.json()
            
            if (payload.success) {
                toast.success("Your message has been sent successfully!")
                reset()
            } else {
                toast.error(payload.message || "Failed to send message.")
            }
        } catch (error) {
            toast.error("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full">

            {/* ================= HERO SECTION ================= */}

            <section
                className="w-full h-[280px] md:h-[320px] flex flex-col items-center justify-center text-center bg-cover bg-center"
                style={{
                    backgroundImage: "url('/contactUsBg.png')",
                }}
            >
                <h1 className="font-melon text-primary text-3xl md:text-4xl font--medium">
                    Contact us
                </h1>

                <p className="text-sm text-gray-600 mt-2">
                    Some of the queries you want to know about us.
                </p>

                <div className="mt-4 px-4 py-2 bg-white rounded-full text-sm shadow">
                    <span className="text-primary">Home</span>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-600">Contact us</span>
                </div>
            </section>

            {/* ================= GET IN TOUCH ================= */}

            <section className="max-w-6xl mx-auto px-4 py-12">

                <h2 className="font-melon text-primary text-2xl md:text-3xl text-center font-medium">
                    Get In Touch
                </h2>

                <p className="text-center text-gray-500 mt-2 max-w-xl mx-auto text-sm">
                    {cmsData?.mainDescription || "Lorem ipsum dolor sit amet consectetur adipisicing elit. Expedita quaerat unde quam dolor quia veritatis inventore, aut commodi cum veniam vel."}
                </p>

                {/* CONTACT CARDS */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

                    {/* LOCATION */}

                    <div className="bg-gray-50 rounded-xl p-6 text-center shadow-sm">
                        <Image
                            src="/assets/contact us/location.png"
                            alt="location"
                            width={40}
                            height={40}
                            className="mx-auto"
                        />

                        <h3 className="mt-4 font-semibold text-gray-800 text-sm">
                            {cmsData?.address || "102 Street 2714 Donavan"}
                        </h3>

                        <p className="text-gray-500 text-xs mt-1">
                            {cmsData?.addressDescription || "Lorem ipsum dolor sit amet dicont"}
                        </p>
                    </div>

                    {/* PHONE */}

                    <div className="bg-gray-50 rounded-xl p-6 text-center shadow-sm">
                        <Image
                            src="/assets/contact us/phone.png"
                            alt="phone"
                            width={40}
                            height={40}
                            className="mx-auto"
                        />

                        <h3 className="mt-4 font-semibold text-gray-800 text-sm">
                            {cmsData?.phone || "+02 1234 567 88"}
                        </h3>

                        <p className="text-gray-500 text-xs mt-1">
                            {cmsData?.phoneDescription || "Lorem ipsum dolor sit amet dicont"}
                        </p>
                    </div>

                    {/* EMAIL */}

                    <div className="bg-gray-50 rounded-xl p-6 text-center shadow-sm">
                        <Image
                            src="/assets/contact us/message.png"
                            alt="email"
                            width={40}
                            height={40}
                            className="mx-auto"
                        />

                        <h3 className="mt-4 font-semibold text-gray-800 text-sm">
                            {cmsData?.email || "info@example.com"}
                        </h3>

                        <p className="text-gray-500 text-xs mt-1">
                            {cmsData?.emailDescription || "Lorem ipsum dolor sit amet dicont"}
                        </p>
                    </div>

                </div>

            </section>

            {/* ================= CONTACT FORM ================= */}

            <section className="max-w-4xl mx-auto px-4 pb-16">

                <div className="bg-white shadow-md rounded-2xl p-6 md:p-10">

                    <h2 className="font-melon text-primary text-xl md:text-2xl text-center">
                        Send Us
                    </h2>

                    <p className="text-center text-gray-500 text-sm mt-2">
                        Contact us for all your questions and opinions, or you can
                        solve your problems in a shorter time with our contact
                        offices.
                    </p>

                    <div className="border-t mt-6 mb-8"></div>

                    {/* FORM */}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                    >

                        {/* NAME + EMAIL */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <div>
                                <input
                                    type="text"
                                    placeholder="Name"
                                    {...register("name", {
                                        required: "Name is required",
                                    })}
                                    className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none"
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <input
                                    type="email"
                                    placeholder="Email *"
                                    {...register("email", {
                                        required: "Email is required",
                                    })}
                                    className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none"
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                        </div>

                        {/* PHONE */}

                        <div>
                            <input
                                type="tel"
                                placeholder="Phone number"
                                {...register("phone")}
                                className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none"
                            />
                        </div>

                        {/* MESSAGE */}

                        <div>
                            <textarea
                                rows={5}
                                placeholder="Your message"
                                {...register("message", {
                                    required: "Message is required",
                                })}
                                className="w-full bg-gray-100 rounded-md px-4 py-3 text-sm outline-none resize-none"
                            />

                            {errors.message && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.message.message}
                                </p>
                            )}
                        </div>

                        {/* BUTTON */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-white px-6 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send Message"}
                        </button>

                    </form>

                </div>

            </section>

        </div>
    )
}