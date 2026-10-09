import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { MapPin, Mail, Phone, Facebook, Instagram, Twitter } from 'lucide-react';
import { getJSON } from '../lib/api';

const DEFAULT_CONTACT = {
  email: 'info@discovermansalay.com',
  phone: '+63 123 456 7890',
  address: 'Mansalay Municipal Hall, Oriental Mindoro',
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  twitter: 'https://twitter.com',
};

const STORAGE_KEY = 'discover-mansalay:site-contact';

export function Footer() {
  const [contact, setContact] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_CONTACT, ...JSON.parse(cached) };
      }
    } catch {}
    return DEFAULT_CONTACT;
  });

  const loadContact = useCallback(async () => {
    try {
      const data = await getJSON('/site-settings/contact');
      if (data) {
        const updated = {
          email: data.email || DEFAULT_CONTACT.email,
          phone: data.phone || DEFAULT_CONTACT.phone,
          address: data.address || DEFAULT_CONTACT.address,
          facebook: data.facebook || DEFAULT_CONTACT.facebook,
          instagram: data.instagram || DEFAULT_CONTACT.instagram,
          twitter: data.twitter || DEFAULT_CONTACT.twitter,
        };
        setContact(updated);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
    } catch {
      // quiet fallback
    }
  }, []);

  useEffect(() => {
    loadContact();

    // Listen for real-time instant updates from Profile settings without page refresh
    const handleInstantUpdate = (e: any) => {
      if (e?.detail) {
        setContact((prev: any) => {
          const next = {
            email: e.detail.email ?? prev.email,
            phone: e.detail.phone ?? prev.phone,
            address: e.detail.address ?? prev.address,
            facebook: e.detail.facebook ?? prev.facebook,
            instagram: e.detail.instagram ?? prev.instagram,
            twitter: e.detail.twitter ?? prev.twitter,
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      } else {
        loadContact();
      }
    };

    window.addEventListener('site-settings:contact-updated', handleInstantUpdate);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setContact(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('site-settings:contact-updated', handleInstantUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadContact]);

  return (
    <footer className="bg-white border-t-2 border-primary/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-primary" />
              <span className="text-lg text-primary">DiscoverMansalay</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your gateway to discovering the beauty and culture of Mansalay.
            </p>
          </div>

          <div>
            <h3 className="mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/attractions" className="text-sm text-muted-foreground hover:text-primary">Attractions</Link></li>
              <li><Link to="/events" className="text-sm text-muted-foreground hover:text-primary">Events</Link></li>
              <li><Link to="/products" className="text-sm text-muted-foreground hover:text-primary">Products</Link></li>
              <li><Link to="/accommodations" className="text-sm text-muted-foreground hover:text-primary">Accommodations</Link></li>
              <li><Link to="/culture-arts" className="text-sm text-muted-foreground hover:text-primary">Culture & Arts</Link></li>
              <li><Link to="/history" className="text-sm text-muted-foreground hover:text-primary">History</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4">For Businesses</h3>
            <ul className="space-y-2">
              <li><Link to="/resort/register" className="text-sm text-muted-foreground hover:text-primary">Resort Registration</Link></li>
              <li><Link to="/enterprise/register" className="text-sm text-muted-foreground hover:text-primary">Enterprise Registration</Link></li>
              <li><Link to="/admin/login" className="text-sm text-muted-foreground hover:text-primary">Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-pink-500 shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-pink-500 shrink-0" />
                <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">
                  {contact.phone}
                </a>
              </li>
              {contact.address && (
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
                  <span>{contact.address}</span>
                </li>
              )}
            </ul>
            <div className="flex gap-4 mt-4">
              {contact.facebook && (
                <a
                  href={contact.facebook.startsWith('http') ? contact.facebook : `https://${contact.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                >
                  <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                </a>
              )}
              {contact.instagram && (
                <a
                  href={contact.instagram.startsWith('http') ? contact.instagram : `https://${contact.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                >
                  <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                </a>
              )}
              {contact.twitter && (
                <a
                  href={contact.twitter.startsWith('http') ? contact.twitter : `https://${contact.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Twitter / X"
                >
                  <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary/20 mt-8 pt-8 text-center text-sm text-muted-foreground">
          © 2026 DiscoverMansalay. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
