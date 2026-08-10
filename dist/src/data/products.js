export const products = [
  {
    id: 1,
    name: 'Romantic Birthday Balloon Decoration',
    occasion: 'Birthday',
    price: 12999,
    originalPrice: 15999,
    rating: 4.8,
    reviewCount: 214,
    location: 'Delhi NCR, 110001',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A luxury balloon installation with elegant backdrops, photo-worthy entry styling, and custom color palettes for unforgettable birthdays.',
    highlights: ['Premium balloon clusters', 'Custom color themes', 'Photo-ready backdrop', 'Delivery and setup included'],
    includedItems: ['Balloon arch', 'Backdrop', 'Centerpiece decor', 'Setup support'],
    customizableOptions: ['Theme color', 'Balloon style', 'Personalized message', 'Lighting add-on'],
    customizationOptions: [
      {
        key: 'balloonTheme',
        label: 'Balloon Theme',
        options: [
          { value: 'Classic', price: 0 },
          { value: 'Pastel', price: 0 },
          { value: 'Metallic Chrome', price: 400 },
          { value: 'Premium Organic Garland', price: 800 },
        ],
      },
      {
        key: 'balloonColors',
        label: 'Balloon Colors',
        options: [
          { value: 'Pink & White', price: 0 },
          { value: 'Blue & White', price: 0 },
          { value: 'Black & Gold', price: 350 },
          { value: 'Custom Color Palette', price: 600 },
        ],
      },
      {
        key: 'nameNeonSign',
        label: 'Name Customization',
        options: [
          { value: 'No', price: 0 },
          { value: 'Custom Name Neon Sign', price: 500 },
        ],
      },
      {
        key: 'ledLights',
        label: 'LED & Fairy Lights',
        options: [
          { value: 'No additional cost', price: 0 },
          { value: 'Add Warm LED String Lights', price: 299 },
        ],
      },
      {
        key: 'cakeTable',
        label: 'Cake Table Styling',
        options: [
          { value: 'Included', price: 0 },
          { value: 'Luxe Plinth Table Setup', price: 399 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Premium Birthday Theme Decoration',
    occasion: 'Birthday',
    price: 17999,
    originalPrice: 21999,
    rating: 4.9,
    reviewCount: 187,
    location: 'Mumbai, 400001',
    image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A striking party setup that blends modern floral arrangements, statement lighting, and luxurious decor accents for milestone birthdays.',
    highlights: ['Statement entrance', 'Premium florals', 'Mood lighting', 'Dedicated décor styling'],
    includedItems: ['Floral installation', 'Lighting accents', 'Cake table styling', 'Entry decor'],
    customizableOptions: ['Theme palette', 'Floral variety', 'Photo booth', 'Lighting intensity'],
    customizationOptions: [
      {
        key: 'themePalette',
        label: 'Theme Color Palette',
        options: [
          { value: 'Rose Gold & Blush', price: 0 },
          { value: 'Royal Velvet & Gold', price: 0 },
          { value: 'Emerald & Gold', price: 450 },
        ],
      },
      {
        key: 'floralVariety',
        label: 'Floral Arrangement',
        options: [
          { value: 'Standard Artificial Florals', price: 0 },
          { value: 'Fresh Premium Roses & Lilies', price: 850 },
        ],
      },
      {
        key: 'photoBooth',
        label: 'Photo Backdrop Corner',
        options: [
          { value: 'Standard Backdrop', price: 0 },
          { value: 'Interactive Ring Backdrop & Props', price: 650 },
        ],
      },
      {
        key: 'lightingIntensity',
        label: 'Lighting Package',
        options: [
          { value: 'Ambient Warm Lights', price: 0 },
          { value: 'Spotlights & Cold Pyro Entry', price: 999 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Anniversary Candlelight Setup',
    occasion: 'Anniversary',
    price: 15999,
    originalPrice: 19999,
    rating: 4.7,
    reviewCount: 143,
    location: 'Bengaluru, 560001',
    image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'An intimate candlelit arrangement designed for anniversaries with warm lighting, soft florals, and a romantic ambience.',
    highlights: ['Candlelight ambience', 'Soft floral styling', 'Private dinner corner', 'Elegant table setting'],
    includedItems: ['Candle clusters', 'Table decor', 'Floral elements', 'Ambient lighting'],
    customizableOptions: ['Candle style', 'Flower type', 'Menu styling', 'Music package'],
    customizationOptions: [
      {
        key: 'candlelightAmbience',
        label: 'Candlelight Setup',
        options: [
          { value: 'Standard Candle Clusters', price: 0 },
          { value: 'Premium Glass Votives', price: 499 },
          { value: 'LED Flame-Free Safety Candles', price: 299 },
        ],
      },
      {
        key: 'rosePetalPathway',
        label: 'Rose Petal Pathway',
        options: [
          { value: 'None', price: 0 },
          { value: '5ft Red Petal Carpet', price: 399 },
          { value: 'Full Pathway & Heart Motif', price: 799 },
        ],
      },
      {
        key: 'tableLinens',
        label: 'Table Draping & Linens',
        options: [
          { value: 'Soft Satin Linen Included', price: 0 },
          { value: 'Luxe Velvet & Gold Accents', price: 499 },
        ],
      },
      {
        key: 'musicPackage',
        label: 'Romantic Music Setup',
        options: [
          { value: 'None', price: 0 },
          { value: 'Bluetooth Speaker & Curated Playlist', price: 299 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'Rose Petal Romantic Setup',
    occasion: 'Anniversary',
    price: 13999,
    originalPrice: 16999,
    rating: 4.8,
    reviewCount: 128,
    location: 'Jaipur, 302001',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A romantic floral installation with rose petals, delicate draping, and luxe details for heartfelt anniversary moments.',
    highlights: ['Rose petal pathways', 'Floral canopy', 'Memory wall', 'Premium linen styling'],
    includedItems: ['Rose petals', 'Floral décor', 'Backdrop', 'Setup and cleanup'],
    customizableOptions: ['Petal color', 'Floral accent', 'Photo corner', 'Lighting add-on'],
    customizationOptions: [
      {
        key: 'petalPalette',
        label: 'Rose Petal Palette',
        options: [
          { value: 'Red Dutch Roses', price: 0 },
          { value: 'Pink & White Roses', price: 0 },
          { value: 'Mixed Exotic Petals', price: 350 },
        ],
      },
      {
        key: 'floralCanopy',
        label: 'Floral Canopy & Draping',
        options: [
          { value: 'Standard Draping', price: 0 },
          { value: 'Fresh Rose Canopy Arch', price: 899 },
        ],
      },
      {
        key: 'fairyLanterns',
        label: 'Fairy Lights & Lanterns',
        options: [
          { value: 'Included Fairy Lights', price: 0 },
          { value: 'Add Hanging Glass Lanterns', price: 399 },
        ],
      },
      {
        key: 'photoCorner',
        label: 'Photo Memory Wall',
        options: [
          { value: 'No', price: 0 },
          { value: 'Hanging Photo Clip Setup (12 Photos)', price: 349 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Baby Shower Pastel Theme',
    occasion: 'Baby Shower',
    price: 11999,
    originalPrice: 14999,
    rating: 4.9,
    reviewCount: 164,
    location: 'Pune, 411001',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A soft pastel decor package ideal for baby showers, complete with custom banners, charming florals, and dreamy photo moments.',
    highlights: ['Pastel balloon decor', 'Baby milestone details', 'Welcome board', 'Soft lighting'],
    includedItems: ['Pastel balloons', 'Banner setup', 'Floral accents', 'Backdrop'],
    customizableOptions: ['Theme palette', 'Letter board', 'Cake table', 'Gift corner'],
    customizationOptions: [
      {
        key: 'pastelPalette',
        label: 'Pastel Color Palette',
        options: [
          { value: 'Gender Neutral Mint & Gold', price: 0 },
          { value: 'Baby Pink & Rose Gold', price: 0 },
          { value: 'Baby Blue & Silver', price: 0 },
          { value: 'Custom Multi-Pastel', price: 400 },
        ],
      },
      {
        key: 'welcomeBoard',
        label: 'Welcome Board & Banner',
        options: [
          { value: 'Standard Printed Banner', price: 0 },
          { value: 'Custom Acrylic Welcome Board', price: 499 },
        ],
      },
      {
        key: 'backdropProps',
        label: 'Theme Backdrop Props',
        options: [
          { value: 'Included Balloon Backdrop', price: 0 },
          { value: 'Teddy Bear Props & Cloud Garland', price: 599 },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'Proposal Decoration',
    occasion: 'Proposal',
    price: 18999,
    originalPrice: 23999,
    rating: 4.8,
    reviewCount: 96,
    location: 'Gurugram, 122001',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A cinematic proposal setup with dramatic draping, floral details, and a luxurious surprise ambience crafted for the perfect moment.',
    highlights: ['Dramatic floral arch', 'Ambient lighting', 'Personalized signage', 'Premium setup'],
    includedItems: ['Floral arch', 'Lighting', 'Roses', 'Decor styling'],
    customizableOptions: ['Color theme', 'Message board', 'Flowers', 'Surprise add-ons'],
    customizationOptions: [
      {
        key: 'proposalSignage',
        label: 'Proposal Signage',
        options: [
          { value: 'MARRY ME Light Up Letters', price: 0 },
          { value: 'Customized Name Neon Sign', price: 600 },
        ],
      },
      {
        key: 'heartArch',
        label: 'Heart Backdrop Arch',
        options: [
          { value: 'Red Rose Heart Arch', price: 0 },
          { value: 'Illuminated Floral Arch & Drapes', price: 999 },
        ],
      },
      {
        key: 'candleAisle',
        label: 'Pathway & Candle Clusters',
        options: [
          { value: '50 LED Candle Clusters', price: 0 },
          { value: '100 Candle Clusters & Petal Aisle', price: 699 },
        ],
      },
    ],
  },
  {
    id: 7,
    name: 'Housewarming Decoration',
    occasion: 'Housewarming',
    price: 10999,
    originalPrice: 13999,
    rating: 4.6,
    reviewCount: 112,
    location: 'Noida, 201301',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A warm and elegant housewarming setup featuring entry decor, floral accents, and welcoming touches for a new home.',
    highlights: ['Entry styling', 'Welcome signage', 'Warm color palette', 'Fresh florals'],
    includedItems: ['Entry decor', 'Floral setup', 'Welcome board', 'Table accents'],
    customizableOptions: ['Color theme', 'Floral variety', 'Welcome message', 'Door styling'],
    customizationOptions: [
      {
        key: 'doorStyling',
        label: 'Door & Entrance Garland',
        options: [
          { value: 'Traditional Marigold Garland', price: 0 },
          { value: 'Luxe Fresh Floral & Leaf Swag', price: 400 },
        ],
      },
      {
        key: 'welcomeArch',
        label: 'Welcome Signage',
        options: [
          { value: 'Traditional Rangoli Motif Board', price: 0 },
          { value: 'Personalized Metal Welcome Arch', price: 450 },
        ],
      },
      {
        key: 'livingCenterpiece',
        label: 'Living Room Centerpiece',
        options: [
          { value: 'Fresh Flower Vases', price: 0 },
          { value: 'Brass Diyas & Floral Urns', price: 550 },
        ],
      },
    ],
  },
  {
    id: 8,
    name: 'Premium Corporate Celebration',
    occasion: 'Corporate',
    price: 24999,
    originalPrice: 29999,
    rating: 4.7,
    reviewCount: 91,
    location: 'Hyderabad, 500001',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A polished corporate event setup that combines luxury ambiance, branded styling, and a professional finish for launches or celebrations.',
    highlights: ['Executive styling', 'Premium signage', 'Branded backdrop', 'Seamless setup'],
    includedItems: ['Backdrop', 'Branding elements', 'Centerpieces', 'Stage styling'],
    customizableOptions: ['Brand colors', 'Stage size', 'Lighting', 'Add-on signage'],
    customizationOptions: [
      {
        key: 'brandColors',
        label: 'Brand Color Palette',
        options: [
          { value: 'Corporate Blue & White', price: 0 },
          { value: 'Executive Gold & Black', price: 0 },
          { value: 'Custom Brand Color Theme', price: 600 },
        ],
      },
      {
        key: 'stageSize',
        label: 'Stage & Backdrop Size',
        options: [
          { value: 'Standard 10x8ft Stage Backdrop', price: 0 },
          { value: 'Grand 15x10ft Stage Backdrop', price: 1200 },
        ],
      },
      {
        key: 'brandSignage',
        label: 'Branding Signage Add-on',
        options: [
          { value: 'Standard Printed Backdrop Logo', price: 0 },
          { value: 'Custom 3D Acrylic Logo Signage', price: 800 },
        ],
      },
    ],
  },
  {
    id: 9,
    name: 'Engagement Stage Decoration',
    occasion: 'Engagement',
    price: 21999,
    originalPrice: 26999,
    rating: 4.9,
    reviewCount: 135,
    location: 'Chandigarh, 160001',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'An elegant engagement stage setup with rich florals, sophisticated lighting, and exceptional detailing made to shine.',
    highlights: ['Floral stage', 'Statement arch', 'Luxury draping', 'Premium ambiance'],
    includedItems: ['Stage decor', 'Floral elements', 'Lighting', 'Backdrop'],
    customizableOptions: ['Color palette', 'Floral theme', 'Stage size', 'Draping style'],
    customizationOptions: [
      {
        key: 'stageFloral',
        label: 'Stage Floral Backdrop',
        options: [
          { value: 'Pastel Floral Arch', price: 0 },
          { value: 'Royal Red & Gold Floral Wall', price: 1200 },
        ],
      },
      {
        key: 'stageLighting',
        label: 'Stage Lighting Package',
        options: [
          { value: 'Ambient Mood Lighting', price: 0 },
          { value: 'Dual Spotlights & Fairy Drapes', price: 600 },
        ],
      },
    ],
  },
  {
    id: 10,
    name: 'Wedding Room Decoration',
    occasion: 'Wedding',
    price: 27999,
    originalPrice: 34999,
    rating: 5.0,
    reviewCount: 179,
    location: 'Ahmedabad, 380001',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A grand wedding room decor package featuring luxurious drapery, florals, and tailored styling for a truly memorable celebration.',
    highlights: ['Draped elegance', 'Luxury florals', 'Statement lighting', 'Tailored detailing'],
    includedItems: ['Drapery', 'Floral installation', 'Lighting', 'Room styling'],
    customizableOptions: ['Theme palette', 'Floral selection', 'Ceiling decor', 'Scent add-on'],
    customizationOptions: [
      {
        key: 'bedCanopy',
        label: 'Bed & Canopy Styling',
        options: [
          { value: 'Rose Petal Heart & Drapes', price: 0 },
          { value: 'Full Fresh Floral Canopy', price: 1500 },
        ],
      },
      {
        key: 'roomDraping',
        label: 'Entrance & Room Draping',
        options: [
          { value: 'Soft Silk Drapes', price: 0 },
          { value: 'Royal Velvet & Fairy Light Drapes', price: 900 },
        ],
      },
    ],
  },
  {
    id: 11,
    name: 'Kids Birthday Theme',
    occasion: 'Birthday',
    price: 9999,
    originalPrice: 12999,
    rating: 4.7,
    reviewCount: 154,
    location: 'Delhi, 110002',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A playful and colorful kids birthday package with themed decor, fun balloons, and charming photo corners for little celebrations.',
    highlights: ['Character-themed decor', 'Playful balloon setup', 'Photo corner', 'Cake table styling'],
    includedItems: ['Balloon setup', 'Backdrop', 'Cake table', 'Character props'],
    customizableOptions: ['Character theme', 'Color palette', 'Photo props', 'Add-on activities'],
    customizationOptions: [
      {
        key: 'characterTheme',
        label: 'Kids Theme Choice',
        options: [
          { value: 'Jungle Safari', price: 0 },
          { value: 'Superhero World', price: 0 },
          { value: 'Princess Castle', price: 0 },
          { value: 'Cartoon Carnival', price: 500 },
        ],
      },
      {
        key: 'balloonArchStyle',
        label: 'Balloon Arch Style',
        options: [
          { value: 'Standard Symmetrical Arch', price: 0 },
          { value: 'Organic Pastel Garland', price: 400 },
        ],
      },
      {
        key: 'characterProps',
        label: 'Theme Cutouts & Props',
        options: [
          { value: 'Included 2 Standee Props', price: 0 },
          { value: 'Add 4 Extra 3D Character Cutouts', price: 350 },
        ],
      },
    ],
  },
  {
    id: 12,
    name: 'Luxury Anniversary Setup',
    occasion: 'Anniversary',
    price: 22999,
    originalPrice: 27999,
    rating: 4.9,
    reviewCount: 118,
    location: 'Kolkata, 700001',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    ],
    description:
      'A grand anniversary experience with luxury florals, statement lighting, and exquisite styling that makes every celebration feel elevated.',
    highlights: ['Luxury florals', 'Lighting statement', 'Grand entrance', 'Signature styling'],
    includedItems: ['Floral arch', 'Ambience lighting', 'Entry styling', 'Setup'],
    customizableOptions: ['Flower selection', 'Lighting mood', 'Add-on dessert table', 'Backdrop style'],
    customizationOptions: [
      {
        key: 'signatureFloral',
        label: 'Signature Floral Installation',
        options: [
          { value: 'Grand Rose Wall Backdrop', price: 0 },
          { value: 'Exotic Orchid & Lily Arch', price: 1400 },
        ],
      },
      {
        key: 'lightingStatement',
        label: 'Lighting Statement',
        options: [
          { value: 'Chandelier & Fairy Drapes', price: 0 },
          { value: 'Chandelier + Cold Fire Pyro Entrance', price: 1800 },
        ],
      },
    ],
  },
];
