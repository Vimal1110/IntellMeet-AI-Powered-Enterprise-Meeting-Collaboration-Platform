function FeatureCard({ title, description, icon }) {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl hover:scale-105 transition duration-300 shadow-lg border border-slate-800">

      <div className="text-4xl mb-4">
        {icon}
      </div>

      <h3 className="text-2xl font-bold text-white mb-3">
        {title}
      </h3>

      <p className="text-gray-400">
        {description}
      </p>

    </div>
  );
}

export default FeatureCard;