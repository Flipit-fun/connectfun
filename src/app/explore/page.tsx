import { Navbar } from "@/components/layout/Navbar";
import { ExploreClient } from "@/components/explore/ExploreClient";

export const metadata = {
  title: "Explore Communities — Connect",
  description: "Browse thousands of focused crypto communities, DAOs, and indie groups on Connect.",
};

export default function ExplorePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Navbar />
      <main style={{ flex: 1, background: "#FAFAF7" }}>
        <ExploreClient />
      </main>
    </div>
  );
}
