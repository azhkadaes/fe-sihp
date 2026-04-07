## Backoffice Harga Pangan — Frontend Prototype

### Design System

- **Dark/Light mode toggle** with smooth transitions
- **Primary**: Dark navy (`--primary`)
- **Accent/Sub-color**: Gold `#DBAF6C` for highlights, active states, badges, chart accents
- **Mobile-first** responsive layout, clean modern UI
- **Language**: Bahasa Indonesia throughout
- **Typography**: Clean sans-serif, clear hierarchy

---

### 1. Halaman Login

- Centered card with logo placeholder, email & password fields
- Gold accent on the login button
- Dark/light mode toggle in corner
- Single admin role — hardcoded mock credentials
- On success → redirect to Harga Rutin (default) on mobile, or Dashboard on desktop

### 2. Navigation

- **Mobile**: Top navbar with burger menu dropdown — lists all menu items
- **Desktop**: Collapsible sidebar with icon-only mini mode
- Menu items: Dashboard, Pasar, Komoditas, Tempat Usaha, Harga Rutin, Harga Pelaporan
- Active route highlighted with gold accent
- Dark/light mode toggle in nav
- Logout button

### 3. Dashboard

- Reference: dashboard.jabarprov.go.id style
- **Summary cards** with commodity images showing latest average price, and price trend indicator (naik ↑ / turun ↓ / stabil →) with color coding (green/red/gold)
- **Interactive Recharts** line/bar charts for price trends per commodity over time
- Filter by date range, pasar, komoditas
- Data sourced from mock harga pelaporan data

### 4. CRUD Pasar

- Card list view (mobile) / table view (desktop)
- Fields: Nama, Longitude, Latitude, Alamat, Is Active (switch toggle)
- Add/Edit via modal form, delete with confirmation dialog
- Search/filter by nama

### 5. CRUD Komoditas

- Card list with commodity image thumbnail
- Fields: Nama, Satuan Standar (integer), Gambar (image upload/preview)
- Add/Edit modal, delete confirmation

### 6. CRUD Tempat Usaha

- Card list showing nama, pemilik, active status
- Fields: Nama, Nama Pemilik, Nama Narahubung, Nomor Narahubung, Berjualan Sejak, Is Active
- Click into a tempat usaha → shows list of komoditas yang dijual
- **Sub-CRUD Komoditas Dijual**: Harga Normal, Harga Mahal, Satuan Stok (dropdown), Nilai Stok, Nilai Periode, Lokasi Supplier, Pola Distribusi, Standardized Stock Periode, Is Active (switch toggle)

### 7. CRUD Harga Rutin (Multi-Step Form)

- **Card list view** showing existing entries — each card shows date, pasar, komoditas, kelas, harga, status (Finalisasi/Dalam Proses)
  - Cards with status "Dalam Proses" → show Edit & Delete buttons
  - Cards with status "Finalisasi" → read-only, badge status displayed
  - Click card → view detail
- **Multi-step form for adding data:**
  - **Step 1**: Nama Enumerator (text), Tanggal (calendar date picker), Nama Pasar (dropdown)
  - **Step 2**: Komoditas (searchable dropdown, filtered by pasar), Kelas Komoditas (dropdown: Besar/Menengah/Kecil — disabled if already entered for same date+komoditas+pasar), Tempat Usaha (searchable dropdown, filtered by pasar+komoditas+kelas), Harga (number input)
  - "Lanjut" button → **Review popup/modal** showing all entered data
  - "Finalisasi" → saves & marks finalized, returns to Step 2 with used kelas disabled
  - Below the form on Step 2: scrollable card list of same-day, same-pasar, same-komoditas entries grouped by kelas
- **Validation**: Each kelas per komoditas per pasar per tanggal can only be entered once

### 8. Harga Pelaporan

- Card/table view showing aggregated reporting prices
- Each card: Komoditas name, average price calculated from all 3 kelas entries
- Click to view detail breakdown by kelas
- Auto-calculated from finalized harga rutin data

### 9. Business Logic (Mock)

- When tempat usaha are created, system distributes them into 3 kelas (Besar/Menengah/Kecil) by harga avg komoditas dijual (achieved from harga normal and harga mahal averaged)
- Harga pelaporan = average of harga rutin from 3 kelas for same komoditas+pasar+tanggal
- All data persisted in localStorage for the prototype
- Price trend calculation: compare today's reporting price vs previous entry

### 10. Responsive Behavior

- **Mobile**: Cards everywhere, burger nav, bottom-sheet modals, full-width forms
- **Tablet**: 2-column card grids, sidebar visible
- **Desktop**: Full sidebar, table views with sorting, wider forms