import { Check, ArrowLeft, Sparkles, Infinity } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    tier: "PRO",
    name: "Pro",
    credits: "25,000",
    aiVideos: "750",
    badge: null,
    tierColor: "text-amber-500",
    borderColor: "border-border/50",
    btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
    features: [
      "25,000 credits per month",
      "750 AI videos / month",
      "Google Flow managed access",
      "15-day satisfaction warranty",
      "API auto-rotation every 24h",
      "Credit tracking dashboard",
      "Reseller support",
    ],
  },
  {
    tier: "ULTRA",
    name: "Ultra",
    credits: "45,000",
    aiVideos: "1,250",
    badge: { text: "Most Popular", color: "bg-purple-600 text-white" },
    tierColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    btnClass: "bg-purple-600 hover:bg-purple-700 text-white",
    features: [
      "45,000 credits per month",
      "1,250 AI videos / month",
      "Google Flow managed access",
      "Veo 3.1 – Fast unlocked",
      "Veo 3.1 – Fast (Lower Priority) unlocked",
      "Priority API pool",
      "API auto-rotation every 24h",
      "Full generation history",
      "Credit tracking dashboard",
      "Priority reseller support",
      "Early access to new features",
    ],
  },
  {
    tier: "UNLIMITED",
    name: "Flow Unlimited",
    credits: null,
    aiVideos: null,
    badge: { text: "Best Value", color: "bg-emerald-600 text-white" },
    tierColor: "text-yellow-500",
    borderColor: "border-yellow-500/30",
    btnClass: "border border-yellow-600 text-yellow-500 hover:bg-yellow-600/10 bg-transparent",
    features: [
      "Unlimited credits",
      "Unlimited AI videos",
      "Google Flow managed access",
      "Veo 3.1 – Fast unlocked",
      "Veo 3.1 – Fast (Lower Priority) unlocked",
      "Priority API pool",
      "API auto-rotation every 24h",
      "Full generation history",
      "Credit tracking dashboard",
      "Priority reseller support",
      "Early access to new features",
      "Dedicated account manager",
      "Custom API allocation",
    ],
  },
];

const faqs = [
  {
    q: "What are credits?",
    a: "Each video generation on Google Flow uses a certain number of credits depending on length and quality settings.",
  },
  {
    q: "Do credits roll over?",
    a: "Credits reset at the start of each billing cycle and do not carry over to the next month.",
  },
  {
    q: "How does Google Flow access work?",
    a: "Our extension injects your assigned API access into the Flow website, giving you instant access without any extra setup.",
  },
  {
    q: "Can I upgrade mid-cycle?",
    a: "Yes! Contact your reseller and they'll upgrade your plan immediately with prorated credits.",
  },
];

export default function Plans() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="px-4 py-4 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Plan & Pricing</span>
        </Link>
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto w-full pb-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Google Flow AI
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Choose your plan</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Get managed access to Google Flow's AI video generation. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start mb-16">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border ${plan.borderColor} bg-card p-6 flex flex-col`}
            >
              {plan.badge && (
                <span className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full ${plan.badge.color}`}>
                  {plan.badge.text}
                </span>
              )}

              <div className="mb-4">
                <span className={`text-xs font-bold tracking-widest uppercase ${plan.tierColor}`}>
                  {plan.tier}
                </span>
                <h2 className="text-2xl font-bold mt-1">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">1 Month · Contact Your Reseller</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex items-center justify-around mb-6">
                {plan.credits ? (
                  <>
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-extrabold text-primary">{plan.credits}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">credits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl md:text-3xl font-extrabold text-foreground">{plan.aiVideos}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">AI videos</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <Infinity className="h-7 w-7 mx-auto text-muted-foreground" />
                      <div className="text-xs text-muted-foreground mt-1">credits</div>
                    </div>
                    <div className="text-center">
                      <Infinity className="h-7 w-7 mx-auto text-muted-foreground" />
                      <div className="text-xs text-muted-foreground mt-1">AI videos</div>
                    </div>
                  </>
                )}
              </div>

              <ul className="space-y-3 text-sm flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-4 rounded-full font-semibold text-sm transition-colors ${plan.btnClass}`}
              >
                Get {plan.tier === "UNLIMITED" ? "Unlimited" : plan.name} — Contact Your Reseller
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8 md:p-10 mb-8">
          <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold text-sm mb-1">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Need a custom plan?</h3>
            <p className="text-sm text-muted-foreground">Contact your reseller for team or agency pricing.</p>
          </div>
          <button className="shrink-0 rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Contact Your Reseller
          </button>
        </div>
      </div>
    </div>
  );
}
