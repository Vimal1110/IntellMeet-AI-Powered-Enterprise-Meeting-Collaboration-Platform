import { Link } from "react-router-dom";
function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-6">

      <h1 className="text-3xl font-bold text-cyan-400 cursor-pointer">
        IntelliMeet
      </h1>

      <div className="flex items-center gap-8">

        <a
          href="#features"
          className="hover:text-cyan-400 hover:scale-110 transition duration-300 cursor-pointer"
        >
          Features
        </a>

        <a
          href="#about"
          className="hover:text-cyan-400 hover:scale-110 transition duration-300 cursor-pointer"
        >
          About
        </a>

        <a
          href="#pricing"
          className="hover:text-cyan-400 hover:scale-110 transition duration-300 cursor-pointer"
        >
          Pricing
        </a>

        <Link to="/login">
          <button className="bg-cyan-500 hover:bg-cyan-600 px-5 py-2 rounded-lg font-semibold transition duration-300">
            Login
          </button>
        </Link>

      </div>
    </nav>
  );
}

export default Navbar;