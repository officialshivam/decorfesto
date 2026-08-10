import { useCallback, useEffect, useRef, useState } from 'react';

function ProductImageGallery({ images = [], productName = 'Decoration Design' }) {
  const imageList = Array.isArray(images) && images.length > 0 ? images : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const galleryRef = useRef(null);

  // Reset slide index when images or product changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  const total = imageList.length;

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToIndex = (index) => {
    if (index >= 0 && index < total) {
      setCurrentIndex(index);
    }
  };

  // Autoplay functionality (4.5s interval, pauses on hover/touch)
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      goToNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [total, isPaused, goToNext]);

  // Touch / Swipe Gestures for Mobile
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const deltaX = touchStartX.current - touchEndX.current;
    const threshold = 40; // minimum distance to trigger swipe

    if (deltaX > threshold) {
      goToNext();
    } else if (deltaX < -threshold) {
      goToPrev();
    }

    setTimeout(() => setIsPaused(false), 2000);
  };

  // Keyboard Arrow Navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  if (total === 0) {
    return null;
  }

  const currentImage = imageList[currentIndex] || imageList[0];

  return (
    <div
      className="product-gallery"
      ref={galleryRef}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      tabIndex={0}
      role="region"
      aria-label={`${productName} image gallery`}
    >
      {/* MAIN GALLERY FRAME */}
      <div
        className="product-gallery__main"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImage}
          alt={`${productName} - View ${currentIndex + 1} of ${total}`}
          className="product-gallery__img"
        />

        {/* PREVIOUS / NEXT ARROWS */}
        {total > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-arrow--prev"
              onClick={goToPrev}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-arrow gallery-arrow--next"
              onClick={goToNext}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}

        {/* PAGINATION DOTS */}
        {total > 1 && (
          <div className="product-gallery__dots">
            {imageList.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                className={`gallery-dot ${idx === currentIndex ? 'gallery-dot--active' : ''}`}
                onClick={() => goToIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* THUMBNAILS STRIP */}
      {total > 1 && (
        <div className="product-gallery__thumbnails">
          {imageList.map((img, idx) => (
            <button
              key={`thumb-${idx}`}
              type="button"
              className={`gallery-thumb ${idx === currentIndex ? 'gallery-thumb--active' : ''}`}
              onClick={() => goToIndex(idx)}
              aria-label={`Select view ${idx + 1}`}
            >
              <img src={img} alt={`${productName} thumbnail ${idx + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductImageGallery;
