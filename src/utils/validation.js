export const validateEvent = (eventData) => {
  const errors = {};

  if (!eventData.name || eventData.name.trim() === '') {
    errors.name = 'Event name is required';
  } else if (eventData.name.length < 3) {
    errors.name = 'Event name must be at least 3 characters';
  }

  if (!eventData.date) {
    errors.date = 'Date and time are required';
  } else {
    const eventDate = new Date(eventData.date);
    const now = new Date();
    if (eventDate < now) {
      errors.date = 'Event date must be in the future';
    }
  }

  if (eventData.base_price < 0) {
    errors.base_price = 'Price cannot be negative';
  }

  return errors;
};