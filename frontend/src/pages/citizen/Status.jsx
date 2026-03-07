import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

function Status() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetails, setAppDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/applications`);
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.data || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const fetchApplicationDetails = async (applicationId) => {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch application details');
      }

      const data = await response.json();
      setAppDetails(data.data);
      setSelectedApp(applicationId);
      setIsLoadingDetails(false);
    } catch (err) {
      console.error('Error fetching application details:', err);
      alert('Failed to load application details: ' + err.message);
      setIsLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedApp(null);
    setAppDetails(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6c757d',
      submitted: '#007bff',
      under_review: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <section className="page">
        <h2>Application Status</h2>
        <p>Loading your applications...</p>
        <div className="page-links">
          <Link to="/citizen">Back to Dashboard</Link>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page">
        <h2>Application Status</h2>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={fetchApplications} style={{ marginTop: '1rem' }}>
          Retry
        </button>
        <div className="page-links">
          <Link to="/citizen">Back to Dashboard</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h2>Application Status</h2>
      <p>Track your submitted applications and their current status.</p>

      {applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <p>No applications found. Start by applying for a scheme!</p>
          <Link to="/citizen/apply" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Apply for Schemes
          </Link>
        </div>
      ) : (
        <div className="application-grid">
          {applications.map((app) => (
            <div
              key={app._id}
              className="application-tile"
              style={{
                border: `2px solid ${getStatusColor(app.status)}`,
                borderRadius: '8px',
                padding: '1.5rem',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => fetchApplicationDetails(app.applicationId)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#333' }}>{app.schemeName}</strong>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                <strong>ID:</strong> {app.applicationId}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    backgroundColor: getStatusColor(app.status),
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {app.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.75rem' }}>
                <div>
                  <strong>Submitted:</strong> {formatDate(app.submittedAt)}
                </div>
                <div>
                  <strong>Created:</strong> {formatDate(app.createdAt)}
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#007bff' }}>
                Click to view details →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Application Details */}
      {selectedApp && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeDetails}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeDetails}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ✕
            </button>

            {isLoadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Loading details...</p>
              </div>
            ) : appDetails ? (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>{appDetails.schemeName}</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Application ID:</strong> {appDetails.applicationId}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Status:</strong>{' '}
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      backgroundColor: getStatusColor(appDetails.status),
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {appDetails.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Submitted:</strong> {formatDate(appDetails.submittedAt)}
                </div>

                {appDetails.groupedUserInputs?.responses && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
                      Submitted Information
                    </h4>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px' }}>
                      {Object.entries(appDetails.groupedUserInputs.responses).map(([key, value]) => (
                        <div
                          key={key}
                          style={{
                            marginBottom: '0.75rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid #dee2e6',
                          }}
                        >
                          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                            {key}
                          </div>
                          <div style={{ fontSize: '1rem', color: '#333', fontWeight: '500' }}>
                            {value || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                      <strong>Total Fields:</strong> {appDetails.groupedUserInputs.totalAnswers || 0}
                    </div>
                  </div>
                )}

                {(!appDetails.groupedUserInputs || !appDetails.groupedUserInputs.responses) && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff3cd', borderRadius: '6px' }}>
                    <p style={{ margin: 0, color: '#856404' }}>
                      No detailed responses found for this application.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Failed to load details</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="page-links" style={{ marginTop: '2rem' }}>
        <Link to="/citizen">Back to Dashboard</Link>
        <Link to="/citizen/apply">Apply for More Schemes</Link>
      </div>

      <style>{`
        .application-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        @media (max-width: 768px) {
          .application-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

export default Status;
