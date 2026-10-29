import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "../pages/public/Landing";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import { ProtectedRoute } from "./ProtectedRoute";

import StudentLayout from "../pages/student/StudentLayout";
import Dashboard from "../pages/student/Dashboard";
import AIChat from "../pages/student/AIChat";
import Quiz from "../pages/student/Quiz";
import Schedule from "../pages/student/Schedule";
import Progress from "../pages/student/Progress";
import Achievements from "../pages/student/Achievements";
import Career from "../pages/student/Career";
import CareerRoadmap from "../pages/student/CareerRoadmap";
import Universities from "../pages/student/Universities";
import Profile from "../pages/student/Profile";
import Settings from "../pages/student/Settings";

import ParentLayout from "../pages/parent/ParentLayout";
import ParentDashboard from "../pages/parent/ParentDashboard";

import AdminLayout from "../pages/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute allow={["STUDENT"]} />}>
        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/career" element={<Career />} />
          <Route path="/career/:careerCode" element={<CareerRoadmap />} />
          <Route path="/universities" element={<Universities />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["PARENT"]} />}>
        <Route element={<ParentLayout />}>
          <Route path="/parent" element={<ParentDashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
