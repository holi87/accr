import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/submissions', label: 'Zgłoszenia', icon: '📋' },
  { path: '/admin/form-editor', label: 'Edytor formularza', icon: '📝' },
  { path: '/admin/settings', label: 'Ustawienia', icon: '⚙️' },
  { path: '/admin/users', label: 'Użytkownicy', icon: '👥' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    api
      .get<{ user: { name: string; role: string } }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/admin/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg text-primary">SJSI Panel</h1>
          <p className="text-xs text-gray-500">Portal Akredytacji</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            // Hide admin-only items for operators
            if (!isAdmin && ['form-editor', 'settings', 'users'].some((s) => item.path.includes(s))) {
              return null;
            }
            const active = location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-gray-500 mb-2">{user.role}</p>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
