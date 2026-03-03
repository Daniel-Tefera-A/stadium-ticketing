import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#666' }}>
        Oops! The page you're looking for doesn't exist.
      </p>
      <button 
        onClick={() => navigate('/')}
        style={{
          padding: '1rem 2rem',
          background: '#ff4d4d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Go to Homepage
      </button>
    </div>
  );
};

export default NotFoundPage;