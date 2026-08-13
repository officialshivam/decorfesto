import { useMemo } from 'react';
import { TIME_SLOTS, getTodayDateString, isTimeSlotPast } from '../utils/dateTimeUtils';

function DateTimeSelector({ date, dateValue, onDateChange, time, selectedTime, onTimeChange, disabled }) {
  const effectiveDate = dateValue !== undefined ? dateValue : (date || '');
  const effectiveTime = selectedTime !== undefined ? selectedTime : (time || '');
  const minDate = useMemo(() => getTodayDateString(), []);
  const isDateSelected = Boolean(effectiveDate);

  const handleDateInput = (event) => {
    const newDate = event.target.value;
    if (typeof onDateChange === 'function') {
      onDateChange(newDate);
    }
    if (effectiveTime && (!newDate || isTimeSlotPast(newDate, effectiveTime))) {
      if (typeof onTimeChange === 'function') {
        onTimeChange('');
      }
    }
  };

  const handleSlotClick = (slotLabel) => {
    if (disabled || !isDateSelected) return;
    if (isTimeSlotPast(effectiveDate, slotLabel)) return;

    if (typeof onTimeChange === 'function') {
      const nextTime = effectiveTime === slotLabel ? '' : slotLabel;
      onTimeChange(nextTime);
    }
  };

  return (
    <div className="card-panel date-time-panel">
      <div className="card-panel__header">
        <h2>Select your celebration details</h2>
        <p>Pick a date and the preferred time slot for your event.</p>
      </div>

      <div className="date-time-grid">
        <label className="search-field">
          <span>Celebration date *</span>
          <input
            type="date"
            value={effectiveDate}
            min={minDate}
            onChange={handleDateInput}
            disabled={disabled}
          />
        </label>

        <div className="time-slot-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="time-slot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--heading)' }}>Arrival Time Slot *</span>
            {!isDateSelected && (
              <span className="time-slot-note warning-text" style={{ fontSize: '0.82rem', color: '#c5221f', fontWeight: '600' }}>
                Please select a date first.
              </span>
            )}
          </div>

          <div className="time-slot-grid">
            {TIME_SLOTS.map((slotObj) => {
              const slot = slotObj.label;
              const isPast = isDateSelected && isTimeSlotPast(effectiveDate, slot);
              const isSelected = isDateSelected && effectiveTime === slot;
              const isDisabled = disabled || !isDateSelected || isPast;

              let slotText = slot;
              if (isPast) {
                slotText = `${slot} — Not Available`;
              }

              return (
                <button
                  key={slot}
                  type="button"
                  className={`time-slot${isSelected ? ' time-slot--active' : ''}${isDisabled ? ' time-slot--disabled' : ''}`}
                  onClick={() => handleSlotClick(slot)}
                  disabled={isDisabled}
                  title={!isDateSelected ? 'Please select a date first' : (isPast ? 'This time slot is not available' : '')}
                >
                  {slotText}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DateTimeSelector;
