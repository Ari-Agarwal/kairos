"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight } from "lucide-react";
import { useScroll, motion } from "framer-motion";
import { AboutContent } from "@/components/AboutContent";

const Hero3D = dynamic(() => import("./hero-3d").then((m) => m.Hero3D), { ssr: false });

export function HeroSection({ studentCount }: { studentCount: number }) {
  const [view, setView] = React.useState<"home" | "about">("home");

  return (
    <>
      <HeroHeader view={view} onNavigate={setView} />
      <main className="overflow-x-hidden">
        {view === "about" ? (
          <section className="relative min-h-screen bg-bg pt-32">
            <AboutContent studentCount={studentCount} showLogo={false} />
          </section>
        ) : (
          <section className="relative min-h-screen overflow-hidden bg-bg">
            <div className="absolute inset-0 z-0">
              <Hero3D />
            </div>
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-bg/10 via-bg/40 to-bg pointer-events-none" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-r from-bg via-bg/30 to-transparent pointer-events-none" />

            <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 lg:px-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto max-w-lg text-center lg:mx-0 lg:max-w-xl lg:text-left"
              >
                <h1 className="font-serif text-balance text-5xl text-text md:text-6xl xl:text-7xl">
                  Your future, mapped out clearly.
                </h1>
                <p className="mt-8 max-w-xl text-balance text-lg text-text-gray">
                  Real school matches, a real timeline, and honest feedback. The guidance
                  every student deserves.
                </p>

                <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
                  <Button asChild size="lg" className="h-12 rounded-full pl-5 pr-3 text-base">
                    <Link href="/signup">
                      <span className="text-nowrap">Get Started</span>
                      <ChevronRight className="ml-1" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-12 rounded-full px-5 text-base"
                  >
                    <Link href="/login">
                      <span className="text-nowrap">Log in</span>
                    </Link>
                  </Button>
                </div>

                <div className="mt-10 inline-block rounded-2xl bg-card/80 backdrop-blur-sm border border-border px-6 py-4">
                  <p className="font-serif text-xl text-primary mb-0.5">
                    {studentCount.toLocaleString()} students helped so far
                  </p>
                  <p className="text-text-gray text-sm">Real profiles, real plans, growing every week.</p>
                </div>
              </motion.div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

const menuItems: { name: string; view: "about" }[] = [{ name: "About", view: "about" }];

const HeroHeader = ({
  view,
  onNavigate,
}: {
  view: "home" | "about";
  onNavigate: (view: "home" | "about") => void;
}) => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollYProgress } = useScroll();

  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <header>
      <nav data-state={menuState && "active"} className="group fixed z-20 w-full pt-2">
        <div
          className={cn(
            "mx-auto max-w-7xl rounded-3xl px-6 transition-all duration-300 lg:px-12",
            scrolled && "bg-bg/50 backdrop-blur-2xl"
          )}
        >
          <motion.div
            className={cn(
              "relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6",
              scrolled && "lg:py-4"
            )}
          >
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <button
                type="button"
                aria-label="home"
                onClick={() => onNavigate("home")}
                className="flex items-center space-x-2"
              >
                <span className="font-serif text-lg text-primary">Telos</span>
              </button>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 text-text duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 text-text opacity-0 duration-200" />
              </button>

              <div className="hidden lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.view)}
                        className={cn(
                          "text-text-gray hover:text-text block duration-150",
                          view === item.view && "text-text"
                        )}
                      >
                        <span>{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-card group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-border p-6 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.view);
                          setMenuState(false);
                        }}
                        className={cn(
                          "text-text-gray hover:text-text block duration-150",
                          view === item.view && "text-text"
                        )}
                      >
                        <span>{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">
                    <span>Log in</span>
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">
                    <span>Sign Up</span>
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
};
