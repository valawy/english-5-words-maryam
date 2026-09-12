# GitHub Upload — V10 GitHub Edition

## Por que versi ini?
GitHub web membatasi jumlah file yang dapat dipilih dalam satu proses upload. Versi sebelumnya juga berisi 260 gambar halaman PDF yang tidak diperlukan untuk deployment.

Versi ini:
- tidak membawa gambar halaman PDF;
- hanya membawa aset visual original Week 1;
- tetap dapat di-deploy ke Vercel;
- total file jauh di bawah batas upload web GitHub.

## Rencana aset berikutnya
Untuk 52 minggu, jangan membuat 1 file gambar untuk setiap vocabulary. Gunakan **52 sprite SVG**, satu file per minggu, masing-masing berisi 20 visual. Jadi 1.040 visual hanya membutuhkan sekitar 52 file visual.

Contoh:
assets/images/week-01.svg
assets/images/week-02.svg
...
assets/images/week-52.svg

Aplikasi akan mengambil visual berdasarkan ID vocabulary.

## Upload
Di GitHub:
1. Add file → Upload files
2. Pilih seluruh isi folder proyek ini.
3. Commit changes.
4. Vercel akan melakukan deployment.

Jangan upload folder `assets/pdf`.
