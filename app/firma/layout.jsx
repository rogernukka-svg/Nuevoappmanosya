import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-[#06110D] text-white">
        {children}
      </body>
    </html>
  );
}