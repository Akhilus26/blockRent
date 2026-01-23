import { Property } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MapPin, Bed, Bath, Square, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface PropertyCardProps {
  property: Property;
  onView?: (property: Property) => void;
  onRequest?: (property: Property) => void;
  showStatus?: boolean;
  showActions?: boolean;
}

export function PropertyCard({
  property,
  onView,
  onRequest,
  showStatus = false,
  showActions = true,
}: PropertyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden card-hover">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={
              property.images[0]
                ? property.images[0].startsWith('/uploads/')
                  ? `http://localhost:5000${property.images[0]}`
                  : property.images[0]
                : "/placeholder.svg"
            }
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

          {showStatus && (
            <div className="absolute top-3 left-3">
              <StatusBadge status={property.status} />
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-2xl font-bold text-white">
              ₹{property.rent.toLocaleString()}
              <span className="text-sm font-normal opacity-80">/month</span>
            </p>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Title & Location */}
          <h3 className="font-semibold text-lg line-clamp-1 mb-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{property.location}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.area && (
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                <span>{property.area} sqft</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onView?.(property)}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                View Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
