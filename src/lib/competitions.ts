import heroBmw from "@/assets/hero-bmw.jpg";
import prizeWatch from "@/assets/prize-watch.jpg";
import prizeIphone from "@/assets/prize-iphone.jpg";
import prizeCash from "@/assets/prize-cash.jpg";
import prizePs5 from "@/assets/prize-ps5.jpg";

export interface Competition {
  id: string;
  title: string;
  image: string;
  ticketPrice: number;
  currency: string;
  totalTickets: number;
  soldTickets: number;
  endsAt: Date;
  tag: "LIVE" | "Ending Soon" | "Upcoming" | "Sold Out";
  featured?: boolean;
  description?: string;
}

export const competitions: Competition[] = [
  {
    id: "bmw-m3",
    title: "Win a BMW M3!",
    image: heroBmw,
    ticketPrice: 2.00,
    currency: "$",
    totalTickets: 5000,
    soldTickets: 2400,
    endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    tag: "LIVE",
    featured: true,
    description: "Win this stunning BMW M3 Frozen Black Edition. 500 horsepower twin-turbo inline-6 engine, carbon fiber accents, and M Sport exhaust system.",
  },
  {
    id: "tag-heuer",
    title: "TAG Heuer Formula 1 Chronograph",
    image: prizeWatch,
    ticketPrice: 0.50,
    currency: "$",
    totalTickets: 2000,
    soldTickets: 960,
    endsAt: new Date(Date.now() + 45 * 60 * 1000),
    tag: "Ending Soon",
    description: "A stunning TAG Heuer Formula 1 Chronograph with blue dial. Swiss-made precision timepiece.",
  },
  {
    id: "iphone-17",
    title: "Apple iPhone 17 Pro Max",
    image: prizeIphone,
    ticketPrice: 0.39,
    currency: "$",
    totalTickets: 3000,
    soldTickets: 1200,
    endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
    tag: "LIVE",
    description: "The latest Apple iPhone 17 Pro Max with 256GB storage, A19 Pro chip, and titanium design.",
  },
  {
    id: "cash-50k",
    title: "$50,000 Cash Prize",
    image: prizeCash,
    ticketPrice: 2.00,
    currency: "$",
    totalTickets: 10000,
    soldTickets: 6800,
    endsAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    tag: "Ending Soon",
    description: "Win $50,000 cash deposited directly to your mobile money account!",
  },
  {
    id: "ps5-bundle",
    title: "PlayStation 5 Bundle",
    image: prizePs5,
    ticketPrice: 0.50,
    currency: "$",
    totalTickets: 1500,
    soldTickets: 450,
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    tag: "LIVE",
    description: "PS5 Console with 2 DualSense controllers, PS Plus 12-month subscription, and 3 games of your choice.",
  },
];

export const winners = [
  { name: "Kwame A.", prize: "Samsung Galaxy S24", ticket: "WBX-48291", date: "Mar 28, 2026" },
  { name: "Ama D.", prize: "$10,000 Cash", ticket: "WBX-73920", date: "Mar 25, 2026" },
  { name: "Kofi M.", prize: "MacBook Pro 16\"", ticket: "WBX-12847", date: "Mar 22, 2026" },
  { name: "Abena S.", prize: "iPhone 16 Pro", ticket: "WBX-59302", date: "Mar 19, 2026" },
];
