import { useMemo } from 'react';

const timeSlots = [
  '10:00 AM – 12:00 PM',
  '12:00 PM – 2:00 PM',
  '2:00 PM – 4:00 PM',
  '4:00 PM – 6:00 PM',
  '6:00 PM – 8:00 PM',
  '8:00 PM – 10:00 PM',
];

function DateTimeSelector({ dateValue, onDateChange, selectedTime, onTimeChange, disabled }) {
  const minDate = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  return (
    <div className="card-panel date-time-panel">
      <div className="card-panel__header">
        <h2>Select your celebration details</h2>
        <p>Pick a date and the preferred time slot for your event.</p>
      </div>

      <div className="date-time-grid">
        <label className="search-field">
          <span>Celebration date</span>
          <input type="date" value={dateValue} min={minDate} onChange={(event) => onDateChange(event.target.value)} disabled={disabled} />
        </label>

        <div className="time-slot-grid">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`time-slot${selectedTime === slot ? ' time-slot--active' : ''}`}
              onClick={() => onTimeChange(slot)}
              disabled={disabled}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DateTimeSelector;
