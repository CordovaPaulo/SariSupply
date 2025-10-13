import React from 'react';
// Use the same Navbar used on user pages. Adjust this path if different.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main>{children}</main>
    </>
  );
}