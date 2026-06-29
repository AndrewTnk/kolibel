import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthPage } from '../../features/auth/ui/AuthPage'
import { HomePage } from '../../pages/HomePage/HomePage.tsx'
import { VacanciesPage } from '../../pages/VacanciesPage/VacanciesPage.tsx'
import { PersonalPage } from '../../pages/PersonalPage/PersonalPage.tsx'
import { NetworkPage } from '../../pages/NetworkPage/NetworkPage.tsx'
import { ChatPage } from '../../pages/ChatPage/ChatPage.tsx'
import { OnboardingPage } from '../../pages/OnboardingPage/OnboardingPage.tsx'
import { SettingsPage } from '../../pages/SettingsPage/SettingsPage.tsx'
import { MyVacanciesPage } from '../../pages/MyVacanciesPage/MyVacanciesPage.tsx'
import { PublicProfilePage } from '../../pages/PublicProfilePage/PublicProfilePage.tsx'
import { ProtectedRoute } from './ProtectedRoute'
import { RootLayout } from './RootLayout'
import { AdminRoute, RequireAdmin } from '../../features/admin/ui/AdminRoute'
import { AdminLayout } from '../../features/admin/ui/AdminLayout'
import { DashboardPage } from '../../pages/admin/DashboardPage'
import { UsersPage } from '../../pages/admin/UsersPage'
import { CompaniesPage } from '../../pages/admin/CompaniesPage'
import { VacanciesPage as AdminVacanciesPage } from '../../pages/admin/VacanciesPage'
import { ContentPage } from '../../pages/admin/ContentPage'
import { ReportsPage } from '../../pages/admin/ReportsPage'
import { AnalyticsPage } from '../../pages/admin/AnalyticsPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/vacancies',
    element: (
      <ProtectedRoute>
        <VacanciesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-vacancies',
    element: (
      <ProtectedRoute>
        <MyVacanciesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <PersonalPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <OnboardingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/network',
    element: (
      <ProtectedRoute>
        <NetworkPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/u/:id',
    element: (
      <ProtectedRoute>
        <PublicProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'vacancies', element: <AdminVacanciesPage /> },
      { path: 'content', element: <ContentPage /> },
      { path: 'reports', element: <ReportsPage /> },
      {
        path: 'analytics',
        element: (
          <RequireAdmin>
            <AnalyticsPage />
          </RequireAdmin>
        ),
      },
    ],
  },
])

