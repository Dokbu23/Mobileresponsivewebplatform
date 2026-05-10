import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </AppProvider>
  );
}