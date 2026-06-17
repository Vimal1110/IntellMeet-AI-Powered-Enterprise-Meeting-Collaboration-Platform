import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun } from "react-icons/fa";
import { useTranslation } from "react-i18next";

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  return (
    <nav className="flex flex-col md:flex-row justify-between items-center px-4 md:px-8 py-6 gap-4">

      <h1 className="text-3xl font-bold text-cyan-400 cursor-pointer">
        IntelliMeet
      </h1>

      <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">

        <a
          href="#features"
          className="hover:text-cyan-400 hover:scale-110 transition duration-300 cursor-pointer"
        >
          {t("features")}
        </a>

        <a
          href="#about"
          className="hover:text-cyan-400 hover:scale-110 transition duration-300 cursor-pointer"
        >
          {t("about")}
        </a>

        <a
          href="#pricing"
          className="hover:text-cyan-400 hover:scale-110 transition duration-300 cursor-pointer"
        >
          {t("pricing")}
        </a>

        <select
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="bg-slate-800 text-white px-2 py-1 rounded"
        >
          <option value="en">EN</option>
          <option value="hi">HI</option>
        </select>

        <button
          onClick={toggleTheme}
          className="text-xl hover:scale-110 transition"
        >
          {theme === "dark" ? <FaSun /> : <FaMoon />}
        </button>

        <Link to="/login">
          <button className="bg-cyan-500 hover:bg-cyan-600 px-5 py-2 rounded-lg font-semibold transition duration-300">
            {t("login")}
          </button>
        </Link>

      </div>
    </nav>
  );
}

export default Navbar;