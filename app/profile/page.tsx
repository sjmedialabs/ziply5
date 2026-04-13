"use client"

import { useState } from "react"
import { Facebook, Twitter, Linkedin } from "lucide-react"
import { User, Star, Package } from "lucide-react"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("about")

  const socialLinks = [
    { icon: Facebook, link: "https://facebook.com" },
    { icon: Twitter, link: "https://twitter.com" },
    { icon: Linkedin, link: "https://linkedin.com" },
    { icon: "G", link: "https://google.com" },
  ]

  return (
    <div className="min-h-screen bg-[#f6f0dc] py-10 md:py-16 px-4">
      <div className="max-w-5xl mx-auto md:flex gap-30">

        {/* LEFT SIDEBAR */}
        <div
          className="
            w-full md:w-[260px]
            bg-white font-melon overflow-hidden border
            flex md:block
          "
        >

          {/* TAB ITEM */}
          <div
            onClick={() => setActiveTab("about")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer border-b md:border-b ${
              activeTab === "about"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
            }`}
          >
            <User size={18} />
            <span className="font-medium">About Me</span>
          </div>

          <div
            onClick={() => setActiveTab("favorite")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer border-b md:border-b ${
              activeTab === "favorite"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
            }`}
          >
            <Star size={18} />
            <span className="font-medium">Favorite</span>
          </div>

          <div
            onClick={() => setActiveTab("orders")}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-5 py-4 cursor-pointer ${
              activeTab === "orders"
                ? "bg-white text-orange-500 md:border-r-4 shadow-[inset_-4px_0_6px_rgba(0,0,0,0.1)] border-orange-500"
                : "text-gray-400"
            }`}
          >
            <Package size={18} />
            <span className="font-medium">Order history</span>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 mt-6 md:mt-0">

          {activeTab === "about" && (
            <div className="space-y-6 text-sm gap-2">

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Bio</p>
                <p className="text-gray-600 max-w-md">
                  When I first got into the advertising, I was looking for the magical combination that would put website into the top search engine rankings
                </p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Email</p>
                <p className="text-gray-600">keshav krishan@gmail.com</p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">contact</p>
                <p className="text-gray-600">621-770-7689</p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Address</p>
                <p className="text-gray-600">
                  27 street jonway, NY America USA
                </p>
              </div>

              <div className="flex">
                <p className="w-24 font-bold text-gray-700">Phone</p>
                <p className="text-gray-600">439-582-1578</p>
              </div>

              {/* SOCIAL */}
              <div className="flex items-center">
                <p className="w-24 font-bold text-gray-700">Social</p>

                <div className="flex gap-3">
                  {socialLinks.map((item, i) => {
                    const Icon = item.icon
                    return (
                      <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center 
                        border border-gray-400 text-orange-500 
                        rounded-md cursor-pointer 
                        hover:bg-orange-500 hover:text-white transition"
                      >
                        {typeof Icon === "string" ? (
                          <span className="font-semibold">{Icon}</span>
                        ) : (
                          <Icon size={14} />
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === "favorite" && (
            <p className="text-gray-500">No favorites yet.</p>
          )}

          {activeTab === "orders" && (
            <p className="text-gray-500">No orders yet.</p>
          )}
        </div>

      </div>
    </div>
  )
}