import { useNavigate } from "react-router-dom";
import {
  getAuth,
  getDashboardByRole,
} from "../utils/auth";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleBack = () => {
    if (auth) {
      navigate(getDashboardByRole(auth.user.role));
      return;
    }
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-border">
          {/* Decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />
          
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-100/30 blur-3xl" />

          <div className="relative p-8 sm:p-12">
            {/* 404 Number with Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <span className="text-[120px] sm:text-[160px] font-extrabold leading-none tracking-tight bg-gradient-to-r from-primary-500 via-primary-600 to-purple-600 bg-clip-text text-transparent select-none">
                  404
                </span>
                <div className="absolute -top-2 -right-2 animate-pulse">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-700 border border-primary-200">
                    <span className="h-2 w-2 rounded-full bg-primary-500 animate-ping" />
                    Error
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main">
                Oops! Page Not Found
              </h1>
              
              <p className="text-base text-text-secondary max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved. 
                Let's get you back on track.
              </p>

              {/* Decorative illustration */}
              <div className="flex justify-center my-6">
                <div className="relative">
                  <svg 
                    viewBox="0 0 200 120" 
                    className="w-48 sm:w-56 h-auto"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background circles */}
                    <circle cx="60" cy="60" r="50" fill="#EEF2FF" className="opacity-50" />
                    <circle cx="140" cy="60" r="50" fill="#F3E8FF" className="opacity-50" />
                    
                    {/* Icon */}
                    <circle cx="100" cy="55" r="25" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
                    <path 
                      d="M85 55L95 65L115 45" 
                      stroke="#6366F1" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M100 80V90M85 85H115" 
                      stroke="#6366F1" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                    <circle cx="95" cy="50" r="2" fill="#6366F1" />
                    <circle cx="105" cy="50" r="2" fill="#6366F1" />
                    
                    {/* Decorative dots */}
                    <circle cx="30" cy="30" r="3" fill="#818CF8" opacity="0.3" />
                    <circle cx="170" cy="30" r="3" fill="#818CF8" opacity="0.3" />
                    <circle cx="30" cy="90" r="3" fill="#818CF8" opacity="0.3" />
                    <circle cx="170" cy="90" r="3" fill="#818CF8" opacity="0.3" />
                  </svg>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-200 hover:shadow-primary-300 hover:scale-[1.02] active:scale-[0.98] min-w-[160px]"
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    className="h-5 w-5" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Go Back Home
                </button>

                <button
                  type="button"
                  onClick={() => window.location.href = "/"}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-text-main font-semibold rounded-xl transition-all duration-200 border border-border hover:border-primary-300 min-w-[140px]"
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    className="h-5 w-5" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M3 11L12 4l9 7" />
                    <path d="M5 10v10h14V10" />
                    <path d="M9 20v-6h6v6" />
                  </svg>
                  Visit Homepage
                </button>
              </div>

              {/* Helpful links */}
              <div className="pt-6 border-t border-border">
                <p className="text-sm text-text-muted">
                  Need help?{' '}
                  <a 
                    href="/contact" 
                    className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-all"
                  >
                    Contact Support
                  </a>
                  {' '}or{' '}
                  <a 
                    href="/help" 
                    className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-all"
                  >
                    Visit Help Center
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-muted">
            Return to{' '}
            <button
              onClick={() => navigate("/")}
              className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-all"
            >
              FarmStayGo
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}