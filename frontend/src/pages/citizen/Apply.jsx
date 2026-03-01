import React from 'react';
import { Link } from 'react-router-dom';
import ayushmanImg from '../../../src/assets/ayushman.png';
import ignoapsImg from '../../../src/assets/ignoaps.jpg';
import nnmsImg from '../../../src/assets/nnms.png';
import pmKisanImg from '../../../src/assets/pm kisan.png';
import pmayImg from '../../../src/assets/PMAY-G-scheme.jpg';

function Apply() {
  const schemes = [
    { id: 1, slug: 'ayushman', name: 'Ayushman Bharat', image: ayushmanImg, category: 'Health' },
    { id: 2, slug: 'pmkisan', name: 'PM Kisan', image: pmKisanImg, category: 'Agriculture' },
    { id: 3, slug: 'pmay', name: 'PMAY-G', image: pmayImg, category: 'Housing' },
    { id: 4, slug: 'pension', name: 'Old Age Pension', image: ignoapsImg, category: 'Pension' },
    { id: 5, slug: 'scholarship', name: 'Scholarship', image: nnmsImg, category: 'Education' },
  ];

  return (
    <section className="page">
      <h2>Select a Scheme to Apply</h2>
      <p>Choose from the available government schemes below</p>
      
      <div className="scheme-grid">
        {schemes.map((scheme) => (
          <Link key={scheme.id} to={`/citizen/apply/${scheme.slug}`} className="scheme-tile-link">
            <div className="scheme-tile">
              <img src={scheme.image} alt={scheme.name} className="scheme-image" />
              <div className="scheme-info">
                <h3>{scheme.name}</h3>
                <span className="scheme-category">{scheme.category}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="page-links" style={{ marginTop: '1.5rem' }}>
        <Link to="/citizen">Back to Dashboard</Link>
      </div>
    </section>
  );
}

export default Apply;
