import React from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";

const events = [
  {
    id: 1,
    name: "Code Quest Hackathon",
    date: "2024-02-15",
    time: "09:00",
    venue: "Tech Hub - Block 3",
  },
  {
    id: 2,
    name: "AI/ML Symposium",
    date: "2024-02-15",
    time: "10:30",
    venue: "Seminar Hall 1",
  },
  {
    id: 3,
    name: "Design Thinking Workshop",
    date: "2024-02-15",
    time: "15:00",
    venue: "Creative Studio",
  },
  {
    id: 4,
    name: "Cyber Security Workshop",
    date: "2024-02-16",
    time: "09:30",
    venue: "Security Lab",
  },
  {
    id: 5,
    name: "Tech Talks 2024",
    date: "2024-02-16",
    time: "11:00",
    venue: "Main Auditorium",
  },
  {
    id: 6,
    name: "Robotics Workshop",
    date: "2024-02-16",
    time: "14:00",
    venue: "Robotics Lab",
  },
];

function EventList({ onEventSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-blue-600 rounded-lg p-4 hover:bg-blue-500 transition-colors cursor-pointer"
          onClick={() => onEventSelect(event.name)}
        >
          <h3 className="text-xl font-bold mb-2 text-white">{event.name}</h3>
          <div className="space-y-2 text-blue-100">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(new Date(event.date), "MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                {format(new Date(`1970-01-01T${event.time}`), "h:mm a")}
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
