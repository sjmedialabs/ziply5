export type FoodType = "veg" | "non-veg"
export type MealCategory = "ready-to-eat" | "ready-to-cook"

export type ProductItem = {
  id: number
  name: string
  slug: string
  price: number
  oldPrice: number
  serving: string
  weight: string
  description: string
  type: FoodType
  category: MealCategory
  image: string
  detailImage: string
  bgColor: string
  gallery: string[]
}

export const products: ProductItem[] = [
  {
    id: 1,
    name: "Machboos Prawn Rice",
    slug: "machboos-prawn-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "396 calories serving",
    weight: "75 g",
    description:
      "A rich, aromatic blend of prawns and long-grain rice inspired by classic Gulf flavors, made for quick and satisfying meals.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/Ziply5 - Pouch - Machboos Prawn Rice 2.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#3EA6CF",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 2,
    name: "Chicken Tikka Rice",
    slug: "chicken-tikka-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "463 calories serving",
    weight: "85 g",
    description:
      "Smoky tikka-style chicken paired with fragrant rice for a hearty, home-style bowl ready in minutes.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/Ziply5 - Pouch - Chk Tikka Rice 1.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#7C44A8",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 3,
    name: "Kaju Chicken Curry Rice",
    slug: "kaju-chicken-curry-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "441 calories serving",
    weight: "88 g",
    description:
      "Creamy cashew curry with tender chicken and fluffy rice, crafted for a comforting everyday meal.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/Ziply5 - Pouch - Kaju Chk Curry Rice 1.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#3EA6CF",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 4,
    name: "Palak Chicken Rice",
    slug: "palak-chicken-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "443 calories serving",
    weight: "99 g",
    description:
      "Spinach-forward chicken rice with balanced spices and clean ingredients for a wholesome bowl.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/Ziply5 - Pouch - Palak Chk Rice 3.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#42BF71",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 5,
    name: "Chicken Curry Rice",
    slug: "chicken-curry-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "444 calories serving",
    weight: "89 g",
    description:
      "Classic chicken curry notes with perfectly cooked rice, delivering familiar taste and quick convenience.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/Ziply5 - Pouch - Chk Curry Rice 1.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#2E97A1",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 6,
    name: "Chicken Biryani",
    slug: "chicken-biryani",
    price: 229.25,
    oldPrice: 310.0,
    serving: "429 calories serving",
    weight: "95 g",
    description:
      "Traditional biryani-style seasoning with layered chicken and rice, made for rich flavor in every spoon.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/chickenBiryani.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#BE3D87",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 7,
    name: "Butter Chicken Rice",
    slug: "butter-chicken-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "448 calories serving",
    weight: "95 g",
    description:
      "Creamy butter chicken profile with balanced spices and rice, bringing restaurant-style comfort at home.",
    type: "non-veg",
    category: "ready-to-eat",
    image: "/assets/product listing/Ziply5 - Pouch - Butter Chk Rice 3.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#3EA6CF",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 8,
    name: "Machboos Chicken Rice",
    slug: "machboos-chicken-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "396 calories serving",
    weight: "75 g",
    description:
      "Fragrant machboos masala with juicy chicken and rice, inspired by regional classics and built for speed.",
    type: "non-veg",
    category: "ready-to-cook",
    image: "/assets/product listing/Ziply5 - Pouch - Machboos Chk Rice 1.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#7C44A8",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
  {
    id: 9,
    name: "Kaju Chicken Rice",
    slug: "kaju-chicken-rice",
    price: 229.25,
    oldPrice: 310.0,
    serving: "441 calories serving",
    weight: "88 g",
    description:
      "Cashew-rich chicken and rice combination with a smooth, mildly spiced finish and quick prep format.",
    type: "non-veg",
    category: "ready-to-cook",
    image: "/assets/product listing/Ziply5 - Pouch - Kaju Chk Curry Rice 2.png",
    detailImage: "/assets/Product details/image 69.png",
    bgColor: "#3EA6CF",
    gallery: [
      "/assets/Product details/Rectangle.png",
      "/assets/Product details/Rectangle-1.png",
      "/assets/Product details/Rectangle-2.png",
      "/assets/Product details/Frame 341.png",
    ],
  },
]

export const getProductBySlug = (slug: string) => products.find((item) => item.slug === slug)
