# 🎥 Production Tracker (Laserman V2)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

> **The next-generation operating system for modern film and media production.**

Production Tracker is a mission-critical platform designed to streamline the chaotic lifecycle of film production. Built for speed, reliability, and visual clarity, it provides production teams with a centralized command center to manage everything from world-building bibles to individual scene extractions and character development.

---

## ✨ Key Features

### 🏛️ Production Bible
The single source of truth for your production. Maintain consistency across your world with a structured repository for lore, rules, and creative vision.

### 🎭 Character OS
Detailed character management including profiles, arcs, and relationships. Track character progression through the entire script lifecycle.

### 🎬 Scene Intelligence
Deep tracking of scenes, from initial descriptions to detailed extractions. Monitor production status and resource requirements on a per-scene basis.

### 🔐 Secure Infrastructure
Enterprise-grade authentication powered by **NextAuth.js**, ensuring your creative assets remain confidential.

### ⚡ Rapid Interface
A high-performance UI built with **React 19** and **Tailwind CSS 4.0**, featuring glassmorphism and micro-animations for an elite user experience.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Frontend**: [React 19](https://reactjs.org/) & [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Database**: [Prisma](https://www.prisma.io/) with PostgreSQL
- **Auth**: [NextAuth.js v5 (Beta-30)](https://authjs.dev/)
- **Validation**: [Zod](https://zod.dev/)

---

## 🚀 Getting Started

Follow these simple steps to get the environment running on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/) (Local instance or Docker)

### 2. Clone the Repository
```bash
git clone https://github.com/mhrjdv/production-tracker.git
cd production-tracker
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
*Note: Make sure to fill in your `DATABASE_URL` and `AUTH_SECRET`.*

### 4. Install Dependencies
```bash
npm install
```

### 5. Database Initialization
Prepare the database schema and seed initial data:
```bash
npx prisma migrate dev
npm run db:seed
```

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Architecture

```text
src/
├── app/          # Next.js App Router (Pages & API)
├── components/   # UI Components (Atomic Design)
│   └── ui/       # Shared base components (Shadcn)
├── data/         # Static JSON datasets (Legacy Support)
├── lib/          # Core utilities & DB connections
└── types/        # TypeScript interfaces
prisma/           # Database schema & seed scripts
```

---

## 🚢 Deployment

The platform is optimized for deployment on **Vercel**. Ensure you configure your PostgreSQL database (e.g., Vercel Postgres, Supabase, or AWS RDS) and add the environment variables in the Vercel Dashboard.

```bash
npm run build
```

---

## 🤝 Contributing

We maintain a high standard for code quality and UI/UX excellence. Please ensure your contributions align with the project's design system.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for the future of filmmaking.
</p>
