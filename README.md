# No More Risk!

**No More Risk!** (also referred to as **RISKER**) is a small, privacy‑first web application for managing customer risk data. The entire application runs in your browser so no information ever leaves your device.

## Features

- Upload `.xlsx`, `.xls` or `.csv` files locally
- Sort, filter and archive customer records
- Risk heatmap view and simple dashboard
- Data is stored only in browser storage – no server or tracking

## Setup

1. Clone or download this repository.
2. (Optional) Replace `background.mp4` with your own video for the animated background.
3. Open `index.html` in a modern browser (Chrome, Firefox, Edge or Safari).

## Usage

1. Click **NO MORE RISK!** on the start screen.
2. Use **Upload Data** to import your Excel file.
3. Manage and review the table or open the risk map.
4. Clear data or archive entries when finished.

## External dependencies

- [XLSX](https://github.com/SheetJS/sheetjs) `0.18.5` – loaded via CDN to parse Excel files

## Project structure

- `index.html` – start screen
- `app.html` – main dashboard
- `riskmap.html` – risk map view
- `app.js` / `utils.js` – application logic
- `styles.css` – styling
- `background.mp4` – optional background video

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

