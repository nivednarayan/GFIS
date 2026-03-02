import React from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import Landing from '../pages/public/Landing';
import Login from '../pages/public/Login';
import CitizenDashboard from '../pages/citizen/Dashboard';
import Apply from '../pages/citizen/Apply';
import Status from '../pages/citizen/Status';
import SchemeAssist from '../pages/citizen/SchemeAssist';
import OfficerDashboard from '../pages/officer/Dashboard';
import ReviewApplication from '../pages/officer/ReviewApplication';
import Analytics from '../pages/admin/Analytics';
import DistrictHeatmap from '../pages/admin/DistrictHeatmap';

function AppRoutes() {
	return (
		<div className="app-shell">
			<header className="app-header">
				<h1>GFIS Basic Pages</h1>
				<nav className="app-nav">
					<NavLink to="/">Landing</NavLink>
					<NavLink to="/login">Login</NavLink>
					<NavLink to="/citizen">Citizen</NavLink>
					<NavLink to="/officer">Officer</NavLink>
					<NavLink to="/admin">Admin</NavLink>
				</nav>
			</header>

			<main className="app-main">
				<Routes>
					<Route path="/" element={<Landing />} />
					<Route path="/login" element={<Login />} />

					<Route path="/citizen" element={<CitizenDashboard />} />
					<Route path="/citizen/apply" element={<Apply />} />
					<Route path="/citizen/apply/:schemeId" element={<SchemeAssist />} />
					<Route path="/citizen/status" element={<Status />} />

					<Route path="/officer" element={<OfficerDashboard />} />
					<Route path="/officer/review-application" element={<ReviewApplication />} />

					<Route path="/admin" element={<Analytics />} />
					<Route path="/admin/district-heatmap" element={<DistrictHeatmap />} />

					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</main>
		</div>
	);
}

export default AppRoutes;
