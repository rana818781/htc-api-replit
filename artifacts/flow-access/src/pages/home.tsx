import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { TutorialGrid } from "@/components/tutorial-grid";

const videoThumbnails = [
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1518676590747-1e3dcf5a960b?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1518882515519-a59e352dfb57?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=200&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop",
];

const COLUMN_COUNT = 6;

function distributeToColumns(images: string[], columns: number): string[][] {
  const cols: string[][] = Array.from({ length: columns }, () => []);
  images.forEach((img, i) => {
    cols[i % columns].push(img);
  });
  return cols;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function ScrollingColumn({ images, direction, speed, paused }: { images: string[]; direction: "up" | "down"; speed: number; paused: boolean }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<number | null>(null);
  const doubled = [...images, ...images];

  useEffect(() => {
    const el = columnRef.current;
    if (!el || paused) return;
    let animationId: number;
    const halfHeight = el.scrollHeight / 2;
    if (posRef.current === null) {
      posRef.current = direction === "up" ? 0 : -halfHeight;
    }

    const animate = () => {
      if (direction === "up") {
        posRef.current! -= speed;
        if (Math.abs(posRef.current!) >= halfHeight) posRef.current = 0;
      } else {
        posRef.current! += speed;
        if (posRef.current! >= 0) posRef.current = -halfHeight;
      }
      el.style.transform = `translateY(${posRef.current}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [direction, speed, images.length, paused]);

  return (
    <div className="overflow-hidden h-full">
      <div ref={columnRef} className="flex flex-col gap-3 will-change-transform">
        {doubled.map((src, i) => (
          <div key={i} className="rounded-xl overflow-hidden flex-shrink-0" style={{ aspectRatio: "3/4" }}>
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedMosaicBackground() {
  const columns = distributeToColumns(videoThumbnails, COLUMN_COUNT);
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paused = reducedMotion || !visible;

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden">
      <div
        className="h-[140%] -mt-[20%] flex gap-3 px-3 opacity-60"
        style={{ perspective: "1000px", transform: "rotateX(8deg) scale(1.1)" }}
      >
        {columns.map((col, i) => (
          <div key={i} className="flex-1 min-w-0">
            <ScrollingColumn
              images={col}
              direction={i % 2 === 0 ? "up" : "down"}
              speed={0.3 + (i % 3) * 0.1}
              paused={paused}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-[#0a0a0a]/30" />
    </div>
  );
}

const showcaseItems = [
  {
    title: "Cinematic Worlds",
    description: "Bring entire worlds to life with AI-driven cinematic scene generation and camera work",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
  },
  {
    title: "Motion & Visual Effects",
    description: "Craft professional motion graphics and VFX that rival studio-level production",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop",
  },
  {
    title: "Visual Storytelling",
    description: "Transform raw ideas into polished visual stories with intelligent AI direction",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=400&fit=crop",
  },
];

const aiModels = [
  {
    name: "Veo 3.1",
    emoji: "\u2728",
    description: "State-of-the-art video generation with unprecedented quality and control",
    badge: "Video",
  },
  {
    name: "Imagen 4",
    emoji: "\u2728",
    description: "Photorealistic image synthesis with incredible detail and accuracy",
    badge: "Image",
  },
  {
    name: "Nano Banana",
    emoji: "\u2728",
    description: "Fast, creative image generation for rapid iteration and experimentation",
    badge: "Image",
  },
  {
    name: "Nano Banana 2 Pro",
    emoji: "\u2728",
    description: "Enhanced generation with higher fidelity, better coherence and premium quality",
    badge: "Image \u00B7 Pro",
  },
];

const tickerItems = ["Veo 3.1", "Imagen 4", "Nano Banana", "Nano Banana 2 Pro", "Google Flow"];

const features = [
  {
    emoji: "\uD83C\uDFAC",
    title: "AI Video Generation",
    description: "Generate cinematic, high-quality videos up to 8 seconds long using Google's Veo 3.1 \u2014 the world's most advanced video model.",
  },
  {
    emoji: "\uD83D\uDDBC\uFE0F",
    title: "Stunning Image Creation",
    description: "Create photorealistic or artistic images with Imagen 4 and Nano Banana models \u2014 from portraits to abstract art, at any resolution.",
  },
  {
    emoji: "\u26A1",
    title: "Credits-Based Pricing",
    description: "Pay only for what you use. Each plan comes with generous credit allocations \u2014 no hidden fees, no per-generation surprises.",
  },
  {
    emoji: "\uD83D\uDD12",
    title: "Secure & Private",
    description: "Your generations and account data are fully secured. We never share your content \u2014 your creative work stays yours, always.",
  },
  {
    emoji: "\uD83C\uDF10",
    title: "Chrome Extension",
    description: "Install our lightweight browser extension for one-click access to Google Flow with your credentials auto-managed and secured.",
  },
  {
    emoji: "\uD83C\uDFC6",
    title: "Priority Support",
    description: "Get help when you need it. Ultra and Unlimited members enjoy private support with faster response times, always.",
  },
];

const testimonials = [
  {
    name: "Sarah K.",
    role: "Content Creator",
    review: "This platform transformed my entire workflow. I'm producing studio-quality video content in a fraction of the time it used to take.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    name: "James L.",
    role: "Marketing Director",
    review: "Our video production budget dropped dramatically after adopting this tool. The output quality genuinely competes with professional agencies.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    name: "Mina R.",
    role: "Film Student",
    review: "Having access to cutting-edge AI as a student is incredible. It's leveled the playing field for independent creators everywhere.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  },
  {
    name: "David P.",
    role: "YouTube Creator",
    review: "My channel growth took off after I started using this. The AI-generated B-roll and transitions look absolutely professional.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  },
];

const steps = [
  {
    step: "01",
    title: "Set Up Your Account",
    description: "Register and pick the plan that matches your creative ambitions. Access starts immediately.",
  },
  {
    step: "02",
    title: "Add the Extension",
    description: "Install our lightweight Chrome extension for instant, one-click access to Flow AI from any tab.",
  },
  {
    step: "03",
    title: "Bring Ideas to Life",
    description: "Generate stunning AI videos, images, and audio. The only limit is your imagination.",
  },
];

const faqItems = [
  {
    question: "What exactly is HTC API?",
    answer: "HTC API is a premium service that gives you seamless, managed access to Google Flow AI's video and image generation tools. We take care of all the technical complexity so you can focus purely on creating.",
  },
  {
    question: "How does the Chrome extension work?",
    answer: "Our extension securely manages your API access in the background, providing instant one-click access to Google Flow AI tools — no personal Google account or manual configuration needed.",
  },
  {
    question: "Which AI models can I use?",
    answer: "You get full access to Google's newest AI models including Veo 3.1 for video generation and Imagen 4 for image creation, with additional models being added over time.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely. Cancel your subscription whenever you like — your access continues through the end of your current billing cycle.",
  },
  {
    question: "Is there a way to try before committing?",
    answer: "Yes! We offer entry-level plans with limited credits so you can explore the full platform before upgrading to a higher tier.",
  },
  {
    question: "What output quality should I expect?",
    answer: "Google Flow AI produces up to 4K resolution video with photorealistic detail, professional-grade lighting, and cinematic camera dynamics.",
  },
];

function FAQItem({ question, answer, id }: { question: string; answer: string; id: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="font-medium text-base">{question}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} role="region" className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <img src="/navbar-logo.png" alt="HTC API" className="h-8 object-contain" />
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/plans" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Plans
            </Link>
            <Button variant="ghost" size="sm" asChild className="text-sm text-white/60 hover:text-white" data-testid="link-login">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-sm font-semibold bg-gradient-to-r from-[#5a3398] to-[#5547fd] hover:opacity-90 text-white rounded-full px-5" data-testid="link-register">
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative pt-16 min-h-[100vh] flex flex-col items-center justify-center overflow-hidden">
        <AnimatedMosaicBackground />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <img src="/hero-logo.png" alt="HTC API" className="h-24 sm:h-32 md:h-40 object-contain mx-auto mb-6 drop-shadow-2xl" />
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Where the next wave of storytelling happens.
          </p>
          <Button size="lg" asChild className="rounded-full px-8 h-12 text-base font-semibold bg-gradient-to-r from-[#5a3398] to-[#5547fd] text-white hover:opacity-90 shadow-lg shadow-[#5a3398]/30">
            <Link href="/sign-up">Create with Flow</Link>
          </Button>
        </div>

        <div className="absolute bottom-8 z-10 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/40" />
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Watch &amp; Learn</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Quick tutorials to help you get the most out of HTC API.
            </p>
          </div>
          <TutorialGrid columns="md:grid-cols-2 lg:grid-cols-4" />
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Made with Flow</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Explore what creators are producing with Google Flow AI — from cinematic shorts to stunning visual art.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {showcaseItems.map((item, i) => (
              <div key={i} className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 transition-all duration-300">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-white/50 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6 border-y border-white/5 overflow-hidden">
        <div className="text-center mb-4">
          <span className="text-[10px] font-semibold tracking-[0.2em] text-white/30 uppercase">Powered by</span>
        </div>
        <div className="relative">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="flex items-center gap-2 mx-6 text-white/40 text-sm font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powered by Next-Gen AI Models</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Access the most advanced generative AI models available
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {aiModels.map((model, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#12141a] p-6 hover:bg-white/[0.06] transition-colors flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-lg">
                    {model.emoji}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{model.name}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{model.description}</p>
                </div>
                <div className="mt-4">
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
                    {model.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to Create</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Professional AI tools built for creators who demand the best
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#12141a] p-6 hover:bg-white/[0.06] transition-colors">
                <div className="text-2xl mb-4">{feature.emoji}</div>
                <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Trusted by Creators</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Thousands of creators rely on HTC API to turn their ideas into reality every day.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/8 transition-colors">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm mb-5 leading-relaxed">"{t.review}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Start creating in three easy steps — zero technical knowledge required.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-primary font-bold text-xl">{s.step}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Plans</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Pick your plan, install our extension, and start creating with Google Flow AI right away.
            </p>
          </div>
          <div className="text-center">
            <Button size="lg" asChild className="rounded-full px-8 h-12 text-base font-semibold bg-gradient-to-r from-[#5a3398] to-[#5547fd] text-white hover:opacity-90">
              <Link href="/plans">View All Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Common Questions</h2>
            <p className="text-white/50">Everything you need to know about HTC API.</p>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <FAQItem key={i} {...item} id={String(i)} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Create Something Amazing?</h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">
            Join creators worldwide who are already using HTC API to produce incredible AI-generated content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full px-8 h-12 text-base font-semibold bg-gradient-to-r from-[#5a3398] to-[#5547fd] text-white hover:opacity-90">
              <Link href="/sign-up">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-8 h-12 text-base font-semibold border-white/20 text-white hover:bg-white/5">
              <Link href="/plans">View Plans</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/navbar-logo.png" alt="HTC API" className="h-6 object-contain" />
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/plans" className="hover:text-white transition-colors">Plans</Link>
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Get Started</Link>
          </div>
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} HTC API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
