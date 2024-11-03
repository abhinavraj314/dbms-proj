import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import EventList from "./EventList";
import { Trash2 } from "lucide-react";

const userTypes = ["Student", "Faculty", "Guest"];
const events = [
  { name: "Tech Talk", price: 10 },
  { name: "Hackathon", price: 20 },
  { name: "Workshop", price: 15 },
];

function Dashboard() {
  const [userType, setUserType] = useState("");
  const [name, setName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch("/api/registrations");
      if (response.ok) {
        const data = await response.json();
        setRegisteredUsers(data);
      } else {
        console.error("Failed to fetch registrations");
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name && userType && selectedEvent) {
      const newUser = { name, type: userType, event: selectedEvent };
      try {
        const response = await fetch("/api/registrations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newUser),
        });
        if (response.ok) {
          const addedRegistration = await response.json();
          console.log("Registration added:", addedRegistration);
          setRegisteredUsers([...registeredUsers, addedRegistration]);
          setName("");
          setUserType("");
          setSelectedEvent("");
        } else {
          console.error("Failed to add registration");
        }
      } catch (error) {
        console.error("Error adding registration:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (response.ok) {
        navigate("/");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  const [clearLoading, setClearLoading] = useState(false);
  const handleClearRegistrations = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all registrations? This action cannot be undone."
    );

    if (confirmed) {
      setClearLoading(true);
      try {
        const response = await fetch("/api/registrations/clear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          setRegisteredUsers([]);
          alert("All registrations have been cleared successfully!");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to clear registrations");
        }
      } catch (error) {
        console.error("Error clearing registrations:", error);
        alert(
          `An error occurred while clearing registrations: ${error.message}`
        );
      } finally {
        setClearLoading(false);
      }
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
      <nav className="bg-black p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            PESU Fest - DASHBOARD
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-8 p-6 bg-blue-800 rounded-lg shadow-xl border-4 border-black">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">
          PESU Fest - EVENTS
        </h2>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="name" className="block mb-1 text-white">
                Name:
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-blue-700 rounded text-white placeholder-blue-300"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label htmlFor="userType" className="block mb-1 text-white">
                You are a:
              </label>
              <select
                id="userType"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3 py-2 bg-blue-700 rounded text-white"
                required
              >
                <option value="">Select type</option>
                {userTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event" className="block mb-1 text-white">
                Event:
              </label>
              <select
                id="event"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 bg-blue-700 rounded text-white"
                required
              >
                <option value="">Select event</option>
                {events.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.name} (${event.price})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
          >
            Register
          </button>
        </form>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Registered Users</h3>
          </div>
          <div className="bg-blue-700 rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600">
                  <th className="px-4 py-2 text-left text-white">Name</th>
                  <th className="px-4 py-2 text-left text-white">Type</th>
                  <th className="px-4 py-2 text-left text-white">Event</th>
                </tr>
              </thead>
              <tbody>
                {registeredUsers.map((user, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-blue-800" : "bg-blue-700"}
                  >
                    <td className="px-4 py-2 text-white">{user.name}</td>
                    <td className="px-4 py-2 text-white">{user.type}</td>
                    <td className="px-4 py-2 text-white">{user.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleClearRegistrations}
            disabled={clearLoading || registeredUsers.length === 0}
            className={`flex items-center px-4 py-2 rounded text-white transition-colors ${
              registeredUsers.length === 0
                ? "bg-gray-500 cursor-not-allowed"
                : clearLoading
                ? "bg-red-700 cursor-wait"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {clearLoading ? "Clearing..." : "Clear All"}
          </button>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4 text-white">All Events</h3>
          <EventList />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
