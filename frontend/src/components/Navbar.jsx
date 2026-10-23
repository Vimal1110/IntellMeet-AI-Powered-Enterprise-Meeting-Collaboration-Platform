import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun, FaBars, FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useState } from "react";

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="px-4 md:px-8 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-400 cursor-pointer">
          IntellMeet
        </h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">

          <a
            href="#features"
            className="hover:text-cyan-400 hover:scale-110 transition duration-300"
          >
            {t("features")}
          </a>

          <a
            href="#about"
            className="hover:text-cyan-400 hover:scale-110 transition duration-300"
          >
            {t("about")}
          </a>

          <a
            href="#pricing"
            className="hover:text-cyan-400 hover:scale-110 transition duration-300"
          >
            {t("pricing")}
          </a>
          <select
            value={i18n.language}
            onChange={(e) => {
              localStorage.setItem("i18nextLng", e.target.value);
              i18n.changeLanguage(e.target.value);
            }}
            className={`px-4 py-2 rounded-xl font-semibold border transition-all duration-300 cursor-pointer ${
              theme === "dark"
                ? "bg-slate-800 text-white border-slate-700 hover:border-cyan-400"
                : "bg-gray-100 text-black border-gray-300 hover:border-cyan-500"
            }`}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="hi">🇮🇳 HI</option>
          </select>

          <button
            onClick={toggleTheme}
            className={`text-xl p-2 rounded-xl transition duration-300 ${
              theme === "dark"
                ? "hover:bg-slate-800"
                : "hover:bg-gray-200"
            }`}
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>

          <Link to="/login">
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-xl font-semibold transition duration-300 shadow-md">
              {t("login")}
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden flex flex-col items-center gap-5 mt-6 pb-4">
          <a href="#features" onClick={() => setMenuOpen(false)}>
            {t("features")}
          </a>

          <a href="#about" onClick={() => setMenuOpen(false)}>
            {t("about")}
          </a>

          <a href="#pricing" onClick={() => setMenuOpen(false)}>
            {t("pricing")}
          </a>

          <select
            value={i18n.language}
            onChange={(e) => {
              localStorage.setItem("i18nextLng", e.target.value);
              i18n.changeLanguage(e.target.value);
            }}
            className={`px-4 py-2 rounded-xl font-semibold border transition-all duration-300 cursor-pointer ${
              theme === "dark"
                ? "bg-slate-800 text-white border-slate-700 hover:border-cyan-400"
                : "bg-gray-100 text-black border-gray-300 hover:border-cyan-500"
            }`}
          >
            <option value="en">🇺🇸 EN</option>
            <option value="hi">🇮🇳 HI</option>
          </select>

          <button
            onClick={toggleTheme}
            className={`text-xl p-2 rounded-xl transition duration-300 ${
              theme === "dark"
                ? "hover:bg-slate-800"
                : "hover:bg-gray-200"
            }`}
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>

          <Link to="/login">
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-xl font-semibold transition duration-300 shadow-md">
              {t("login")}
            </button>
          </Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;