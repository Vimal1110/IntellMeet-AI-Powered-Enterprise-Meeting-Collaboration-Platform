import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import hero from "../assets/hero.png";
import FeatureCard from "../components/FeatureCard";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";

function Home() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-slate-950 text-white"
          : "bg-white text-black"
      }`}
    >
      <Navbar />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-32">
        <h1 className="text-4xl md:text-6xl font-bold">
          {t("title")}
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() =>
              navigate("/create-meeting", {
                state: { from: "/" },
              })
            }
            className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-xl font-semibold"
          >
            {t("createMeeting")}
          </button>

          <button
            onClick={() =>
              navigate("/join-meeting", {
                state: { from: "/" },
              })
            }
            className="border border-white px-6 py-3 rounded-xl hover:bg-white hover:text-black transition"
          >
            {t("joinMeeting")}
          </button>
        </div>

        <img
          src={hero}
          alt="AI Meeting"
          className="w-full max-w-[450px] mt-10 rounded-2xl shadow-2xl"
        />
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-8">
        <h2 className="text-5xl font-bold text-center mb-12">
          {t("features")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🎥"
            title="HD Video Meetings"
            description="Host high quality video meetings with crystal clear audio."
          />

          <FeatureCard
            icon="🤖"
            title="AI Summaries"
            description="Get automatic AI generated meeting notes and key points."
          />

          <FeatureCard
            icon="📹"
            title="Meeting Recordings"
            description="Record meetings and watch them anytime later."
          />

          <FeatureCard
            icon="👥"
            title="Team Collaboration"
            description="Collaborate with your team in real time."
          />

          <FeatureCard
            icon="🔒"
            title="Secure Meetings"
            description="End-to-end secure meetings with protected access."
          />

          <FeatureCard
            icon="📅"
            title="Schedule Meetings"
            description="Schedule meetings in advance and manage them easily."
          />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-8 text-center">
        <h2 className="text-4xl font-bold">
          {t("aboutTitle")}
        </h2>

        <p className="mt-6 text-gray-400 max-w-3xl mx-auto">
          IntelliMeet is an AI-powered meeting platform that helps teams
          collaborate effectively through video meetings, automated summaries
          and smart productivity tools.
        </p>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-8 text-center">
        <h2 className="text-5xl font-bold mb-16">
          {t("pricingPlans")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">

          {/* Basic Plan */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700">
            <h3 className="text-3xl font-bold">
              {t("basic")}
            </h3>

            <p className="text-6xl font-bold mt-6">
              {t("free")}
            </p>

            <ul className="mt-8 space-y-4 text-gray-300">
              <li>✓ {t("fiveMeetings")}</li>
              <li>✓ {t("hdVideoCalls")}</li>
              <li>✓ {t("chatSupport")}</li>
            </ul>

            <button
              onClick={() => navigate("/register")}
              className="mt-8 bg-cyan-400 text-black px-6 py-3 rounded-xl w-full font-semibold"
            >
              {t("getStarted")}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-cyan-500 p-8 rounded-3xl scale-105 shadow-2xl relative">

            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-bold">
              {t("mostPopular")}
            </div>

            <h3 className="text-3xl font-bold">
              {t("pro")}
            </h3>

            <p className="text-6xl font-bold mt-6">
              ₹299
              <span className="text-lg">
                {t("month")}
              </span>
            </p>

            <ul className="mt-8 space-y-4">
              <li>✓ {t("unlimitedMeetings")}</li>
              <li>✓ {t("aiSummaries")}</li>
              <li>✓ {t("recordings")}</li>
              <li>✓ {t("teamCollaboration")}</li>
            </ul>

            <button
              onClick={() => navigate("/register")}
              className="mt-8 bg-white text-black px-6 py-3 rounded-xl w-full font-semibold"
            >
              {t("choosePlan")}
            </button>
          </div>

          {/* Enterprise */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700">
            <h3 className="text-3xl font-bold">
              {t("enterprise")}
            </h3>

            <p className="text-6xl font-bold mt-6">
              ₹999
              <span className="text-lg">
                {t("month")}
              </span>
            </p>

            <ul className="mt-8 space-y-4 text-gray-300">
              <li>✓ {t("unlimitedUsers")}</li>
              <li>✓ {t("aiAnalytics")}</li>
              <li>✓ {t("prioritySupport")}</li>
              <li>✓ {t("advancedSecurity")}</li>
            </ul>

            <button
              onClick={() => navigate("/contact")}
              className="mt-8 bg-cyan-400 text-black px-6 py-3 rounded-xl w-full font-semibold"
            >
              {t("contactSales")}
            </button>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
