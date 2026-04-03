import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { HomepageClient } from "@/components/homepage/HomepageClient";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>
        <HomepageClient />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #E2E0D8", background: "#FAFAF7" }}>
        <div
          style={{
            maxWidth: 1152, margin: "0 auto", padding: "32px 40px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 16,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo.png" alt="Connect" style={{ width: 18, height: 18, objectFit: "contain" }} />
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "#1A1A1A" }}>Connect</span>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {["Features", "How it works", "Explore", "Privacy", "Terms"].map((item) => (
              <Link
                key={item}
                href="#"
                style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#999690", textDecoration: "none" }}
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>
            © Connect 2025
          </span>
        </div>
      </footer>
    </>
  );
}
