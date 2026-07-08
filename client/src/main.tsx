import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './store/auth';
import { NotificationsProvider } from './store/notifications';
import { ThemeProvider } from './store/theme';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                className: '!bg-gray-900 !text-white dark:!bg-gray-100 dark:!text-gray-900',
                style: {
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 16px',
                },
                success: { iconTheme: { primary: '#6366F1', secondary: '#fff' } },
              }}
            />
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
