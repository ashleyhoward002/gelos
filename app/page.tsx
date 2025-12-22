import Link from "next/link";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-bright-white">
      <header className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo size="md" />
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-slate-medium hover:text-electric-cyan transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-5xl md:text-6xl font-heading font-bold text-slate-dark mb-6">
            Where your people{" "}
            <span className="text-gradient">come together</span>
          </h2>
          <p className="text-xl text-slate-medium max-w-2xl mx-auto mb-10">
            Plan events, split expenses, and preserve memories with your friends,
            family, or any crew. Gelos makes group life effortless.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-4">
              Create Your First Group
            </Link>
            <Link
              href="/login"
              className="btn-outline text-lg px-8 py-4"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-8 text-left">
            <div className="card-hover">
              <div className="w-12 h-12 bg-electric-cyan/10 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-electric-cyan"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2 text-slate-dark">
                Plan Together
              </h3>
              <p className="text-slate-medium">
                Coordinate schedules, create polls, and make group decisions
                without the endless group chat chaos.
              </p>
            </div>

            <div className="card-hover">
              <div className="w-12 h-12 bg-golden-sun/10 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-golden-sun-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2 text-slate-dark">
                Split Fairly
              </h3>
              <p className="text-slate-medium">
                Track expenses, split costs your way, and send friendly
                reminders. No more awkward money talks.
              </p>
            </div>

            <div className="card-hover">
              <div className="w-12 h-12 bg-neon-purple/10 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-neon-purple"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2 text-slate-dark">
                Keep Memories
              </h3>
              <p className="text-slate-medium">
                Upload photos and create beautiful scrapbook pages together.
                Your best moments, preserved forever.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-light">
        <p>
          Gelos — Greek god of laughter, joy, and bringing people together.
        </p>
      </footer>
    </div>
  );
}
