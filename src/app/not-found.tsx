import Link from "next/link";
import { SearchBox } from "@/components/SearchHero";

export default function NotFound() {
  return (
    <div className="wrap py-16">
      <h1 className="text-xl font-medium">Record not found</h1>
      <p className="mt-2 text-sm text-ink-mute">The ID may be wrong, or the record is not in PisoScan&apos;s datasets. Try searching instead.</p>
      <div className="mt-5 max-w-2xl"><SearchBox /></div>
      <p className="mt-4 text-sm"><Link href="/">Back to home</Link></p>
    </div>
  );
}
