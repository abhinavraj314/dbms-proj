import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react";

function EventList({ onEventSelect }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events", {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          credentials: "include", // if you're using sessions
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("Error response:", errorData);
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received");
        }

        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400">Error loading events: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-blue-600 rounded-lg p-4 hover:bg-blue-500 transition-colors cursor-pointer"
          onClick={() => onEventSelect(event.id)}
        >
          <h3 className="text-xl font-bold mb-2 text-white">
            {event.eventName}
          </h3>
          <div className="space-y-2 text-blue-100">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(new Date(event.eventDate), "MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                {format(new Date(`1970-01-01T${event.eventTime}`), "h:mm a")}
              </span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EventList;
