import { Navbar } from './Navbar';

export const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};
