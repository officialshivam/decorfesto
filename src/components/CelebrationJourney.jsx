import { useEffect, useState } from 'react';
import { formatDisplayDate } from '../utils/dateTimeUtils';

function CelebrationTrainSVG() {
  return (
    <div className="celebration-train-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      {/* FLOATING BALLOON CLUSTER */}
      <svg
        width="64"
        height="42"
        viewBox="0 0 64 42"
        style={{
          position: 'absolute',
          top: '-36px',
          left: '10px',
          zIndex: 4,
          animation: 'floatBalloons 3s ease-in-out infinite alternate',
        }}
      >
        {/* Balloon Strings */}
        <path d="M 18 30 Q 24 38 28 42 M 32 30 Q 32 38 28 42 M 46 30 Q 36 38 28 42" stroke="#cbd5e1" strokeWidth="1.2" fill="none" />

        {/* Balloon 1: Terracotta / Rose */}
        <ellipse cx="18" cy="16" rx="9" ry="12" fill="url(#roseGrad)" />
        <polygon points="18,27 16,30 20,30" fill="#be123c" />

        {/* Balloon 2: Warm Gold */}
        <ellipse cx="32" cy="14" rx="10" ry="13" fill="url(#goldGrad)" />
        <polygon points="32,26 30,29 34,29" fill="#d97706" />

        {/* Balloon 3: Champagne / Peach */}
        <ellipse cx="46" cy="17" rx="8" ry="11" fill="url(#peachGrad)" />
        <polygon points="46,27 44,30 48,30" fill="#ea580c" />

        {/* Gradients */}
        <defs>
          <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="peachGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>

      {/* ELEGANT DECORATION TRAIN SVG (Locomotive + 2 Coaches + Wheels) */}
      <svg
        width="114"
        height="38"
        viewBox="0 0 114 38"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Locomotive Body (Terracotta/Gold Theme) */}
        <rect x="72" y="10" width="36" height="20" rx="4" fill="#9f1239" />
        <rect x="76" y="5" width="22" height="12" rx="3" fill="#be123c" />
        {/* Cab Window */}
        <rect x="80" y="7" width="8" height="7" rx="1.5" fill="#fef3c7" />
        {/* Smokestack & Heart Puff */}
        <rect x="100" y="3" width="4" height="8" fill="#d97706" />
        <circle cx="102" cy="0" r="2.5" fill="#fecdd3" opacity="0.8" />

        {/* Couplers */}
        <rect x="66" y="22" width="8" height="2" fill="#64748b" />
        <rect x="34" y="22" width="8" height="2" fill="#64748b" />

        {/* Coach 1 (Decor & Gift Box) */}
        <rect x="38" y="14" width="28" height="16" rx="3" fill="#d97706" />
        <rect x="42" y="17" width="20" height="10" rx="2" fill="#fef3c7" opacity="0.6" />
        <line x1="52" y1="14" x2="52" y2="30" stroke="#be123c" strokeWidth="2" />

        {/* Coach 2 (Balloon Carrier) */}
        <rect x="8" y="16" width="28" height="14" rx="3" fill="#be123c" />
        <rect x="12" y="19" width="20" height="8" rx="2" fill="#ffe4e6" opacity="0.6" />

        {/* WHEELS */}
        <g>
          <circle cx="16" cy="30" r="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="28" cy="30" r="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="46" cy="30" r="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="58" cy="30" r="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="80" cy="30" r="5" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="98" cy="30" r="5" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

export default function CelebrationJourney({ order }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!order) return null;

  const bookingStatus = String(order.bookingStatus || 'CREATED').toUpperCase();
  const paymentStatus = String(order.paymentStatus || 'PENDING').toUpperCase();

  const isPaid = paymentStatus.includes('PAID') || paymentStatus.includes('SUCCESS');
  const isApproved = ['APPROVED', 'VENDOR_ASSIGNED', 'VENDOR_ACCEPTED', 'IN_PROGRESS', 'READY_FOR_SETUP', 'COMPLETED'].includes(bookingStatus);
  const isVendorAssigned = Boolean(order.vendorId) || ['VENDOR_ASSIGNED', 'VENDOR_ACCEPTED', 'IN_PROGRESS', 'READY_FOR_SETUP', 'COMPLETED'].includes(bookingStatus);
  const isPreparation = ['VENDOR_ACCEPTED', 'IN_PROGRESS', 'READY_FOR_SETUP', 'COMPLETED'].includes(bookingStatus);
  const isReady = ['READY_FOR_SETUP', 'COMPLETED'].includes(bookingStatus);
  const isCompleted = bookingStatus === 'COMPLETED';
  const isCancelled = ['CANCELLED', 'REJECTED'].includes(bookingStatus);

  // Authoritative Date, Time & Venue extraction from real database order fields
  const firstItem = order.items?.[0] || {};
  const rawDate =
    order.scheduledDate ||
    order.eventDate ||
    order.date ||
    order.event_date ||
    firstItem.scheduledDate ||
    firstItem.eventDate ||
    firstItem.date ||
    firstItem.event_date;

  const rawTime =
    order.scheduledTime ||
    order.timeSlot ||
    order.time ||
    order.time_slot ||
    firstItem.scheduledTime ||
    firstItem.timeSlot ||
    firstItem.time ||
    firstItem.time_slot;
  const deliveryAddress = order.deliveryAddress || order.address || order.items?.[0]?.address || '';
  const pincode = order.pincode || order.items?.[0]?.pincode || '';

  const eventDateText = rawDate ? formatDisplayDate(rawDate) : 'Event date not scheduled yet';
  const eventTimeText = rawTime ? String(rawTime).trim() : 'Time slot not scheduled yet';

  // Determine current active milestone index (0 to 6)
  let currentIndex = 0;
  if (isCompleted) {
    currentIndex = 6;
  } else if (isReady) {
    currentIndex = 5;
  } else if (isPreparation) {
    currentIndex = 4;
  } else if (isVendorAssigned) {
    currentIndex = 3;
  } else if (isApproved) {
    currentIndex = 2;
  } else if (isPaid) {
    currentIndex = 1;
  } else {
    currentIndex = 0;
  }

  const milestones = [
    {
      title: 'Booking Placed',
      shortTitle: 'Booking',
      desc: 'Your booking has been received.',
      icon: '✦',
      explanation: 'Your booking has been registered with DecorFesto.',
      nextText: 'Payment Confirmation',
    },
    {
      title: 'Payment Confirmed',
      shortTitle: 'Payment',
      desc: 'Payment successfully received.',
      icon: '✓',
      explanation: 'Payment confirmed. Our team is initializing your order.',
      nextText: 'Admin Approval & Plan Review',
    },
    {
      title: 'Booking Approved',
      shortTitle: 'Approval',
      desc: 'Celebration plan approved.',
      icon: '❀',
      explanation: 'Celebration setup plan verified by DecorFesto Admin.',
      nextText: 'Vendor Partner Assignment',
    },
    {
      title: 'Vendor Assigned',
      shortTitle: 'Vendor',
      desc: 'Decoration partner assigned.',
      icon: '♡',
      explanation: `Assigned to ${order.vendorName || 'your professional decorator'}.`,
      nextText: 'Decoration Setup',
    },
    {
      title: 'Decoration',
      shortTitle: 'Decoration',
      desc: 'Setup being prepared.',
      icon: '🎨',
      explanation: 'Decorators are crafting and arranging your balloons & props.',
      nextText: `Event Day Setup (${eventDateText} • ${eventTimeText})`,
    },
    {
      title: 'Event Day Setup',
      shortTitle: 'Event Day',
      desc: `${eventDateText} • ${eventTimeText}`,
      icon: '✦',
      explanation: 'Decorator team is arriving at your venue for setup.',
      nextText: 'Celebration Completion',
    },
    {
      title: 'Celebration Complete',
      shortTitle: 'Celebration',
      desc: 'Your decoration journey is complete!',
      icon: '✨',
      explanation: 'Your decoration setup is fully ready!',
      nextText: null,
    },
  ];

  if (isCancelled) {
    return (
      <div style={{
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '16px',
        padding: '20px',
        marginTop: '20px',
        color: '#9f1239',
      }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>⚠️ Booking Cancelled</h4>
        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#be123c' }}>
          This celebration booking has been cancelled. If you have any questions, please contact DecorFesto customer support.
        </p>
      </div>
    );
  }

  const currentMilestone = milestones[currentIndex];

  // Train position calculation (0% to 100% on desktop, vertical offset on mobile)
  const trainLeftPercent = (currentIndex / (milestones.length - 1)) * 100;
  const trainTopPx = currentIndex * 64;

  return (
    <div className="celebration-journey-container" style={{
      background: 'linear-gradient(180deg, #faf8f5 0%, #f7f3ed 100%)',
      border: '1px solid #eae2d6',
      borderRadius: '20px',
      padding: '24px',
      marginTop: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      overflow: 'hidden',
    }}>
      {/* KEYFRAME ANIMATIONS STYLES */}
      <style>{`
        @keyframes floatBalloons {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-5px) rotate(3deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .celebration-train-wrapper, .journey-train-container {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* SECTION HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', borderBottom: '1px stroke #e5dace', paddingBottom: '14px' }}>
        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#d97706', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            🚂 Your Celebration Journey
          </span>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
            Decoration Express Progress Tracker
          </h3>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#991b1b', background: '#fef2f2', padding: '6px 14px', borderRadius: '20px', border: '1px solid #fecdd3' }}>
          ● {isCompleted ? 'Celebration Completed' : currentMilestone.title}
        </div>
      </div>

      {/* CURRENT STEP EMPHASIS CALLOUT WITH TRAIN BADGE */}
      {!isCompleted && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #fecdd3',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '28px',
          boxShadow: '0 4px 12px rgba(225, 29, 72, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🚂</span>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#be123c', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              CURRENT JOURNEY — YOUR DECORATION IS CURRENTLY HERE
            </span>
          </div>

          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
            {currentMilestone.title}
          </h4>

          <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.4' }}>
            {currentMilestone.explanation}
          </p>

          {currentMilestone.nextText && (
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#d97706', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>↓ NEXT UP:</span>
              <span>{currentMilestone.nextText}</span>
            </div>
          )}
        </div>
      )}

      {/* DESKTOP HORIZONTAL TRAIN TRACK (Shown on Desktop >= 768px) */}
      {!isMobile && (
        <div className="desktop-train-track-container" style={{ position: 'relative', marginTop: '50px', marginBottom: '30px', padding: '0 20px' }}>
          {/* TRACK BACKGROUND LINE */}
          <div style={{
            position: 'absolute',
            left: '30px',
            right: '30px',
            top: '24px',
            height: '6px',
            background: '#e2d9cd',
            borderRadius: '3px',
            zIndex: 1,
          }} />

          {/* COMPLETED TRACK LINE */}
          <div style={{
            position: 'absolute',
            left: '30px',
            width: `calc(${(currentIndex / (milestones.length - 1)) * 100}% - 60px)`,
            top: '24px',
            height: '6px',
            background: 'linear-gradient(90deg, #16a34a 0%, #e11d48 100%)',
            borderRadius: '3px',
            zIndex: 2,
            transition: 'width 700ms ease-in-out',
          }} />

          {/* DYNAMIC CELEBRATION TRAIN ON TRACK */}
          <div
            className="journey-train-container"
            style={{
              position: 'absolute',
              left: `calc(${trainLeftPercent}% - 55px)`,
              top: '-34px',
              zIndex: 10,
              transition: 'left 700ms ease-in-out',
              pointerEvents: 'none',
            }}
          >
            <CelebrationTrainSVG />
          </div>

          {/* MILESTONE NODES ALONG TRACK */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
            {milestones.map((m, idx) => {
              const isDone = idx < currentIndex || isCompleted;
              const isCurrent = idx === currentIndex && !isCompleted;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px', textAlign: 'center' }}>
                  <div style={{
                    width: isCurrent ? '34px' : '28px',
                    height: isCurrent ? '34px' : '28px',
                    borderRadius: '50%',
                    background: isDone ? '#16a34a' : isCurrent ? '#be123c' : '#ffffff',
                    border: isDone || isCurrent ? 'none' : '2px solid #cbd5e1',
                    boxShadow: isCurrent ? '0 0 0 5px rgba(225, 29, 72, 0.2)' : 'none',
                    color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    transition: 'all 300ms ease',
                    marginBottom: '8px',
                  }}>
                    {isDone ? '✓' : m.icon}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: isCurrent || isDone ? '800' : '600',
                    color: isCurrent ? '#be123c' : isDone ? '#0f172a' : '#64748b',
                    lineHeight: '1.2',
                  }}>
                    {m.shortTitle}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MOBILE VERTICAL TRAIN TRACK (Shown on Mobile < 768px) */}
      {isMobile && (
        <div className="mobile-train-track-container" style={{ position: 'relative', paddingLeft: '10px', marginTop: '20px' }}>
          {/* DYNAMIC VERTICAL TRAIN */}
          <div
            className="journey-train-container-mobile"
            style={{
              position: 'absolute',
              left: '42px',
              top: `${trainTopPx - 20}px`,
              zIndex: 10,
              transition: 'top 700ms ease-in-out',
              transform: 'scale(0.85)',
              pointerEvents: 'none',
            }}
          >
            <CelebrationTrainSVG />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
            {milestones.map((m, idx) => {
              const isDone = idx < currentIndex || isCompleted;
              const isCurrent = idx === currentIndex && !isCompleted;

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative' }}>
                  {/* VERTICAL TRACK LINE */}
                  {idx < milestones.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '15px',
                      top: '32px',
                      bottom: '-28px',
                      width: '3px',
                      background: isDone ? '#16a34a' : isCurrent ? '#f43f5e' : '#e2d9cd',
                      zIndex: 1,
                    }} />
                  )}

                  {/* NODE CIRCLE */}
                  <div style={{
                    width: isCurrent ? '32px' : '30px',
                    height: isCurrent ? '32px' : '30px',
                    borderRadius: '50%',
                    background: isDone ? '#16a34a' : isCurrent ? '#be123c' : '#ffffff',
                    border: isDone || isCurrent ? 'none' : '2px solid #cbd5e1',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(225, 29, 72, 0.2)' : 'none',
                    color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    flexShrink: 0,
                    zIndex: 2,
                  }}>
                    {isDone ? '✓' : m.icon}
                  </div>

                  {/* MILESTONE DETAILS */}
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.92rem',
                        fontWeight: isCurrent || isDone ? '800' : '600',
                        color: isCurrent ? '#be123c' : isDone ? '#0f172a' : '#64748b',
                      }}>
                        {m.title}
                      </span>
                      {isDone && (
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '8px' }}>
                          Done
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: isCurrent ? '#334155' : '#64748b' }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DESTINATION CARD: EVENT DAY & VENUE */}
      <div style={{
        background: isCompleted ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
        border: isCompleted ? '1px solid #bbf7d0' : '1px solid #fecdd3',
        padding: '20px',
        borderRadius: '16px',
        marginTop: '28px',
      }}>
        <h4 style={{ margin: 0, color: isCompleted ? '#166534' : '#be123c', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCompleted ? '✨ CELEBRATION COMPLETE' : '✦ EVENT DAY DESTINATION'}
        </h4>

        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '800', marginTop: '8px' }}>
          📅 {eventDateText} • {eventTimeText}
        </div>

        {deliveryAddress ? (
          <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: '6px', fontWeight: '600' }}>
            📍 Venue: {deliveryAddress} {pincode ? `(${pincode})` : ''}
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
            📍 Venue address provided on order record
          </div>
        )}

        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: isCompleted ? '#15803d' : '#9f1239' }}>
          {isCompleted
            ? 'Your decoration journey is complete. Thank you for celebrating with DecorFesto!'
            : 'Our decoration setup team will arrive at your venue prior to the event time slot.'}
        </p>
      </div>
    </div>
  );
}
