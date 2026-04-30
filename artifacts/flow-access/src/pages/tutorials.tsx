import { TutorialGrid } from "@/components/tutorial-grid";

export default function Tutorials() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Updated Tutorials</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Watch the latest tutorials for using Veo Flow API. More videos are on the way.
        </p>
      </div>
      <TutorialGrid />
    </div>
  );
}
