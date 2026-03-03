import React, { useState, useEffect } from 'react';
import './SeatManager.css';

const SeatManager = ({ eventId, eventName, onClose }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorForm, setGeneratorForm] = useState({
    sections: [
      { name: 'VIP', rows: 5, seatsPerRow: 8, price: 150 },
      { name: 'Regular', rows: 10, seatsPerRow: 12, price: 75 },
      { name: 'Economy', rows: 8, seatsPerRow: 10, price: 40 }
    ]
  });

  useEffect(() => {
    loadSeats();
  }, [eventId]);

  const loadSeats = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/seats/event/${eventId}`);
      const data = await response.json();
      setSeats(data);
      
      const sectionMap = {};
      data.forEach(seat => {
        if (!sectionMap[seat.section]) {
          sectionMap[seat.section] = {
            name: seat.section,
            totalSeats: 0,
            bookedSeats: 0,
            availableSeats: 0,
            heldSeats: 0,
            totalRevenue: 0,
            minPrice: seat.price,
            maxPrice: seat.price
          };
        }
        
        sectionMap[seat.section].totalSeats++;
        if (seat.status === 'booked') {
          sectionMap[seat.section].bookedSeats++;
          sectionMap[seat.section].totalRevenue += seat.price;
        } else if (seat.status === 'held') {
          sectionMap[seat.section].heldSeats++;
        } else {
          sectionMap[seat.section].availableSeats++;
        }
        
        sectionMap[seat.section].minPrice = Math.min(sectionMap[seat.section].minPrice, seat.price);
        sectionMap[seat.section].maxPrice = Math.max(sectionMap[seat.section].maxPrice, seat.price);
      });
      
      setSections(Object.values(sectionMap));
    } catch (error) {
      console.error('Failed to load seats:', error);
      alert('Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  const generateSeats = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/seats/generate/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: generatorForm.sections })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ Seats generated successfully! Total: ${data.totalSeats} seats`);
        loadSeats();
        setShowGenerator(false);
      } else {
        alert(data.error || 'Failed to generate seats');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate seats');
    }
  };

  const updateSeatPrice = async (seatId, newPrice) => {
    try {
      const response = await fetch(`http://localhost:3000/api/seats/${seatId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) })
      });
      
      if (response.ok) {
        loadSeats();
      } else {
        alert('Failed to update price');
      }
    } catch (error) {
      alert('Failed to update price');
    }
  };

  const updateSectionPrice = async (section, newPrice) => {
    if (!window.confirm(`Update all prices in ${section} to $${newPrice}?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/seats/event/${eventId}/section/${section}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) })
      });
      
      if (response.ok) {
        alert(`✅ ${section} prices updated`);
        loadSeats();
      } else {
        alert('Failed to update section prices');
      }
    } catch (error) {
      alert('Failed to update section prices');
    }
  };

  const addSection = () => {
    setGeneratorForm(prev => ({
      ...prev,
      sections: [...prev.sections, { name: '', rows: 5, seatsPerRow: 8, price: 50 }]
    }));
  };

  const removeSection = (index) => {
    setGeneratorForm(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const updateSection = (index, field, value) => {
    setGeneratorForm(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, [field]: field === 'name' ? value : parseFloat(value) || value } : section
      )
    }));
  };

  if (loading) return <div className="seat-manager-loading">Loading seat data...</div>;

  return (
    <div className="seat-manager-modal">
      <div className="seat-manager">
        <div className="manager-header">
          <h2>Seat Management - {eventName}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        {seats.length === 0 ? (
          <div className="no-seats">
            <p>No seats configured for this event.</p>
            <button onClick={() => setShowGenerator(true)} className="generate-btn">
              Generate Seats
            </button>
          </div>
        ) : (
          <>
            <div className="sections-overview">
              <h3>Sections Overview</h3>
              <div className="section-cards">
                {sections.map(section => (
                  <div key={section.name} className="section-card">
                    <h4>{section.name}</h4>
                    <div className="section-stats">
                      <div>Total: {section.totalSeats}</div>
                      <div>📘 Available: {section.availableSeats}</div>
                      <div>📙 Held: {section.heldSeats}</div>
                      <div>📕 Booked: {section.bookedSeats}</div>
                      <div>💰 Price: ${section.minPrice} - ${section.maxPrice}</div>
                      <div>💵 Revenue: ${section.totalRevenue}</div>
                    </div>
                    <div className="section-actions">
                      <input
                        type="number"
                        placeholder="New price"
                        id={`price-${section.name}`}
                        min="0"
                        step="0.01"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`price-${section.name}`);
                          if (input.value) {
                            updateSectionPrice(section.name, input.value);
                            input.value = '';
                          }
                        }}
                        className="update-section-btn"
                      >
                        Update All
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="seat-list">
              <h3>Seat Details</h3>
              <div className="seat-table-container">
                <table className="seat-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Row</th>
                      <th>Seat</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seats.map(seat => (
                      <tr key={seat.id}>
                        <td>{seat.section}</td>
                        <td>{seat.row_number}</td>
                        <td>{seat.seat_number}</td>
                        <td>
                          <input
                            type="number"
                            defaultValue={seat.price}
                            onBlur={(e) => updateSeatPrice(seat.id, e.target.value)}
                            min="0"
                            step="0.01"
                            className="price-input"
                          />
                        </td>
                        <td>
                          <span className={`status-badge ${seat.status}`}>
                            {seat.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={() => setShowGenerator(true)} className="generate-btn">
              Regenerate Seats
            </button>
          </>
        )}

        {showGenerator && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Generate Seat Layout</h3>
              <p className="modal-warning">⚠️ This will replace all existing seats!</p>
              
              {generatorForm.sections.map((section, index) => (
                <div key={index} className="section-form">
                  <h4>Section {index + 1}</h4>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Section Name"
                      value={section.name}
                      onChange={(e) => updateSection(index, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Rows"
                      value={section.rows}
                      onChange={(e) => updateSection(index, 'rows', e.target.value)}
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Seats per Row"
                      value={section.seatsPerRow}
                      onChange={(e) => updateSection(index, 'seatsPerRow', e.target.value)}
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Price $"
                      value={section.price}
                      onChange={(e) => updateSection(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                    {generatorForm.sections.length > 1 && (
                      <button onClick={() => removeSection(index)} className="remove-btn">Remove</button>
                    )}
                  </div>
                </div>
              ))}

              <button onClick={addSection} className="add-section-btn">
                + Add Section
              </button>

              <div className="modal-actions">
                <button onClick={generateSeats} className="confirm-btn">
                  Generate
                </button>
                <button onClick={() => setShowGenerator(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatManager;