"use client";

import { useState } from "react";
import { ChevronRight, ArrowRight, Play } from "lucide-react";

const TABS = [
  { key: "spline", label: "1. Spline Scene" },
  { key: "hero5", label: "2. Hero Section 5" },
  { key: "herodark", label: "3. Hero Section Dark" },
  { key: "hero1", label: "4. Hero Section 1" },
] as const;

export default function PreviewHeroesPage() {
  const [active, setActive] = useState<typeof TABS[number]["key"]>("spline");

  return (
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`text-xs md:text-sm px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              active === tab.key
                ? "bg-primary text-bg"
                : "border border-border text-text-gray hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "spline" && <SplineSceneMock />}
      {active === "hero5" && <HeroSection5Mock />}
      {active === "herodark" && <HeroSectionDarkMock />}
      {active === "hero1" && <HeroSection1Mock />}
    </div>
  );
}

// 1. Spline Scene — split layout, text left, 3D/visual right, spotlight glow
function SplineSceneMock() {
  return (
    <div className="relative overflow-hidden bg-bg min-h-[80vh] flex items-center">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 70% 50%, rgba(139,127,232,0.25), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center w-full">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl text-text leading-tight mb-5">
            College guidance,{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              built around you.
            </span>
          </h1>
          <p className="text-text-gray leading-relaxed mb-8 max-w-md">
            A personalized path built from your grades, goals, and interests, regardless of
            what your family can afford.
          </p>
          <button className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-3">
            Get Started
          </button>
        </div>
        <div className="aspect-square rounded-2xl bg-card border border-border flex items-center justify-center text-text-gray text-sm">
          [ interactive 3D scene ]
        </div>
      </div>
    </div>
  );
}

// 2. Hero Section 5 — video/motion background, centered content, Tailark style
function HeroSection5Mock() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-bg to-secondary/10" />
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <Play className="w-24 h-24 text-text-gray" />
      </div>
      <div className="relative z-10 text-center px-6 max-w-2xl">
        <span className="inline-block text-xs font-medium text-primary border border-primary rounded-full px-3 py-1 mb-5">
          Now helping students nationwide
        </span>
        <h1 className="font-serif text-4xl md:text-5xl text-text leading-tight mb-5">
          Your future, mapped out clearly.
        </h1>
        <p className="text-text-gray leading-relaxed mb-8">
          Real school matches, a real timeline, and honest feedback, the guidance every
          student deserves.
        </p>
        <div className="flex gap-3 justify-center">
          <button className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-3">
            Get Started
          </button>
          <button className="rounded-xl border border-border text-text hover:bg-card transition-colors font-medium px-6 py-3 flex items-center gap-2">
            <Play className="w-4 h-4" /> Watch how it works
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Hero Section Dark — retro grid bg, badge, gradient heading, dashboard preview image
function HeroSectionDarkMock() {
  return (
    <div className="relative min-h-[85vh] overflow-hidden bg-bg flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,127,232,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139,127,232,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform: "perspective(500px) rotateX(60deg) scale(2)",
          transformOrigin: "top",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(139,127,232,0.3), transparent 50%)",
        }}
      />
      <div className="relative z-10 text-center max-w-2xl py-20">
        <span className="inline-flex items-center gap-1 text-xs text-text-gray border border-border rounded-full px-3 py-1 mb-6">
          College guidance for every student <ChevronRight className="w-3 h-3" />
        </span>
        <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-5">
          <span className="text-text">Clarity </span>
          <span className="bg-gradient-to-r from-primary to-premium bg-clip-text text-transparent">
            shouldn&apos;t cost extra.
          </span>
        </h1>
        <p className="text-text-gray leading-relaxed mb-8">
          Metam gives you the kind of guidance a private counselor would, free to start.
        </p>
        <button className="relative rounded-xl bg-primary text-bg font-medium px-6 py-3 overflow-hidden">
          Get Started
        </button>
        <div className="mt-14 rounded-2xl border border-border bg-card aspect-video max-w-3xl mx-auto flex items-center justify-center text-text-gray text-sm">
          [ dashboard preview image ]
        </div>
      </div>
    </div>
  );
}

// 4. Hero Section 1 — classic centered SaaS hero, nav-style top bar, large heading
function HeroSection1Mock() {
  return (
    <div className="min-h-[85vh] bg-bg">
      <div className="flex items-center justify-between px-6 md:px-12 py-5">
        <span className="font-serif text-lg text-primary">Metam</span>
        <div className="hidden md:flex gap-6 text-sm text-text-gray">
          <span>How it works</span>
          <span>Pricing</span>
          <span>About</span>
        </div>
        <button className="rounded-xl bg-primary text-bg text-sm font-medium px-4 py-2">
          Sign up
        </button>
      </div>
      <div className="text-center px-6 py-24 max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl md:text-6xl text-text leading-tight mb-6">
          The guidance every student deserves, not just the ones who can afford it.
        </h1>
        <p className="text-text-gray leading-relaxed mb-8 max-w-xl mx-auto">
          Personalized school matches, a real timeline, and honest essay feedback, built
          around your actual profile.
        </p>
        <div className="flex gap-3 justify-center mb-16">
          <button className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-3 flex items-center gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
          <button className="rounded-xl border border-border text-text hover:bg-card transition-colors font-medium px-6 py-3">
            Learn more
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card aspect-[16/9] flex items-center justify-center text-text-gray text-sm">
          [ product screenshot ]
        </div>
      </div>
    </div>
  );
}
