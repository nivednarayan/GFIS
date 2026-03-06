import React from 'react';
import { Navigate, NavLink, Route, Routes, BrowserRouter, useNavigate } from 'react-router-dom';
import Landing from '../pages/public/Landing';
import Login from '../pages/public/Login';
import Signup from '../pages/public/Signup';
import Outcomes from '../pages/public/Outcomes';
import CitizenDashboard from '../pages/citizen/Dashboard';
import Apply from '../pages/citizen/Apply';
import Status from '../pages/citizen/Status';
import SchemeAssist from '../pages/citizen/SchemeAssist';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

function AppContent() {
	const { isAuthenticated, user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	return (
		<div className="app-shell">
			<header className="app-header">
				<div className="header-logo">
					<img src={logo} alt="GFIS Logo" />
					<h1>GFIS</h1>
				</div>
				<nav className="app-nav">
					{!isAuthenticated ? (
						<>
							<NavLink to="/">Home</NavLink>
							<NavLink to="/outcomes">Outcomes</NavLink>
							<NavLink to="/login">Login</NavLink>
							<NavLink to="/signup">Sign Up</NavLink>
						</>
					) : (
						<>
							<NavLink to="/citizen">Dashboard</NavLink>
							<NavLink to="/outcomes">Outcomes</NavLink>
							<span className="user-info">
								{user?.fullName && `Welcome, ${user.fullName.split(' ')[0]}`}
							</span>
							<button onClick={handleLogout} className="logout-btn">Logout</button>
						</>
					)}
				</nav>
			</header>

			<main className="app-main">
				<Routes>
					<Route path="/" element={<Landing />} />
					<Route path="/outcomes" element={<Outcomes />} />
					<Route path="/login" element={<Login />} />
					<Route path="/signup" element={<Signup />} />

						<Route
							path="/citizen"
							element={
								<ProtectedRoute>
									<CitizenDashboard />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/citizen/apply"
							element={
								<ProtectedRoute>
									<Apply />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/citizen/apply/:schemeId"
							element={
								<ProtectedRoute>
									<SchemeAssist />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/citizen/status"
							element={
								<ProtectedRoute>
									<Status />
								</ProtectedRoute>
							}
						/>

						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</main>
			</div>
	);
}

function AppRoutes() {
	return (
		<BrowserRouter>
			<AppContent />
		</BrowserRouter>
	);}

export default AppRoutes;