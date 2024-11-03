import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";

function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Make sure this URL matches your server's address
      const response = await fetch("http://localhost:5000/api/events");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched events:", data);
      setEvents(data);
    } catch (error) {
      console.error("Fetch error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="text-white text-center p-4">
        <div className="animate-pulse">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-300 text-center">
        <div>Error loading events: {error}</div>
        <button
          onClick={fetchEvents}
          className="mt-4 px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-white text-center p-4">
        No events available at this time.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-blue-600 rounded-lg p-4 hover:bg-blue-500 transition-colors"
        >
          <h3 className="text-xl font-bold mb-2">{event.eventName}</h3>
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
          <button
            className="mt-4 w-full bg-blue-700 hover:bg-blue-800 text-white py-2 px-4 rounded transition-colors"
            onClick={() => {
              console.log("Register for:", event.eventName);
            }}
          >
            Register Now
          </button>
        </div>
      ))}
    </div>
  );
}

export default EventList;
