import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui';
import {
  RoadmapPage,
  PracticePage,
  CompletionPage,
  WelcomePage,
  BenchmarkPage,
  ImportPage,
  FormulaPage,
  ManagePage,
  SettingsPage,
  NotFoundPage,
  ReviewPage,
  StatsPage,
} from './pages';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<RoadmapPage />} />
            <Route path="/roadmap" element={<Navigate to="/" replace />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/completion" element={<CompletionPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/benchmark" element={<BenchmarkPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/formula" element={<FormulaPage />} />
            <Route path="/formulas" element={<FormulaPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/manage" element={<ManagePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </BrowserRouter>
  );
}
