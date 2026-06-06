import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="min-h-[80vh] flex flex-col justify-center items-center text-center px-6">

      <h1 className="text-6xl font-bold text-white">
        AI Powered
        <span className="text-cyan-400"> Meetings</span>
      </h1>

      <p className="mt-6 text-xl text-gray-400 max-w-2xl">
        Conduct smarter meetings with AI summaries,
        secure video conferencing, meeting recordings
        and seamless team collaboration.
      </p>

      <div className="flex gap-4 mt-10">

        <Link to="/create-meeting">
          <button className="bg-cyan-500 hover:bg-cyan-600 px-8 py-3 rounded-xl font-semibold">
            Create Meeting
          </button>
        </Link>

        <Link to="/join-meeting">
          <button className="border border-cyan-400 px-8 py-3 rounded-xl font-semibold hover:bg-cyan-400 hover:text-black">
            Join Meeting
          </button>
        </Link>

      </div>

      {/* Stats Section */}

      <div className="grid md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl">

        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-4xl font-bold text-cyan-400">500+</h2>
          <p className="text-gray-400 mt-2">Meetings Hosted</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-4xl font-bold text-cyan-400">50+</h2>
          <p className="text-gray-400 mt-2">Active Teams</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-4xl font-bold text-cyan-400">99.9%</h2>
          <p className="text-gray-400 mt-2">Uptime</p>
        </div>

      </div>

    </section>
  );
}

export default Hero;