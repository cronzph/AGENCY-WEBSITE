import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { createAdminUser, isUsernameTaken } from '../../firebase/adminUsers';

const SeedAdmin = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email || '');
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleSeed = async () => {
    setMessage({ type: '', text: '' });

    // Validation
    if (!username.trim()) {
      setMessage({ type: 'error', text: 'Please enter a username' });
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setMessage({ type: 'error', text: 'You must be logged in to seed an admin' });
      return;
    }

    setLoading(true);

    try {
      // Check if username is taken
      const taken = await isUsernameTaken(username);
      if (taken) {
        setMessage({ type: 'error', text: 'Username already taken' });
        setLoading(false);
        return;
      }

      // Create admin user
      await createAdminUser(currentUser.uid, currentUser.email, username);
      setMessage({ type: 'success', text: 'Admin seeded successfully!' });
      setUsername('');
    } catch (error) {
      console.error('Error seeding admin:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Seed Admin User
        </h1>

        <div className="space-y-4">
          {/* Email Input - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              placeholder="Enter email"
            />
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
            />
          </div>

          {/* Seed Button */}
          <button
            onClick={handleSeed}
            disabled={loading || !email}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Seeding...' : 'Seed Admin'}
          </button>

          {/* Message Display */}
          {message.text && (
            <div
              className={`p-3 rounded-md text-center ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Note: Delete this route after seeding is complete.
        </p>
      </div>
    </div>
  );
};

export default SeedAdmin;