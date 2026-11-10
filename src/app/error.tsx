"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-xl font-medium">Something went wrong</h1>
      <p className="mt-2 text-sm text-[#6b6b6b]">The page could not be loaded. Please try again.</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-[#111111] px-3 py-1.5 text-sm text-white">Try again</button>
    </div>
  );
}
