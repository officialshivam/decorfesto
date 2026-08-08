import { useMemo, useState } from 'react';
import { getStoredServiceAreas } from '../services/mockServiceAreas';

function AvailabilityChecker({ onStatusChange, onPincodeChange }) {
  const [pincode, setPincode] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const checkAvailability = () => {
    const normalized = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(normalized)) {
      setError('Please enter a valid 6-digit pincode.');
      setStatus(null);
      onStatusChange({ available: false, message: 'Please enter a valid 6-digit pincode.' });
      onPincodeChange(normalized);
      return;
    }

    const serviceArea = getStoredServiceAreas().find((area) => area.pincode === normalized);
    const result = serviceArea?.serviceable === true && serviceArea.active === true
      ? { available: true, message: 'Decoration service available at your location.' }
      : { available: false, message: 'Decoration service is not available at your location.' };
    setStatus(result);
    setError('');
    onStatusChange({ available: result.available, message: result.message });
    onPincodeChange(normalized);
  };

  const feedback = useMemo(() => {
    if (!status) {
      return null;
    }

    if (status.available) {
      return <p className="availability success">✓ {status.message}</p>;
    }

    return <p className="availability error">{status.message}</p>;
  }, [status]);

  return (
    <div className="card-panel availability-panel">
      <div className="card-panel__header">
        <h2>Check service availability</h2>
        <p>Confirm your pincode before moving to date and time selection.</p>
      </div>
      <div className="availability-controls">
        <label className="search-field availability-field">
          <span>Pincode</span>
          <input
            value={pincode}
            onChange={(event) => setPincode(event.target.value)}
            placeholder="Enter your pincode"
            inputMode="numeric"
          />
        </label>
        <button type="button" className="button" onClick={checkAvailability}>
          Check Availability
        </button>
      </div>
      {error ? <p className="availability error">{error}</p> : null}
      {feedback}
    </div>
  );
}

export default AvailabilityChecker;
