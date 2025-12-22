# 🍷 Drinks API Project

**Drinks API** Project is a comprehensive platform designed to model, manage, and explore the complex domain of alcoholic beverages. It provides a unified and extensible data ecosystem for cataloging **Beers, Wines, and Spirits**, capturing both their commercial identity and their technical, geographical, and compositional characteristics.

The project is architected as a modern monorepo, with a clear separation of concerns between a high-performance backend API and a dynamic, user-facing frontend. The entire system is built, deployed, and operated using the **Cloudflare suite**, ensuring global availability, scalability, and low-latency access.

---

## 🏗️ Architecture Overview

### ⚙️ Backend — API

The backend is implemented as a serverless API running on **Cloudflare Workers**, optimized for execution at the edge. It encapsulates all business logic and data persistence, enforcing strong data integrity through a carefully designed relational schema.

Key responsibilities include:
- Managing canonical drink entities and their relationships
- Enforcing consistency across brands, origins, and drink-specific attributes
- Exposing a type-safe and validated API surface for frontend consumption

### 🌐 Frontend — Web Application

The frontend is a modern, responsive web application built with **Astro** and **Svelte**, and is deployed globally via **Cloudflare Pages**. It provides an intuitive interface for browsing, filtering, and exploring the drinks catalog, while benefiting from Cloudflare’s CDN and edge caching capabilities.

---

## 🧠 Key Features & Data Model

The core strength of the project lies in its rich and expressive data model, designed to reflect real-world beverage classification with precision.

### 🌍 Global Identity & Classification
- **Brands & Origins:**
    Models breweries, distilleries, and wineries, linked to precise geographical hierarchies (countries and regions).

- **Categorization System:**
    Organizes beverages into high-level categories while preserving detailed type hierarchies.

### 🍺🍷🥃 Domain-Specific Modeling
- **Beers**
    - IBU (International Bitterness Units)
    - Recommended serving temperatures
    - Hierarchical style taxonomy (e.g., IPA -> West Coast IPA).

- **Wines**
    - Grape strain composition, including percentage-based blends
    - Vintages and harvest years
    - Vineyard and origin specificity

- **Spirits**
    - Aging processes and duration
    - Aging container types (barrels, casks, etc.)

### 📦 Physical & Commercial Attributes
- **Physical Attributes:**
    Separates the liquid product from its physical presentation, modeling bottles, cans, and volume formats as first-class entities.

---

## 🛠️ Technology Stack

### ☁️ Cloudflare Ecosystem (End-to-End)
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Serverless API runtime at the edge
- **[Cloudflare Pages](https://pages.cloudflare.com/)** — Frontend deployment and global CDN
- **[Cloudflare D1](https://workers.cloudflare.com/product/d1)** — Distributed SQLite-based SQL database
- **[Cloudflare Workers KV](https://www.cloudflare.com/products/workers-kv/)** — Key-Value storage for global data
- **[Cloudflare Platform](https://www.cloudflare.com/)** — Unified infrastructure for networking, security, and performance

### 🔌 API Stack 
-   **Framework**: [Hono](https://hono.dev/) — Fast and lightweight web framework for edge environments
-   **ORM**: [Drizzle ORM](https://orm.drizzle.team/) — Type-safe database access with TypeScript
-   **Validation**: [Zod](https://zod.dev/) — Runtime schema validation and type inference

### 🎨 Frontend Stack
-   **Framework**: [Astro](https://astro.build/) — Content-focused, performance-first framework
-   **UI Component**: [Svelte](https://svelte.dev/) — Reactive component system
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework

---

## 🗄️ Database Schema

The database is implemented using **Cloudflare D1 (SQLite)** and includes a normalized relational schema covering the full drinks ecosystem: brands, origins, categories, drink types, compositions, aging processes, and packaging formats.

For full technical details, see the schema definition in: `api/schema.sql`

---

## 📚 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
