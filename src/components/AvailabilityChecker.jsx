import { useMemo, useState } from 'react';
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

    try {
      const res = await checkAvailabilityOnServer(normalized);
      const available = Boolean(res && (res.available || res.serviceable));
      const message = available
        ? `Service available in ${res.areaName || res.name || normalized}.`
        : (res?.message || `DecorFesto is not available in pincode ${normalized} yet.`);
      const result = { available, message };
      setStatus(result);
      notify(result.available, result.message, normalized);
    } catch {
      const errResult = {
        available: false,
        message: `Unable to verify pincode ${normalized} at the moment. Please try again.`,
      };
      setStatus(errResult);
      notify(false, errResult.message, normalized);
    } finally {
      setIsChecking(false);
    }
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
