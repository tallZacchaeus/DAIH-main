import { ResourceCategory } from "@prisma/client";
import { prisma } from "../db/client.js";

interface SeedPricing {
  planName: string;
  price: number;
  currency: string;
  durationDays?: number;
  durationMonths?: number;
  durationHours?: number;
  isPopular?: boolean;
  isActive?: boolean;
}

interface SeedResource {
  name: string;
  slug: string;
  category: ResourceCategory;
  description: string;
  capacity: number;
  location: string;
  amenities: string[];
  imageUrl: string;
  sortOrder: number;
  isPopular: boolean;
  isActive: boolean;
  pricing: SeedPricing[];
}

export const SEED_CATALOGUE_DATA: SeedResource[] = [
  {
    name: "Flex Desk",
    slug: "flex-desk",
    category: ResourceCategory.FLEX_DESK,
    description:
      "Flexible workstation in our dynamic open coworking lounge with 24/7 power, high-speed WiFi, and water.",
    capacity: 50,
    location: "Ground Floor, Innovation Lounge",
    amenities: [
      "Dedicated Workstation Access",
      "High-Speed Internet/Wi-Fi",
      "Comfortable Ergonomic Seating",
      "Power & Charging Facilities",
      "24/7 Power supply",
      "Quiet & Productive Work Environment",
      "Flexible Access",
      "Water (Hot/Cold)",
    ],
    imageUrl: "/images/search/2.jpg",
    sortOrder: 1,
    isPopular: true,
    isActive: true,
    pricing: [
      {
        planName: "Daily Pass",
        durationDays: 1,
        price: 4000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      },
    ],
  },
  {
    name: "Dedicated Desk",
    slug: "dedicated-desk",
    category: ResourceCategory.DEDICATED_DESK,
    description:
      "Assigned personal workstation with personal desk drawer and daily access in a quiet, productive workspace zone.",
    capacity: 24,
    location: "1st Floor, Focus Wing",
    amenities: [
      "Assigned Personal workstation",
      "High-Speed Internet/Wi-Fi",
      "Ergonomic Office Chair",
      "Power & Charging Facilities",
      "24/7 Power Supply",
      "Quiet & Productive Work Environment",
      "Personal Desk Drawer",
      "Daily Access",
      "Water (Hot/Cold)",
    ],
    imageUrl: "/images/search/1.jpg",
    sortOrder: 2,
    isPopular: true,
    isActive: true,
    pricing: [
      {
        planName: "Monthly Dedicated",
        durationMonths: 1,
        price: 68000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      },
    ],
  },
  {
    name: "Private Office / Mini Conference",
    slug: "private-office",
    category: ResourceCategory.OFFICE_SUITE,
    description:
      "Air-conditioned private workspace with presentation screen/TV suitable for teams of professionals.",
    capacity: 8,
    location: "2nd Floor, Executive Wing",
    amenities: [
      "High-Speed Internet/Wi-Fi",
      "Presentation Screen/TV",
      "Power & Charging Facilities",
      "24/7 Power Supply",
      "Air-Conditioned Environment",
      "Comfortable Seating Arrangement",
      "Suitable for Teams",
    ],
    imageUrl: "/images/search/3.jpg",
    sortOrder: 3,
    isPopular: false,
    isActive: true,
    pricing: [
      {
        planName: "Daily Team Pass",
        durationDays: 1,
        price: 8000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      },
    ],
  },
  {
    name: "Training / Meeting Room",
    slug: "training-room",
    category: ResourceCategory.TRAINING_ROOM,
    description:
      "Professional meeting & workshop space equipped with presentation screen, air-conditioning, and flexible room setups.",
    capacity: 40,
    location: "1st Floor, Learning Wing",
    amenities: [
      "Professional Meeting & Training Space",
      "Comfortable Seating Arrangement",
      "High-Speed Internet/Wi-Fi",
      "Presentation Screen/TV",
      "Power & Charging Facilities",
      "24/7 Power Supply",
      "Air-Conditioned Environment",
      "Flexible Room Setup",
    ],
    imageUrl: "/images/search/5.jpg",
    sortOrder: 4,
    isPopular: false,
    isActive: true,
    pricing: [
      {
        planName: "Hourly Booking",
        durationHours: 1,
        price: 25000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      },
    ],
  },
  {
    name: "Rooftop Lounge",
    slug: "rooftop-lounge",
    category: ResourceCategory.ROOFTOP_LOUNGE,
    description:
      "Scenic outdoor premium rooftop ambience perfect for photoshoots, content creation, social events, and corporate networking.",
    capacity: 100,
    location: "Rooftop Terrace",
    amenities: [
      "Premium Rooftop Ambience",
      "Private & Social Event Space",
      "Scenic Outdoor Setting",
      "Perfect for Photoshoots & Content Creation",
      "Birthday & Event Hosting",
      "Conducive for Corporate & Networking events",
    ],
    imageUrl: "/images/search/6.jpg",
    sortOrder: 5,
    isPopular: true,
    isActive: true,
    pricing: [
      {
        planName: "Hourly Booking",
        durationHours: 1,
        price: 35000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      },
    ],
  },
  {
    name: "Studio",
    slug: "studio",
    category: ResourceCategory.STUDIO,
    description:
      "Professional content creation and podcast recording space with studio lighting and production support.",
    capacity: 10,
    location: "Ground Floor, Media Studio",
    amenities: [
      "Professional Content Creation Space",
      "Podcast Recording Setup",
      "Professional Lighting Setup",
      "Content Production Support",
      "Flexible Studio Layout",
    ],
    imageUrl: "/images/search/4.jpg",
    sortOrder: 6,
    isPopular: false,
    isActive: true,
    pricing: [
      {
        planName: "Hourly Booking",
        durationHours: 1,
        price: 200000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      },
    ],
  },
];

async function seedCatalogue() {
  console.log("Seeding DAIH official catalogue & pricing...");

  for (const item of SEED_CATALOGUE_DATA) {
    const { pricing, ...resourceData } = item;

    const resource = await prisma.facilityResource.upsert({
      where: { slug: item.slug },
      update: {
        ...resourceData,
      },
      create: {
        ...resourceData,
      },
    });

    console.log(`Resource synced: ${resource.name} (${resource.slug})`);

    // Sync default pricing
    for (const plan of pricing) {
      const existingPlan = await prisma.resourcePricing.findFirst({
        where: {
          resourceId: resource.id,
          planName: plan.planName,
        },
      });

      if (existingPlan) {
        await prisma.resourcePricing.update({
          where: { id: existingPlan.id },
          data: {
            price: plan.price,
            currency: plan.currency,
            durationDays: plan.durationDays,
            durationMonths: plan.durationMonths,
            durationHours: plan.durationHours,
            isPopular: plan.isPopular,
            isActive: plan.isActive,
          },
        });
      } else {
        await prisma.resourcePricing.create({
          data: {
            resourceId: resource.id,
            planName: plan.planName,
            price: plan.price,
            currency: plan.currency,
            durationDays: plan.durationDays,
            durationMonths: plan.durationMonths,
            durationHours: plan.durationHours,
            isPopular: plan.isPopular,
            isActive: plan.isActive,
          },
        });
      }
    }
  }

  console.log("Catalogue seed complete!");
}

seedCatalogue()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
