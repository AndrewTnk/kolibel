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
])

