import { createContext, useContext, useEffect, useState } from 'react';
import { fetchSiteBrandingApi } from '../services/brandingService';

const BrandingContext = createContext({
  logoUrl: '/uploads/branding/decorfesto-logo.png',
  logoError: false,
  setLogoError: () => {},
});

export function BrandingProvider({ children }) {
  const [logoUrl, setLogoUrl] = useState('/uploads/branding/decorfesto-logo.png');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetchSiteBrandingApi()
      .then((branding) => {
        if (branding?.logo) {
          setLogoUrl(branding.logo);
        }
      })
      .catch(() => {
        // Fallback remains active
      });
  }, []);

  return (
    <BrandingContext.Provider value={{ logoUrl, logoError, setLogoError }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandLogo({ height = 40, alt = 'DecorFesto', className = '', style = {} }) {
  const { logoUrl, logoError, setLogoError } = useBranding();

  if (logoError || !logoUrl) {
    return (
      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'inherit', letterSpacing: '-0.02em', ...style }}>
        DecorFesto
      </strong>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      onError={() => setLogoError(true)}
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: 'auto',
        objectFit: 'contain',
        maxWidth: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
}
