import React from 'react';
import { useNavigate } from 'react-router';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2">

      {/* Glass Morph Container */}
      <div className="w-full max-w-4xl mt-10 mb-10 backdrop-blur-lg bg-white/30 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50 rounded-xl shadow-2xl overflow-hidden transition-all hover:shadow-emerald-500/10 hover:border-emerald-500/30">
        <div className="p-8 md:p-10">
          <h1 className="text-3xl md:text-5xl text-center font-bold mb-6 text-gray-900 dark:text-white">
            Experience <span className="text-emerald-600 dark:text-emerald-400">Synchronized</span> Music
          </h1>

          <div className="space-y-6 text-gray-700 dark:text-gray-300">
            <p className="text-lg leading-relaxed font-montserrat text-justify">
              Muxic revolutionizes how groups experience music together. Our real-time synchronization technology ensures everyone hears the same beat at exactly the same moment, no matter what device they're using. Whether you're hosting a party, on a road trip, or just relaxing with friends, Muxic creates a shared musical experience like never before.
            </p>

            <p className="text-lg leading-relaxed font-montserrat text-justify">
              Unlike traditional music players, Muxic maintains perfect sync across all connected devices, automatically adjusting for network latency. Our platform works seamlessly with major streaming services while also supporting your personal music library. The result? A perfectly harmonized listening session where everyone stays in the groove together.
            </p>

            <div className="grid md:grid-cols-2 gap-6  font-montserrat">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-emerald-600 dark:text-emerald-400">Key Features:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Precision audio synchronization (±50ms)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Cross-platform compatibility</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Supports upto 15 devices simultaneously</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Intuitive collaborative playlists</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-emerald-600 dark:text-emerald-400">Perfect For:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>House parties and gatherings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Road trips and travel</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Workout sessions with friends</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">✓</span>
                    <span>Virtual listening parties</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-md font-mono bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all text-lg font-semibold shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/10 mt-8 cursor-pointer"
            >
              Try Now - It's Free
            </button>
          </div>
        </div>

        {/* Footer inside the glass container */}
        <div className="border-t border-emerald-300 dark:border-gray-700/50 p-3 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Muxic.in All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;