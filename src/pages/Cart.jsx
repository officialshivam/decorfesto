import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartItem from '../components/CartItem';
import AddAddressDrawer from '../components/AddAddressDrawer';
import PriceSummaryBreakup from '../components/PriceSummaryBreakup';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchEnabledChargesApi } from '../services/chargeService';
import { updateCustomerProfileApi } from '../services/customerAuthService';
import { checkPincodeServiceability } from '../services/mockServiceAreas';

function Cart() {
  const navigate = useNavigate();
  const { items } = useCart();
  const { user, updateProfile } = useAuth();

  const [enabledCharges, setEnabledCharges] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Address state derived from authenticated user profile or local session
  const [selectedAddress, setSelectedAddress] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCharges() {
      try {
        const data = await fetchEnabledChargesApi();
        if (isMounted) {
          setEnabledCharges(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) console.error('Error fetching charges for cart:', err);
      }
    }
    loadCharges();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync address from user profile
  useEffect(() => {
    if (user?.savedAddressObject || user?.addressDetails) {
      setSelectedAddress(user.savedAddressObject || user.addressDetails);
    } else if (user?.savedAddress || user?.address) {
      const fullAddr = user.savedAddress || user.address;
      const pincode = items[0]?.pincode || '';
      setSelectedAddress({
        fullAddress: fullAddr,
        address: fullAddr,
        pincode,
        mobile: user.mobile || user.phone || '',
        addressType: 'Home',
      });
    }
  }, [user, items]);

  const subtotal = items.reduce((sum, item) => {
    const basePrice = item.basePrice || item.price || 0;
    const addOnPrice = item.addOnPrice || 0;
    const itemPrice = typeof item.totalPrice === 'number' && item.totalPrice > 0
      ? item.totalPrice
      : (basePrice + addOnPrice);
    return sum + itemPrice * (item.quantity || 1);
  }, 0);

  const originalSubtotal = items.reduce((sum, item) => {
    const base = item.basePrice || item.price || 0;
    const originalBase = item.originalPrice && item.originalPrice > base
      ? item.originalPrice
      : base;
    return sum + (originalBase + (item.addOnPrice || 0)) * (item.quantity || 1);
  }, 0);

  const totalSavings = originalSubtotal > subtotal ? originalSubtotal - subtotal : 0;

  const handleSaveAddress = async (savedAddrObj) => {
    setIsSavingAddress(true);
    setAddressError('');

    try {
      if (user && user.id) {
        const res = await updateCustomerProfileApi({
          savedAddress: savedAddrObj.fullAddress || savedAddrObj.address,
          savedAddressObject: savedAddrObj,
          pincode: savedAddrObj.pincode,
        });

        if (res.ok && res.user) {
          updateProfile(res.user);
        }
      }

      setSelectedAddress(savedAddrObj);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error('Error saving delivery address:', err);
      setAddressError('Failed to save address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleProceedToCheckout = () => {
    setAddressError('');

    if (!selectedAddress || (!selectedAddress.fullAddress && !selectedAddress.address)) {
      setAddressError('Please add your delivery address to continue.');
      setIsDrawerOpen(true);
      return;
    }

    const pin = (selectedAddress.pincode || items[0]?.pincode || '').replace(/\D/g, '');
    if (!pin || pin.length !== 6) {
      setAddressError('Please provide a valid 6-digit delivery pincode.');
      setIsDrawerOpen(true);
      return;
    }

    const check = checkPincodeServiceability(pin);
    if (!check.isServiceable) {
      setAddressError(check.message || 'Decoration service is unavailable at this delivery pincode.');
      return;
    }

    navigate('/checkout', { state: { deliveryAddress: selectedAddress } });
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">YOUR CART</span>
          <h1>Review your decoration booking</h1>
          <p>Check your package selections, delivery address, and price breakup before proceeding to checkout.</p>
        </div>

        {items.length === 0 ? (
          <div className="empty-state card-panel" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
            <h2>Your cart is empty</h2>
            <p>Add a decoration package to continue your celebration booking journey.</p>
            <Link to="/catalog" className="button" style={{ marginTop: '16px' }}>
              Explore Decorations
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* DELIVERY ADDRESS SECTION */}
              <article className="card-panel" style={{ borderRadius: '16px', padding: '24px', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Delivery Address
                  </h2>
                  {selectedAddress ? (
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => setIsDrawerOpen(true)}
                      style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setIsDrawerOpen(true)}
                      style={{ padding: '6px 16px', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      Add Address
                    </button>
                  )}
                </div>

                {selectedAddress ? (
                  <div style={{ fontSize: '0.92rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{selectedAddress.addressType === 'Office' ? '🏢 Office' : selectedAddress.addressType === 'Other' ? '📍 Other' : '🏠 Home'}</span>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: '600', marginTop: '2px' }}>
                      {selectedAddress.flatNo ? `${selectedAddress.flatNo}, ` : ''}{selectedAddress.fullAddress || selectedAddress.address}
                    </div>
                    {selectedAddress.landmark && (
                      <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                        Landmark: {selectedAddress.landmark}
                      </div>
                    )}
                    <div style={{ color: '#475569', fontWeight: '600' }}>
                      {selectedAddress.city || 'Delhi NCR'}, {selectedAddress.state || 'Delhi'} - {selectedAddress.pincode || items[0]?.pincode}
                    </div>
                    {selectedAddress.mobile && (
                      <div style={{ color: '#0369a1', fontWeight: '600', marginTop: '2px' }}>
                        Mobile: {selectedAddress.mobile}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>📍 No address selected</div>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Add your delivery address to continue with checkout.</p>
                    </div>
                  </div>
                )}

                {addressError && (
                  <div className="admin-error-banner" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    ✕ {addressError}
                  </div>
                )}
              </article>

              {/* CART ITEMS LIST */}
              <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {items.map((item) => (
                  <CartItem key={item.key} item={item} />
                ))}
              </div>
            </div>

            <aside className="card-panel sticky-summary" style={{ borderRadius: '16px', padding: '24px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="card-panel__header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Price Summary</h2>
              </div>

              {totalSavings > 0 && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🎉 You're saving ₹{totalSavings.toLocaleString('en-IN')} on this booking!
                </div>
              )}

              <PriceSummaryBreakup
                items={items}
                enabledCharges={enabledCharges}
                totalSavings={totalSavings}
                originalSubtotal={originalSubtotal}
              />

              <p className="summary-note" style={{ fontSize: '0.82rem', color: '#64748b', margin: '16px 0' }}>
                Your celebration date & slot are reserved upon completing checkout.
              </p>

              <button
                type="button"
                className="button button--full"
                onClick={handleProceedToCheckout}
                style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: '700' }}
              >
                Proceed to Checkout →
              </button>
            </aside>
          </div>
        )}

        {/* ADD / EDIT ADDRESS DRAWER */}
        <AddAddressDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          initialData={selectedAddress || { pincode: items[0]?.pincode || '' }}
          registeredMobile={user?.mobile || user?.phone || ''}
          onSaveAddress={handleSaveAddress}
          isSaving={isSavingAddress}
        />
      </section>
    </main>
  );
}

export default Cart;
