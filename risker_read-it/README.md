# No More Risk!

**No More Risk!** (also referred to as **RISKER**) is a small, privacy‑first web application for managing customer risk data. The entire application runs in your browser so no information ever leaves your device.

## Features

- Upload `.xlsx`, `.xls` or `.csv` files locally
- Sort, filter and archive customer records
- Risk heatmap view and simple dashboard
- Data is stored only in browser storage – no server or tracking

- Works fully offline – no network connection required
=======
- Adjustable console log level via the footer dropdown


## Setup

1. Clone or download this repository.
2. (Optional) Replace `background.mp4` with your own video for the animated background.
3. Open `index.html` in a modern browser (Chrome, Firefox, Edge or Safari). If Safari or another browser blocks scripts from `file://`, run `python3 -m http.server` in this directory and open `http://localhost:8080`.
4. All scripts are bundled in the `vendor/` directory so the app works without an Internet connection.

## Usage

1. Click **NO MORE RISK!** on the start screen.
2. Use **Upload Data** to import your Excel file.
3. Manage and review the table or open the risk map.
4. Clear data or archive entries when finished.
5. Adjust the log level using the footer selector if needed. Your choice is stored locally.

## External dependencies

 - [XLSX](https://github.com/SheetJS/sheetjs) `0.18.5` – included in `vendor/` to parse Excel files
 - [Chart.js](https://www.chartjs.org/) – included in `vendor/` for dashboard charts

## Project structure

- `index.html` – start screen
- `public/riskmap.html` – main dashboard
- `src/scripts/app.js` / `src/scripts/utils.js` – application logic
- `src/styles/styles.css` – styling
- `public/assets/background.mp4` – optional background video

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

