import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const seatApi = {
  // Get all seats for an event
  getSeatsForEvent: async (eventId) => {
    try {
      const response = await api.get(`/api/seats/event/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seats:', error);
      throw error;
    }
  },

  // Generate default seats for an event
  generateSeats: async (eventId, sections) => {
    try {
      const response = await api.post(`/api/seats/generate/${eventId}`, { sections });
      return response.data;
    } catch (error) {
      console.error('Error generating seats:', error);
      throw error;
    }
  },

  // Update seat status (hold/release)
  updateSeatStatus: async (seatId, status, heldUntil = null) => {
    try {
      const response = await api.patch(`/api/seats/${seatId}/status`, { status, heldUntil });
      return response.data;
    } catch (error) {
      console.error('Error updating seat status:', error);
      throw error;
    }
  },

  // Update seat price (admin only)
  updateSeatPrice: async (seatId, price) => {
    try {
      const response = await api.patch(`/api/seats/${seatId}/price`, { price });
      return response.data;
    } catch (error) {
      console.error('Error updating seat price:', error);
      throw error;
    }
  }
};