import "./globals.css";

export const metadata = {
  title: "Ranzz Downloader",
  description: "Premium all-in-one social media downloader developed by Ranzz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
