"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight } from "lucide-react";
import { useScroll, motion } from "framer-motion";

export function HeroSection({ studentCount }: { studentCount: number }) {
  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden">
        <section>
          <div className="py-24 md:pb-32 lg:pb-36 lg:pt-72">
            <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
              <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                <h1 className="font-serif mt-8 max-w-2xl text-balance text-5xl text-text md:text-6xl lg:mt-16 xl:text-7xl">
                  Your future, mapped out clearly.
                </h1>
                <p className="mt-8 max-w-2xl text-balance text-lg text-text-gray">
                  Real school matches, a real timeline, and honest feedback, the guidance
                  every student deserves, regardless of what their family can afford.
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

                <div className="mt-10 inline-block rounded-2xl bg-card border border-border px-6 py-4">
                  <p className="font-serif text-xl text-primary mb-0.5">
                    {studentCount.toLocaleString()} students helped so far
                  </p>
                  <p className="text-text-gray text-sm">Real profiles, real plans, growing every week.</p>
                </div>
              </div>
            </div>
            <div className="aspect-[2/3] absolute inset-1 overflow-hidden rounded-3xl border border-border sm:aspect-video lg:rounded-[3rem]">
              <div className="size-full bg-gradient-to-br from-primary/20 via-bg to-secondary/10" />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: "How it works", href: "#how-it-works" },
  { name: "Pricing", href: "/upgrade" },
  { name: "About", href: "#about" },
];

const HeroHeader = () => {
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
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <span className="font-serif text-lg text-primary">Metam</span>
              </Link>

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
                      <Link href={item.href} className="text-text-gray hover:text-text block duration-150">
                        <span>{item.name}</span>
                      </Link>
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
                      <Link href={item.href} className="text-text-gray hover:text-text block duration-150">
                        <span>{item.name}</span>
                      </Link>
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
