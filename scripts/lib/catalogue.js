'use strict';
/** Demo catalogue definition (invented brands). Used by scripts/seed.js and scripts/generate-images.js. */

const CATEGORIES = [
  { slug: 'kitchen-dining', name: 'Kitchen & Dining', icon: '🍳', color: '#e76f51', subs: [['cookware', 'Cookware'], ['storage-containers', 'Storage Containers'], ['dinnerware', 'Dinnerware']] },
  { slug: 'home-decor', name: 'Home Décor', icon: '🪔', color: '#d16d8f', subs: [['wall-decor', 'Wall Décor'], ['lamps-lighting', 'Lamps & Lighting'], ['cushions-throws', 'Cushions & Throws']] },
  { slug: 'cleaning', name: 'Cleaning', icon: '🧹', color: '#2a9d8f', subs: [['cleaning-tools', 'Cleaning Tools'], ['laundry', 'Laundry']] },
  { slug: 'bath', name: 'Bath', icon: '🛁', color: '#3a86c8', subs: [['towels', 'Towels'], ['bath-accessories', 'Bath Accessories']] },
  { slug: 'bedroom', name: 'Bedroom', icon: '🛏️', color: '#7b5ea7', subs: [['bedsheets', 'Bedsheets'], ['pillows', 'Pillows']] },
  { slug: 'storage-organisation', name: 'Storage & Organisation', icon: '🧺', color: '#6a8d3a', subs: [['organisers', 'Organisers'], ['racks', 'Racks']] },
  { slug: 'small-appliances', name: 'Small Appliances', icon: '⚡', color: '#4a5d7e', subs: [['kettles', 'Kettles'], ['mixers', 'Mixers'], ['irons', 'Irons']] },
];

// [name, category, subcategory, brand, mrp, price, gst, stock, tags, shape, color, rating]
const P = [
  ['Tri-Ply Stainless Steel Kadai 24 cm', 'kitchen-dining', 'cookware', 'Rasoi Pro', 2499, 1799, 5, 42, ['best-seller'], 'kadai', '#8d99ae', 4.6],
  ['Pre-Seasoned Cast Iron Dosa Tawa 28 cm', 'kitchen-dining', 'cookware', 'Sundaram Steel', 1599, 1249, 5, 30, ['best-seller'], 'tawa', '#3d405b', 4.7],
  ['Hard Anodised Pressure Cooker 5 L', 'kitchen-dining', 'cookware', 'Rasoi Pro', 3299, 2599, 5, 18, ['on-offer'], 'cooker', '#2b2d42', 4.5],
  ['Non-Stick Appam Patra 12 Cavity', 'kitchen-dining', 'cookware', 'Kaveri Home', 1199, 849, 5, 25, ['new-arrival'], 'appam', '#6d4c41', 4.2],
  ['Airtight Glass Jar Set of 3 (1 L)', 'kitchen-dining', 'storage-containers', 'Kaveri Home', 1499, 999, 12, 60, ['on-offer'], 'jars', '#2a9d8f', 4.4],
  ['Stainless Steel Masala Dabba with 7 Bowls', 'kitchen-dining', 'storage-containers', 'Sundaram Steel', 899, 649, 5, 75, ['best-seller'], 'dabba', '#e63946', 4.8],
  ['BPA-Free Fridge Container Set of 4', 'kitchen-dining', 'storage-containers', 'Ghar Craft', 799, 549, 18, 4, ['new-arrival'], 'containers', '#1d8a99', 4.1],
  ['Melamine Dinner Set 24 Pieces', 'kitchen-dining', 'dinnerware', 'Aangan', 3499, 2299, 18, 20, ['on-offer'], 'dinnerset', '#2a6f97', 4.3],
  ['Stainless Steel Thali Set of 6', 'kitchen-dining', 'dinnerware', 'Sundaram Steel', 2199, 1699, 5, 34, ['best-seller'], 'thali', '#b08968', 4.6],
  ['Stoneware Pasta Bowls Set of 4', 'kitchen-dining', 'dinnerware', 'Aangan', 1299, 899, 12, 0, ['new-arrival'], 'bowls', '#c8553d', 4.0],

  ['Madhubani Print Wall Art Set of 3', 'home-decor', 'wall-decor', 'Dhaaga', 2499, 1599, 12, 15, ['new-arrival'], 'wallart', '#d62828', 4.5],
  ['Brass Finish Mandala Wall Hanging', 'home-decor', 'wall-decor', 'Nivaas', 1899, 1399, 12, 12, ['on-offer'], 'mandala', '#c9a227', 4.4],
  ['Sheesham Wood Floating Shelves Set of 3', 'home-decor', 'wall-decor', 'Nivaas', 2299, 1699, 12, 22, [], 'shelves', '#8c5a3c', 4.3],
  ['Handwoven Rattan Pendant Lamp', 'home-decor', 'lamps-lighting', 'Tara Lights', 3299, 2499, 18, 9, ['new-arrival'], 'pendant', '#c08552', 4.6],
  ['Ceramic Table Lamp with Linen Shade', 'home-decor', 'lamps-lighting', 'Tara Lights', 2799, 1999, 18, 14, [], 'tablelamp', '#457b9d', 4.2],
  ['Festive LED String Lights 10 m (Warm White)', 'home-decor', 'lamps-lighting', 'Tara Lights', 699, 399, 18, 120, ['best-seller', 'on-offer'], 'stringlights', '#f4a261', 4.5],
  ['Jaipur Block-Print Cushion Covers Set of 5', 'home-decor', 'cushions-throws', 'Dhaaga', 1499, 999, 5, 40, ['best-seller'], 'cushion', '#e07a5f', 4.7],
  ['Handloom Cotton Throw Blanket', 'home-decor', 'cushions-throws', 'Dhaaga', 1999, 1499, 5, 26, ['new-arrival'], 'throw', '#3d5a80', 4.4],
  ['Velvet Cushion Covers Set of 2 (Emerald)', 'home-decor', 'cushions-throws', 'Aangan', 999, 699, 5, 33, ['on-offer'], 'cushion', '#2d6a4f', 4.3],

  ['Spin Mop with Bucket & 2 Refills', 'cleaning', 'cleaning-tools', 'SwachhLine', 1999, 1299, 18, 28, ['best-seller', 'on-offer'], 'mop', '#0096c7', 4.4],
  ['Microfibre Cleaning Cloths Pack of 8', 'cleaning', 'cleaning-tools', 'SwachhLine', 599, 349, 12, 150, ['best-seller'], 'cloths', '#7209b7', 4.6],
  ['Soft Grass Broom (Phool Jhadu)', 'cleaning', 'cleaning-tools', 'SwachhLine', 349, 249, 0, 80, [], 'broom', '#9a6b3f', 4.1],
  ['Toilet Brush with Ventilated Holder', 'cleaning', 'cleaning-tools', 'SwachhLine', 449, 299, 18, 3, ['new-arrival'], 'toiletbrush', '#48cae4', 3.9],
  ['Foldable Laundry Basket 60 L', 'cleaning', 'laundry', 'Ghar Craft', 899, 599, 12, 45, ['on-offer'], 'basket', '#6c757d', 4.2],
  ['Stainless Steel Cloth Drying Stand', 'cleaning', 'laundry', 'Sahaj', 3499, 2499, 18, 11, ['best-seller'], 'dryingstand', '#e76f51', 4.5],
  ['Plastic Cloth Clips Pack of 24', 'cleaning', 'laundry', 'Sahaj', 199, 149, 18, 200, [], 'clips', '#ef476f', 4.0],

  ['600 GSM Cotton Bath Towel Set of 2', 'bath', 'towels', 'Neelam Linen', 1499, 999, 5, 55, ['best-seller'], 'towel', '#219ebc', 4.6],
  ['Bamboo Hand Towels Set of 4', 'bath', 'towels', 'Neelam Linen', 999, 699, 5, 38, ['new-arrival'], 'towel', '#90be6d', 4.4],
  ['Handloom Cotton Gamcha Set of 3', 'bath', 'towels', 'Dhaaga', 599, 449, 5, 70, ['on-offer'], 'gamcha', '#d00000', 4.3],
  ['Ceramic Bathroom Accessory Set 4 Pieces', 'bath', 'bath-accessories', 'Aangan', 1799, 1199, 18, 19, [], 'bathset', '#8ecae6', 4.2],
  ['Anti-Skid Microfibre Bath Mat', 'bath', 'bath-accessories', 'Neelam Linen', 699, 449, 12, 64, ['on-offer'], 'bathmat', '#023e8a', 4.1],
  ['Stainless Steel Bathroom Corner Shelf', 'bath', 'bath-accessories', 'Sahaj', 1299, 899, 18, 27, ['new-arrival'], 'cornershelf', '#577590', 4.3],

  ['Jaipuri Cotton Double Bedsheet with 2 Pillow Covers', 'bedroom', 'bedsheets', 'Neelam Linen', 1999, 1199, 5, 48, ['best-seller', 'on-offer'], 'bedsheet', '#e85d04', 4.5],
  ['300 TC Percale King Bedsheet Set', 'bedroom', 'bedsheets', 'Neelam Linen', 2999, 2199, 5, 21, ['new-arrival'], 'bedsheet', '#5e60ce', 4.6],
  ['Hand-Stitched Kantha Bedcover', 'bedroom', 'bedsheets', 'Dhaaga', 3999, 2999, 5, 7, [], 'bedcover', '#9d0208', 4.7],
  ['Microfibre Sleeping Pillow Set of 2', 'bedroom', 'pillows', 'Nivaas', 1299, 799, 12, 52, ['best-seller'], 'pillow', '#7b8cde', 4.2],
  ['Memory Foam Contour Pillow', 'bedroom', 'pillows', 'Nivaas', 2499, 1699, 18, 16, ['new-arrival'], 'contourpillow', '#4361ee', 4.4],
  ['Natural Kapok (Silk Cotton) Pillow', 'bedroom', 'pillows', 'Nivaas', 1199, 899, 5, 0, [], 'pillow', '#b5838d', 4.5],

  ['6-Shelf Hanging Wardrobe Organiser', 'storage-organisation', 'organisers', 'Ghar Craft', 899, 599, 12, 36, ['on-offer'], 'wardrobe', '#6c757d', 4.1],
  ['Drawer Divider Organiser Set of 8', 'storage-organisation', 'organisers', 'Ghar Craft', 699, 499, 18, 44, ['new-arrival'], 'drawer', '#ff7f51', 4.2],
  ['Jute Storage Baskets Set of 3', 'storage-organisation', 'organisers', 'Aangan', 1599, 1099, 5, 29, ['best-seller'], 'basket', '#bc8a5f', 4.6],
  ['4-Tier Kitchen Trolley Rack with Wheels', 'storage-organisation', 'racks', 'Sahaj', 2999, 1999, 18, 13, ['on-offer'], 'trolley', '#2b9348', 4.3],
  ['5-Tier Metal Shoe Rack', 'storage-organisation', 'racks', 'Sahaj', 1999, 1399, 18, 24, ['best-seller'], 'shoerack', '#343a40', 4.4],
  ['Wall-Mounted Steel Utensil Rack', 'storage-organisation', 'racks', 'Sundaram Steel', 2499, 1799, 18, 8, [], 'utensilrack', '#adb5bd', 4.2],

  ['Stainless Steel Electric Kettle 1.5 L', 'small-appliances', 'kettles', 'UrjaTech', 1499, 899, 18, 58, ['best-seller', 'on-offer'], 'kettle', '#9aa5b1', 4.4],
  ['Glass Electric Kettle with Blue LED 1.7 L', 'small-appliances', 'kettles', 'UrjaTech', 1999, 1399, 18, 23, ['new-arrival'], 'glasskettle', '#4895ef', 4.3],
  ['Mixer Grinder 750 W with 3 Jars', 'small-appliances', 'mixers', 'UrjaTech', 4999, 3299, 18, 17, ['best-seller'], 'mixer', '#d00000', 4.5],
  ['Hand Blender 400 W with Beaker', 'small-appliances', 'mixers', 'UrjaTech', 1799, 1199, 18, 31, ['on-offer'], 'handblender', '#ffb703', 4.2],
  ['Dry Iron 1000 W with Non-Stick Soleplate', 'small-appliances', 'irons', 'UrjaTech', 999, 699, 18, 47, [], 'iron', '#7209b7', 4.1],
  ['Steam Iron 1600 W with Spray', 'small-appliances', 'irons', 'UrjaTech', 2499, 1799, 18, 2, ['new-arrival', 'on-offer'], 'steamiron', '#0077b6', 4.4],
];

const SUB_COPY = {
  cookware: ['Even heat distribution for perfect tadka and sabzi', 'Works on gas stove and induction', 'Riveted, cool-touch handles', 'Easy to clean, dishwasher safe'],
  'storage-containers': ['Airtight lids keep spices and dals fresh', 'Food-grade, odour-free material', 'Stackable design saves shelf space', 'Ideal for kitchen and fridge'],
  dinnerware: ['Everyday-tough and festive-ready', 'Microwave safe (where applicable)', 'Chip-resistant finish', 'Serves a family of 6'],
  'wall-decor': ['Handcrafted by Indian artisans', 'Ready-to-hang hooks included', 'Brightens living room or pooja corner', 'Gift-ready packaging'],
  'lamps-lighting': ['Warm ambient glow', 'Energy-efficient LED compatible', 'Perfect for Diwali and everyday décor', '1-year warranty on electricals'],
  'cushions-throws': ['100% natural fabric', 'Hidden zip closure', 'Colour-fast, gentle machine wash', 'Fits standard 16 x 16 inch inserts'],
  'cleaning-tools': ['Removes dust and grime effortlessly', 'Reusable and long-lasting', 'Ergonomic grip', 'Suitable for all floor types'],
  laundry: ['Space-saving foldable design', 'Rust-resistant build', 'Balcony and indoor friendly', 'Holds a full family wash'],
  towels: ['Highly absorbent, quick-dry', 'Soft on skin, gets softer with every wash', 'Pre-shrunk cotton', 'Fade-resistant colours'],
  'bath-accessories': ['Moisture-resistant finish', 'Easy to install, no drilling needed (where applicable)', 'Matches modern bathrooms', 'Easy to wipe clean'],
  bedsheets: ['Breathable cotton for Indian summers', 'Fits mattresses up to 8 inches', 'Colour-fast prints', 'Includes matching pillow covers'],
  pillows: ['Supports neck and spine alignment', 'Hypoallergenic filling', 'Removable, washable cover', 'Retains shape night after night'],
  organisers: ['Declutters wardrobes and drawers', 'Foldable when not in use', 'Breathable, dust-free fabric', 'Easy to assemble'],
  racks: ['Sturdy powder-coated frame', 'Tool-free assembly', 'Maximises vertical space', 'Holds up to 40 kg'],
  kettles: ['Boils 1.5 L in about 5 minutes', 'Auto shut-off and boil-dry protection', '360° cordless base', 'BIS certified'],
  mixers: ['Powerful copper motor', 'Stainless steel blades for wet and dry grinding', 'Overload protection', '2-year warranty'],
  irons: ['Non-stick soleplate glides smoothly', 'Adjustable temperature dial', 'Auto shut-off for safety', 'BIS certified'],
};

module.exports = { CATEGORIES, PRODUCTS: P, SUB_COPY };
