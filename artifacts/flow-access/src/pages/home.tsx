import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Star, ChevronDown, Sparkles, Monitor } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
    title: "Cinematic Landscapes",
    description: "Create breathtaking cinematic landscape videos with AI-powered scene generation",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
  },
  {
    title: "Creative Motion Graphics",
    description: "Design stunning motion graphics and visual effects for any project",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop",
  },
  {
    title: "Professional Storytelling",
    description: "Turn your ideas into compelling visual narratives with AI assistance",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=400&fit=crop",
  },
];

const stats = [
  { value: "4K+", label: "Videos Created" },
  { value: "1M+", label: "Total Views" },
  { value: "30.6%", label: "Faster Creation" },
  { value: "1min", label: "Average Generation" },
];

const devices = [
  { name: "Mac 15", icon: Monitor },
  { name: "Imagen 4", icon: Sparkles },
  { name: "Retro Display", icon: Monitor },
  { name: "Retro Display 5 Pro", icon: Monitor },
  { name: "Google Titan", icon: Sparkles },
  { name: "Mac 21", icon: Monitor },
  { name: "Imagen 4", icon: Sparkles },
  { name: "Retro Display", icon: Monitor },
  { name: "Retro Display 5 Pro", icon: Monitor },
  { name: "Google Titan", icon: Sparkles },
];

const aiModels = [
  {
    name: "Veo 2.1",
    description: "Google's most advanced video generation model. Create photorealistic, high-quality videos with precise control over camera motion, lighting, and style.",
    badge: "Video",
  },
  {
    name: "Imagen 4",
    description: "Next-generation image synthesis with unprecedented quality. Generate stunning visuals, concept art, and photorealistic images from text descriptions.",
    badge: "Image",
  },
];

const features = [
  {
    title: "AI Video Generation",
    description: "Create stunning, photorealistic videos from text prompts with Google's Veo 2.1 model",
    image: "https://images.unsplash.com/photo-1518882515519-a59e352dfb57?w=600&h=400&fit=crop",
  },
  {
    title: "Stunning Image Creation",
    description: "Generate breathtaking images with Imagen 4's advanced synthesis capabilities",
    image: "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=600&h=400&fit=crop",
  },
  {
    title: "Cinematic Sound Effects",
    description: "Add professional-grade audio effects and soundscapes to your AI-generated content",
    image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=400&fit=crop",
  },
];

const featureImages = [
  "https://images.unsplash.com/photo-1518882515519-a59e352dfb57?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&h=400&fit=crop",
];

const testimonials = [
  {
    name: "Sarah K.",
    role: "Content Creator",
    review: "Veo Flow API completely changed how I create content. The AI video generation is mind-blowing — I can produce studio-quality videos in minutes.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    name: "James L.",
    role: "Marketing Director",
    review: "We've cut our video production costs by 80% since switching to Veo Flow API. The quality rivals professional studios.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    name: "Mina R.",
    role: "Film Student",
    review: "As a student, this tool gives me access to professional-grade AI that I couldn't afford otherwise. Game changer for indie filmmakers.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  },
  {
    name: "David P.",
    role: "YouTube Creator",
    review: "My channel growth exploded after using Veo Flow API. The AI-generated B-roll and transitions look absolutely cinematic.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  },
];

const steps = [
  {
    step: "01",
    title: "Create Your Account",
    description: "Sign up and choose a plan that fits your creative needs. Get instant access to Google Flow AI tools.",
  },
  {
    step: "02",
    title: "Install the Extension",
    description: "Download our Chrome extension for seamless, one-click access to Flow AI directly from your browser.",
  },
  {
    step: "03",
    title: "Start Creating",
    description: "Generate stunning AI videos, images, and more. Your creativity is the only limit.",
  },
];

const faqItems = [
  {
    question: "What is Veo Flow API?",
    answer: "Veo Flow API is a premium platform that provides seamless access to Google Flow AI video and image generation tools. We handle the technical setup so you can focus on creating.",
  },
  {
    question: "How does the Chrome extension work?",
    answer: "Our Chrome extension securely manages your session, giving you one-click access to Google Flow AI tools without needing your own Google account or complex setup.",
  },
  {
    question: "What AI models are available?",
    answer: "You get access to Google's latest AI models including Veo 2.1 for video generation and Imagen 4 for image creation, with more models being added regularly.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
  },
  {
    question: "Is there a free trial?",
    answer: "We offer starter plans with limited credits so you can experience the platform before committing to a full subscription.",
  },
  {
    question: "What video quality can I expect?",
    answer: "Google Flow AI generates up to 4K resolution videos with photorealistic quality, professional lighting, and cinematic camera movements.",
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
            <Play className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold text-lg tracking-tight">Flow</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/plans" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Plans
            </Link>
            <Button variant="ghost" size="sm" asChild className="text-sm text-white/60 hover:text-white" data-testid="link-login">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5" data-testid="link-register">
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative pt-16 min-h-[100vh] flex flex-col items-center justify-center overflow-hidden">
        <AnimatedMosaicBackground />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-2xl">
            Flow
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Where the next wave of storytelling happens.
          </p>
          <Button size="lg" asChild className="rounded-full px-8 h-12 text-base font-semibold bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10">
            <Link href="/sign-up">Create with Flow</Link>
          </Button>
        </div>

        <div className="absolute bottom-8 z-10 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/40" />
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Made with Flow</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              See what creators are building with Google Flow AI. From cinematic videos to stunning visuals.
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

      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-white/40 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {devices.map((device, i) => (
              <div key={i} className="flex items-center gap-1.5 text-white/30 text-xs">
                <device.icon className="h-3.5 w-3.5" />
                <span>{device.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powered by Next-Gen AI Models</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Access the full power of Google's latest generative AI models for video and image creation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {aiModels.map((model, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-8 hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-2xl font-bold">{model.name}</h3>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {model.badge}
                  </span>
                </div>
                <p className="text-white/50 leading-relaxed">{model.description}</p>
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
              Professional-grade AI tools for video, image, and audio generation — all in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {features.map((feature, i) => (
              <div key={i} className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-white/50 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featureImages.map((src, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden border border-white/10">
                <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Creators</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Join thousands of creators already using Veo Flow API to bring their visions to life.
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it Works</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Get started in three simple steps — no technical knowledge required.
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent plans</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Choose your plan, install our extension, and start creating with Google Flow AI.
            </p>
          </div>
          <div className="text-center">
            <Button size="lg" asChild className="rounded-full px-10 h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/plans">View All Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Everything you need to know about Veo Flow API.
            </p>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <FAQItem key={i} question={item.question} answer={item.answer} id={String(i)} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary fill-primary" />
            <span className="font-bold text-lg">Flow</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/plans" className="hover:text-white transition-colors">Plans</Link>
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Get Started</Link>
          </div>
          <p className="text-white/30 text-sm">© {new Date().getFullYear()} Veo Flow API. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
