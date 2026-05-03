import { Link } from 'react-router';
import { MapPin, Mail, Phone, Facebook, Instagram, Twitter } from 'lucide-react';

export function Footer() {
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
                <Mail className="h-4 w-4" />
                info@discovermansalay.com
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                +63 123 456 7890
              </li>
            </ul>
            <div className="flex gap-4 mt-4">
              <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
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
