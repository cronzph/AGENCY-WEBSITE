import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '../../firebase/config';
import { getAdminByUsername } from '../../firebase/adminUsers';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const navigate = useNavigate();

  const getFriendlyError = (errorCode) => {
    const errorMap = {
      'auth/invalid-credential': 'Wrong password. Please try again.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Wrong password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Check your internet connection.',
      'auth/user-disabled': 'This account has been disabled. Contact admin.',
    };
    return errorMap[errorCode] || 'Login failed. Please try again.';
  };

  const getForgotError = (errorCode) => {
    const errorMap = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many requests. Try again later.',
    };
    return errorMap[errorCode] || 'Failed to send reset link. Try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let emailToUse = identifier;

      // Check if identifier is a username (no @ symbol)
      if (!identifier.includes('@')) {
        console.log("Attempting username login for:", identifier);
        const admin = await getAdminByUsername(identifier);
        console.log("Admin data returned:", admin);
        if (!admin) {
          console.log("Username not found in Firestore");
          setError('Username not found');
          setIsLoading(false);
          return;
        }
        console.log("Attempting login with email:", admin.email);
        emailToUse = admin.email;
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
      navigate('/admin');
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email.');
      return;
    }

    setForgotLoading(true);

    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(getForgotError(err.code));
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-8">
            Admin Login
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-300 mb-2">
                Username or Email
              </label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={handleIdentifierChange}
                required
                className="w-full px-4 py-3 glass-input rounded-xl text-white placeholder-gray-400 focus:outline-none"
                placeholder="Enter your username or email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-4 py-3 pr-12 glass-input rounded-xl text-white placeholder-gray-400 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600/80 hover:bg-blue-500/80 backdrop-blur-sm text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-2">
              Reset Password
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Enter your email address and we'll send you a reset link.
            </p>

            {!forgotSuccess ? (
              <form onSubmit={handleForgotPassword}>
                <div className="mb-4">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    className="w-full px-4 py-3 glass-input rounded-xl text-white placeholder-gray-400 focus:outline-none"
                    placeholder="Enter your email"
                  />
                  {forgotError && (
                    <p className="text-red-400 text-sm mt-1">{forgotError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-blue-600/80 hover:bg-blue-500/80 backdrop-blur-sm text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-2 shadow-lg shadow-blue-500/20"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="text-center">
                <p className="text-green-400 text-sm mb-4">
                  Reset link sent! Check your email.
                </p>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full bg-blue-600/80 hover:bg-blue-500/80 backdrop-blur-sm text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
