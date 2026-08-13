import { useMemo, useState } from 'react';
import { findServiceAreaByPincode } from '../services/mockServiceAreas';
import { checkAvailabilityOnServer } from '../services/serviceAreaApi';

function AvailabilityChecker({ value, onChange, onStatusChange, onPincodeChange }) {
  const [pincode, setPincode] = useState(() => value?.pincode || '');
  const [status, setStatus] = useState(() => (value?.pincode ? value : null));
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const notify = (available, message, code) => {
    if (onChange) onChange({ available, pincode: code, message });
    if (onStatusChange) onStatusChange({ available, message });
    if (onPincodeChange) onPincodeChange(code);
  };

  const checkAvailability = async () => {
    const normalized = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(normalized)) {
      const errMessage = 'Please enter a valid 6-digit Indian pincode.';
      setError(errMessage);
      setStatus(null);
      notify(false, errMessage, normalized);
      return;
    }

    setError('');
    setIsChecking(true);

    let result;

    try {
      const serverResponse = await checkAvailabilityOnServer(normalized);
      if (serverResponse && typeof serverResponse.available === 'boolean') {
        result = {
          available: serverResponse.available,
          message: serverResponse.message || (serverResponse.available
            ? '✓ Decoration service available at your location.'
            : '✕ Decoration service is currently unavailable at your location.'),
        };
      }
    } catch {
      // Local fallback repository mode
    }

    if (!result) {
      const serviceArea = findServiceAreaByPincode(normalized);
      if (!serviceArea) {
        result = {
          available: false,
          message: '✕ We currently do not provide decoration services in this pincode.',
        };
      } else if (serviceArea.serviceable === true) {
        result = {
          available: true,
          message: '✓ Decoration service available at your location.',
        };
      } else {
        result = {
          available: false,
          message: '✕ Decoration service is currently unavailable at your location.',
        };
      }
    }

    setStatus(result);
    setIsChecking(false);
    notify(result.available, result.message, normalized);
  };

  const feedback = useMemo(() => {
    if (!status) {
      return null;
    }

    if (status.available) {
      return <p className="availability success">{status.message}</p>;
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
            onChange={(event) => {
              setPincode(event.target.value);
              setStatus(null);
              setError('');
            }}
            placeholder="e.g. 110032"
            inputMode="numeric"
            maxLength={6}
          />
        </label>
        <button type="button" className="button" onClick={checkAvailability} disabled={isChecking}>
          {isChecking ? 'Checking…' : 'Check Availability'}
        </button>
      </div>
      {error ? <p className="availability error">{error}</p> : null}
      {feedback}
    </div>
  );
}

export default AvailabilityChecker;
